import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LifeBuoy,
  Loader2,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/mms/AppShell";
import { ImageField } from "@/components/hotel/HotelImageField";
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
import { useSignedUrl } from "@/hooks/use-signed-url";
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
        <p className="min-w-0 truncate text-sm font-semibold">{ticket.subject}</p>
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
          placeholder="Écrivez votre message…"
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

function NewTicketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportCategory>(SUPPORT_CATEGORIES[0]);
  const [priority, setPriority] = useState<SupportPriority>("normal");
  const [message, setMessage] = useState("");
  const [attachmentPath, setAttachmentPath] = useState("");
  const create = useCreateSupportTicket();

  const reset = () => {
    setSubject("");
    setCategory(SUPPORT_CATEGORIES[0]);
    setPriority("normal");
    setMessage("");
    setAttachmentPath("");
  };

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Le sujet et le message sont obligatoires.");
      return;
    }
    try {
      await create.mutateAsync({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
        attachmentPath: attachmentPath || null,
        attachmentName: attachmentPath ? attachmentPath.split("/").pop() : null,
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
          <DialogDescription>
            Décrivez votre demande, l'équipe SAOVIA vous répondra directement ici.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Sujet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Impossible d'exporter mes rapports"
              className="h-11"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Catégorie</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SupportCategory)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
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
              <Label className="mb-1.5 block">Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as SupportPriority)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
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
            <Label className="mb-1.5 block">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Décrivez votre demande en détail…"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Pièce jointe (optionnel)</Label>
            <ImageField
              value={attachmentPath}
              onChange={setAttachmentPath}
              storage={{ bucket: "support-attachments", folder: "attachments" }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={create.isPending}>
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Créer le ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SupportPage() {
  const canView = useActionPermission("support.view");
  const canCreate = useActionPermission("support.create");
  const ticketsQuery = useSupportTickets();
  const unreadQuery = useSupportUnreadByTicket();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  const tickets = ticketsQuery.data ?? [];
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

  if (!canView) {
    return (
      <AppShell title="Support" subtitle="Échangez avec l'équipe SAOVIA">
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
      </AppShell>
    );
  }

  return (
    <AppShell
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
        <div className="grid gap-4 md:grid-cols-[360px_1fr]">
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
        <div className="grid h-[75vh] min-h-[420px] gap-4 md:grid-cols-[360px_1fr]">
          <Card
            className={cn(
              "flex flex-col overflow-hidden rounded-2xl p-0",
              selectedTicketId && "hidden md:flex",
            )}
          >
            <div className="border-b p-3">
              <p className="text-sm font-semibold">Boîte de réception</p>
            </div>
            {tickets.length ? (
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-3">
                  {tickets.map((ticket) => (
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
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <LifeBuoy className="size-7" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Vous n'avez encore aucune demande de support.
                </p>
                {canCreate && (
                  <Button size="sm" onClick={() => setNewTicketOpen(true)} className="rounded-xl">
                    <Plus className="size-4" /> Nouveau ticket
                  </Button>
                )}
              </div>
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
                      <p className="truncate font-semibold">{selectedTicket.subject}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={selectedTicket.status} />
                        <PriorityPill priority={selectedTicket.priority} />
                        <span className="text-[10px] text-muted-foreground">
                          {selectedTicket.category}
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
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <LifeBuoy className="size-8" />
                <p className="text-sm">Sélectionnez une conversation pour l'afficher ici.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      <NewTicketDialog open={newTicketOpen} onOpenChange={setNewTicketOpen} />
    </AppShell>
  );
}
