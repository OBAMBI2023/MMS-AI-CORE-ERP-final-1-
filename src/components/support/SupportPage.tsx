import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Flag,
  Hash,
  Headset,
  LifeBuoy,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Send,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mms/AppShell";
import { HotelAppShell } from "@/components/hotel/HotelAppShell";
import { ImageField } from "@/components/hotel/HotelImageField";
import { supabase } from "@/integrations/supabase/client";
import { generateSafeId } from "@/lib/uuid";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useActionPermission } from "@/hooks/use-action-permission";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { useTenant } from "@/providers/TenantProvider";
import { formatDateTime } from "@/lib/mms/format";
import { cn } from "@/lib/utils";
import {
  SUPPORT_CATEGORIES,
  type SupportCategory,
  type SupportMessage,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
  useCloseSupportTicket,
  useCreateSupportTicket,
  useMarkSupportMessagesRead,
  useReopenSupportTicket,
  useReplySupportTicket,
  useSupportTicketMessages,
  useSupportTickets,
  useSupportUnreadByTicket,
} from "@/hooks/use-support";

const PRIORITY_OPTIONS: { value: SupportPriority; label: string }[] = [
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
];
const PRIORITY_LABEL: Record<SupportPriority, string> = {
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};
const PRIORITY_BADGE: Record<SupportPriority, string> = {
  normal: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const STATUS_LABEL: Record<SupportStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting_customer: "En attente de réponse",
  resolved: "Résolu",
  closed: "Fermé",
};
const STATUS_BADGE: Record<SupportStatus, string> = {
  open: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  waiting_customer: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  closed: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

// Tickets have no dedicated human-friendly sequence number in the schema
// (only a uuid id) — deriving a stable short reference from the id avoids a
// migration while still giving each ticket a readable "number".
function ticketNumber(ticket: Pick<SupportTicket, "id">) {
  return `#${ticket.id.slice(0, 8).toUpperCase()}`;
}

type StatusFilter = "all" | "open" | "waiting" | "resolved";
const STATUS_FILTERS: { key: StatusFilter; label: string; match: (status: SupportStatus) => boolean }[] = [
  { key: "all", label: "Tous", match: () => true },
  { key: "open", label: "Ouverts", match: (status) => status === "open" || status === "in_progress" },
  { key: "waiting", label: "En attente", match: (status) => status === "waiting_customer" },
  { key: "resolved", label: "Résolus", match: (status) => status === "resolved" || status === "closed" },
];

function StatusPill({ status }: { status: SupportStatus }) {
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", STATUS_BADGE[status])}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
function PriorityPill({ priority }: { priority: SupportPriority }) {
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", PRIORITY_BADGE[priority])}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function TicketListItem({
  ticket,
  active,
  unreadCount,
  onClick,
}: {
  ticket: SupportTicket;
  active: boolean;
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3.5 py-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-transparent bg-card hover:bg-muted/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tabular-nums text-muted-foreground">{ticketNumber(ticket)}</p>
          <p className="min-w-0 truncate text-sm font-semibold">{ticket.subject}</p>
        </div>
        {unreadCount > 0 && (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatusPill status={ticket.status} />
        <PriorityPill priority={ticket.priority} />
        <span className="text-[10px] text-muted-foreground">{ticket.category}</span>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {formatDateTime(ticket.last_message_at)}
      </p>
    </button>
  );
}

function MessageBubble({ message }: { message: SupportMessage }) {
  const isTenant = message.sender_type === "tenant";
  const attachmentUrl = useSignedUrl(message.attachment_path, "support-attachments");
  return (
    <div className={cn("flex", isTenant ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[70%]",
          isTenant ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
        {message.attachment_path && (
          <a
            href={attachmentUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 text-xs underline underline-offset-2",
              isTenant ? "text-primary-foreground/90" : "text-foreground",
            )}
          >
            <Paperclip className="size-3.5" />
            {message.attachment_name ?? message.attachment_path.split("/").pop()}
            <ExternalLink className="size-3" />
          </a>
        )}
        <p
          className={cn(
            "mt-1.5 text-[10px]",
            isTenant ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {isTenant ? "Vous" : "Équipe SAOVIA"} · {formatDateTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function MessageComposer({ ticketId }: { ticketId: string }) {
  const [message, setMessage] = useState("");
  const [attachmentPath, setAttachmentPath] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const reply = useReplySupportTicket(ticketId);

  const send = async () => {
    if (!message.trim()) return;
    try {
      await reply.mutateAsync({
        message: message.trim(),
        attachmentPath: attachmentPath || null,
        attachmentName: attachmentPath ? attachmentPath.split("/").pop() : null,
      });
      setMessage("");
      setAttachmentPath("");
      setShowAttach(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'envoyer le message.");
    }
  };

  return (
    <div className="border-t p-3 sm:p-4">
      {showAttach && (
        <div className="mb-3">
          <ImageField
            value={attachmentPath}
            onChange={setAttachmentPath}
            storage={{ bucket: "support-attachments", folder: "attachments" }}
          />
        </div>
      )}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowAttach((v) => !v)}
          className="shrink-0"
          aria-label="Joindre un fichier"
        >
          <Paperclip className="size-4" />
        </Button>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Écrivez votre réponse…"
          rows={2}
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button
          type="button"
          onClick={() => void send()}
          disabled={reply.isPending || !message.trim()}
          className="shrink-0"
          aria-label="Envoyer"
        >
          {reply.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

const MESSAGE_MAX_LENGTH = 1000;
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT =
  "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,text/plain";
const ATTACHMENT_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "text/plain",
];

function isAllowedAttachment(file: File) {
  return file.type.startsWith("image/") || ATTACHMENT_ALLOWED_TYPES.includes(file.type);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

type Attachment = { path: string; name: string | null; size: number | null };
const EMPTY_ATTACHMENT: Attachment = { path: "", name: null, size: null };

function TicketAttachmentField({
  attachment,
  onChange,
}: {
  attachment: Attachment;
  onChange: (next: Attachment) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { profile } = useTenant();
  const [uploading, setUploading] = useState(false);

  const select = async (file?: File) => {
    if (!file) return;
    if (!isAllowedAttachment(file)) {
      toast.error("Formats acceptés : images, PDF ou documents (Word, texte).");
      return;
    }
    if (file.size > ATTACHMENT_MAX_SIZE) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo.");
      return;
    }
    if (!profile?.tenant_id) {
      toast.error("Établissement introuvable.");
      return;
    }
    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${profile.tenant_id}/attachments/${generateSafeId()}.${extension}`;
      const { error } = await supabase.storage
        .from("support-attachments")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      onChange({ path, name: file.name, size: file.size });
    } catch {
      toast.error("Impossible de joindre ce fichier. Veuillez réessayer.");
    } finally {
      setUploading(false);
    }
  };

  if (attachment.path) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {attachment.name ?? attachment.path.split("/").pop()}
            </p>
            {attachment.size != null && (
              <p className="text-[11px] text-muted-foreground">{formatFileSize(attachment.size)}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(EMPTY_ATTACHMENT)}
          className="shrink-0 rounded-lg p-1.5 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Supprimer la pièce jointe"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.03] px-3 py-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin text-primary" />
        ) : (
          <Paperclip className="size-5 text-primary" />
        )}
        <span className="text-sm font-medium text-foreground">
          {uploading ? "Envoi…" : "Joindre un fichier"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          Images, PDF, Word, texte • Max. 10 Mo
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        onChange={(e) => {
          void select(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function NewTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tenant } = useTenant();
  const isHotel = tenant?.platform_type === "HOTEL";
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>(SUPPORT_CATEGORIES[0]);
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<Attachment>(EMPTY_ATTACHMENT);
  const [errors, setErrors] = useState<{ subject?: string; message?: string }>({});
  const create = useCreateSupportTicket();

  const reset = () => {
    setSubject("");
    setCategory(SUPPORT_CATEGORIES[0]);
    setPriority("normal");
    setMessage("");
    setAttachment(EMPTY_ATTACHMENT);
    setErrors({});
  };

  const submit = async () => {
    const nextErrors: { subject?: string; message?: string } = {};
    if (!subject.trim()) nextErrors.subject = "Le sujet est obligatoire.";
    if (!message.trim()) nextErrors.message = "Le message est obligatoire.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      await create.mutateAsync({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
        attachmentPath: attachment.path || null,
        attachmentName: attachment.name,
      });
      toast.success("Ticket créé. Notre équipe vous répondra rapidement.");
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer le ticket.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "flex w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-full sm:max-w-[760px]",
          "max-h-[92dvh] sm:max-h-[90dvh]",
          isHotel && "hotel-theme",
        )}
      >
        <DialogHeader className="items-center gap-2 border-b bg-gradient-to-b from-primary/[0.04] to-transparent px-6 py-6 text-center sm:text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-4 ring-primary/5">
            <Headset className="size-7" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">Nouveau ticket</DialogTitle>
          <DialogDescription className="text-center text-sm font-normal text-muted-foreground/90">
            Décrivez votre demande, l'équipe SAOVIA vous répondra directement ici.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div>
            <Label htmlFor="ticket-subject" className="mb-1.5 block text-sm font-medium">
              Sujet
            </Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              placeholder="Ex : Impossible d'exporter mes rapports"
              className="h-11"
              aria-invalid={Boolean(errors.subject)}
              autoFocus
            />
            {errors.subject && (
              <p className="mt-1.5 text-xs text-destructive">{errors.subject}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="ticket-category" className="mb-1.5 block text-sm font-medium">
                Catégorie
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
                <SelectTrigger id="ticket-category" className="h-11">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Tag className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ticket-priority" className="mb-1.5 block text-sm font-medium">
                Priorité
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SupportPriority)}>
                <SelectTrigger id="ticket-priority" className="h-11">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <Flag className="size-4 shrink-0 text-muted-foreground" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="ticket-message" className="mb-1.5 block text-sm font-medium">
              Message
            </Label>
            <Textarea
              id="ticket-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value.slice(0, MESSAGE_MAX_LENGTH));
                if (errors.message) setErrors((prev) => ({ ...prev, message: undefined }));
              }}
              rows={7}
              maxLength={MESSAGE_MAX_LENGTH}
              placeholder="Décrivez votre demande en détail…"
              className="resize-none"
              aria-invalid={Boolean(errors.message)}
            />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              {errors.message ? (
                <p className="text-xs text-destructive">{errors.message}</p>
              ) : (
                <span />
              )}
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {message.length}/{MESSAGE_MAX_LENGTH}
              </span>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Pièce jointe (optionnel)</Label>
            <TicketAttachmentField attachment={attachment} onChange={setAttachment} />
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="border-primary text-primary hover:bg-primary/5 hover:text-primary"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={create.isPending}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Créer le ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SupportPage() {
  // Support is one route shared by both platform types — it must render
  // inside whichever shell/sidebar the tenant's own pages use (HotelAppShell
  // for platform_type='HOTEL', the ERP AppShell otherwise), never a shell of
  // its own. Hardcoding AppShell here previously made a HOTEL tenant lose
  // its entire Hotel sidebar (and fall back to the ERP SidebarCompanyHeader,
  // which shows "Secteur non renseigné" since Hotel tenants don't populate
  // the ERP-only business_sector field) whenever they opened /support.
  const { tenant, loading: tenantLoading } = useTenant();
  const Shell = tenant?.platform_type === "HOTEL" ? HotelAppShell : AppShell;
  const canView = useActionPermission("support.view");
  const canCreate = useActionPermission("support.create");
  const modulesQuery = useTenantModules();
  const moduleEnabled = modulesQuery.data?.has("support") ?? false;
  const ticketsQuery = useSupportTickets();
  const unreadQuery = useSupportUnreadByTicket();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const tickets = ticketsQuery.data ?? [];
  const visibleTickets = useMemo(() => {
    const activeFilter = STATUS_FILTERS.find((f) => f.key === statusFilter) ?? STATUS_FILTERS[0];
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (!activeFilter.match(ticket.status)) return false;
      if (!query) return true;
      return (
        ticket.subject.toLowerCase().includes(query) ||
        ticketNumber(ticket).toLowerCase().includes(query)
      );
    });
  }, [tickets, search, statusFilter]);
  const unreadByTicket = unreadQuery.data;
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) ?? null;

  const messagesQuery = useSupportTicketMessages(selectedTicketId);
  const closeTicket = useCloseSupportTicket(selectedTicketId ?? "");
  const reopenTicket = useReopenSupportTicket(selectedTicketId ?? "");
  const markRead = useMarkSupportMessagesRead(selectedTicketId ?? "");

  useEffect(() => {
    if (selectedTicketId && (unreadByTicket?.get(selectedTicketId) ?? 0) > 0) {
      markRead.mutate();
    }
    // Only re-run when the selected ticket changes, not on every unread-count refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicketId]);

  if (tenantLoading) {
    // Platform type isn't known yet — rendering either shell now would risk
    // flashing the wrong sidebar for a hotel tenant on a hard refresh.
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (modulesQuery.isLoading) {
    return (
      <Shell title="Support" subtitle="Échangez avec l'équipe SAOVIA">
        <Skeleton className="h-72 rounded-[24px]" />
      </Shell>
    );
  }

  if (!moduleEnabled) {
    return (
      <Shell title="Support" subtitle="Échangez avec l'équipe SAOVIA">
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <LifeBuoy className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Module non disponible</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Le module Support n'est pas activé pour votre établissement. Contactez votre
              administrateur.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  if (!canView) {
    return (
      <Shell title="Support" subtitle="Échangez avec l'équipe SAOVIA">
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <LifeBuoy className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">Accès restreint</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous n'avez pas la permission de consulter le support.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title="Support"
      subtitle="Échangez avec l'équipe SAOVIA"
      actions={
        canCreate ? (
          <Button onClick={() => setNewTicketOpen(true)} className="rounded-xl">
            <Plus className="size-4" /> Nouveau ticket
          </Button>
        ) : null
      }
    >
      {ticketsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-[0.32fr_0.68fr]">
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="hidden h-[70vh] rounded-2xl md:block" />
        </div>
      ) : ticketsQuery.isError ? (
        <div className="mt-4 grid min-h-72 place-items-center rounded-[24px] border border-dashed bg-muted/20 p-8 text-center">
          <div>
            <h3 className="font-semibold">Impossible de charger vos tickets</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vérifiez votre connexion puis réessayez.
            </p>
            <Button
              variant="outline"
              onClick={() => void ticketsQuery.refetch()}
              className="mt-5 rounded-xl"
            >
              Réessayer
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid h-[75vh] min-h-[420px] gap-4 md:grid-cols-[0.32fr_0.68fr]">
          <Card
            className={cn(
              "flex min-w-0 flex-col overflow-hidden rounded-2xl p-0 md:min-w-[280px]",
              selectedTicketId && "hidden md:flex",
            )}
          >
            <div className="space-y-2.5 border-b p-3">
              <p className="text-sm font-semibold">Boîte de réception</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un ticket"
                  className="h-9 pl-9 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStatusFilter(filter.key)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      statusFilter === filter.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            {tickets.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <LifeBuoy className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Vous n'avez encore aucune demande de support.
                </p>
              </div>
            ) : visibleTickets.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                <Search className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun ticket ne correspond.</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-3">
                  {visibleTickets.map((ticket) => (
                    <TicketListItem
                      key={ticket.id}
                      ticket={ticket}
                      active={ticket.id === selectedTicketId}
                      unreadCount={unreadByTicket?.get(ticket.id) ?? 0}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </Card>

          <Card
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl p-0",
              !selectedTicketId && "hidden md:flex",
            )}
          >
            {selectedTicket ? (
              <>
                <div className="flex items-start justify-between gap-2 border-b p-3.5 sm:p-4">
                  <div className="flex min-w-0 items-start gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 md:hidden"
                      onClick={() => setSelectedTicketId(null)}
                      aria-label="Retour"
                    >
                      <ArrowLeft className="size-4" />
                    </Button>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        <Hash className="size-2.5" />
                        {ticketNumber(selectedTicket).slice(1)}
                      </p>
                      <p className="truncate font-semibold">{selectedTicket.subject}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={selectedTicket.status} />
                        <PriorityPill priority={selectedTicket.priority} />
                        <span className="text-[10px] text-muted-foreground">
                          {selectedTicket.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CalendarClock className="size-3" />
                          Créé le {formatDateTime(selectedTicket.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedTicket.status === "resolved" || selectedTicket.status === "closed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => reopenTicket.mutate()}
                      disabled={reopenTicket.isPending}
                      className="shrink-0 rounded-xl"
                    >
                      {reopenTicket.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      Rouvrir
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => closeTicket.mutate()}
                      disabled={closeTicket.isPending}
                      className="shrink-0 rounded-xl"
                    >
                      {closeTicket.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      Fermer
                    </Button>
                  )}
                </div>
                <ScrollArea className="flex-1 p-3.5 sm:p-4">
                  {messagesQuery.isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-2/3 rounded-2xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(messagesQuery.data ?? []).map((message) => (
                        <MessageBubble key={message.id} message={message} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <MessageComposer ticketId={selectedTicket.id} />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
                <LifeBuoy className="size-6" />
                <p className="text-sm">Sélectionnez un ticket pour afficher la conversation.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      <NewTicketDialog open={newTicketOpen} onOpenChange={setNewTicketOpen} />
    </Shell>
  );
}
