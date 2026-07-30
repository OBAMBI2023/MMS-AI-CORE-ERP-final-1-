import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";

type JobRow = {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  status: "pending" | "running" | "partial" | "failed" | "completed";
  current_step: string;
  steps: Record<string, { status?: string; at?: string }>;
  storage_paths: Record<string, string[]>;
  auth_user_ids: string[];
  attempt_count: number;
};

function safeError(error: unknown) {
  const raw = error instanceof Error ? error.message : formatSupabaseError(error);
  return raw
    .replace(/(service[_ -]?role|authorization|apikey|token|secret|password)\s*[:=]\s*\S+/gi, "$1=[masqué]")
    .slice(0, 2000);
}

async function deleteStoragePrefix(
  admin: any,
  bucket: string,
  prefix: string,
) {
  for (;;) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    if (!data?.length) return;
    const files = data.filter((entry: any) => entry.id).map((entry: any) => `${prefix}/${entry.name}`);
    const folders = data.filter((entry: any) => !entry.id);
    for (const folder of folders) {
      await deleteStoragePrefix(admin, bucket, `${prefix}/${folder.name}`);
    }
    if (files.length) {
      const { error: removeError } = await admin.storage.from(bucket).remove(files);
      if (removeError) throw removeError;
    }
    if (!files.length && !folders.length) return;
  }
}

async function updateJob(admin: any, jobId: string, values: Record<string, unknown>) {
  const { error } = await admin
    .from("tenant_deletion_jobs")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw error;
}

async function completeStep(admin: any, job: JobRow, step: string, nextStep: string) {
  const steps = {
    ...job.steps,
    [step]: { status: "completed", at: new Date().toISOString() },
  };
  job.steps = steps;
  job.current_step = nextStep;
  await updateJob(admin, job.id, {
    status: "running",
    current_step: nextStep,
    steps,
    last_error: null,
  });
}

async function processJob(jobId: string, actorId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const lockToken = crypto.randomUUID();
  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: claimed, error: claimError } = await (supabaseAdmin as any)
    .from("tenant_deletion_jobs")
    .update({
      lock_token: lockToken,
      locked_at: new Date().toISOString(),
      status: "running",
      last_error: null,
    })
    .eq("id", jobId)
    .neq("status", "completed")
    .or(`locked_at.is.null,locked_at.lt.${staleBefore}`)
    .select("*")
    .maybeSingle();
  if (claimError) throw new Error(formatSupabaseError(claimError));
  if (!claimed) throw new Error("Cette suppression est déjà en cours d’exécution.");

  const job = claimed as JobRow;
  try {
    await updateJob(supabaseAdmin, job.id, { attempt_count: job.attempt_count + 1 });

    if (job.steps.deactivation?.status !== "completed") {
      for (const userId of job.auth_user_ids) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h",
        });
        if (error && (error as any).status !== 404) throw error;
      }
      await completeStep(supabaseAdmin, job, "deactivation", "storage");
    }

    if (job.steps.storage?.status !== "completed") {
      await deleteStoragePrefix(supabaseAdmin, "catalog-images", job.tenant_id);
      await deleteStoragePrefix(supabaseAdmin, "avatars", job.tenant_id);
      const companyPaths = job.storage_paths["company-assets"] ?? [];
      if (companyPaths.length) {
        const { error } = await supabaseAdmin.storage.from("company-assets").remove(companyPaths);
        if (error) throw error;
      }
      await completeStep(supabaseAdmin, job, "storage", "postgres");
    }

    if (job.steps.postgres?.status !== "completed") {
      const { error } = await (supabaseAdmin as any).rpc("delete_tenant_postgres_data", {
        requested_job_id: job.id,
        requested_actor_id: actorId,
      });
      if (error) throw error;
      job.steps = {
        ...job.steps,
        postgres: { status: "completed", at: new Date().toISOString() },
      };
      job.current_step = "auth";
    }

    if (job.steps.auth?.status !== "completed") {
      for (const userId of job.auth_user_ids) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error && (error as any).status !== 404) throw error;
      }
      await completeStep(supabaseAdmin, job, "auth", "finalization");
    }

    const { error: finalizeError } = await (supabaseAdmin as any).rpc(
      "finalize_tenant_deletion",
      { requested_job_id: job.id, requested_actor_id: actorId },
    );
    if (finalizeError) throw finalizeError;
  } catch (error) {
    const message = safeError(error);
    const steps = {
      ...job.steps,
      [job.current_step]: {
        ...(job.steps[job.current_step] ?? {}),
        status: "failed",
        at: new Date().toISOString(),
      },
    };
    await updateJob(supabaseAdmin, job.id, {
      status: Object.values(job.steps).some((step) => step.status === "completed")
        ? "partial"
        : "failed",
      steps,
      last_error: {
        step: job.current_step,
        message,
        at: new Date().toISOString(),
      },
    });
    throw new Error(message);
  } finally {
    await (supabaseAdmin as any)
      .from("tenant_deletion_jobs")
      .update({ lock_token: null, locked_at: null, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("lock_token", lockToken);
  }
}

export const startTenantDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    tenantId: z.string().uuid(),
    slug: z.string().trim().min(1).max(120),
  }))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: jobId, error } = await (supabaseAdmin as any).rpc("start_tenant_deletion", {
      requested_tenant_id: data.tenantId,
      requested_slug: data.slug,
      requested_actor_id: context.userId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    await processJob(jobId as string, context.userId);
    return { jobId: jobId as string };
  });

export const retryTenantDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ jobId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { data: membership, error } = await context.supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(formatSupabaseError(error));
    if (!membership) throw new Error("Accès refusé : super administrateur requis.");
    await processJob(data.jobId, context.userId);
    return { success: true };
  });
