import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  LifeBuoy,
  Loader2,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  getSupportTicketThread,
  listSupportTickets,
  postSupportReply,
  SUPPORT_CATEGORIES,
  updateSupportTicket,
  type SuperAdminSupportTicket,
  type SupportCategory,
  type SupportPriority,
  type SupportStatus,
} from "@/lib/super-admin-support.server";
import { formatDateTime } from "@/lib/mms/format";
import { cn } from "@/lib/utils";

const PRIORITY_OPTIONS: { value: SupportPriority; label: string }[] = [
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
];
const STATUS_OPTIONS: { value: SupportStatus; label: string }[] = [
  { value: "open", label: "Ouvert" },
  { value: "in_progress", label: "En cours" },
  { value: "waiting_customer", label: "En attente de réponse" },
  { value: "resolved", label: "Résolu" },
  { value: "closed", label: "Fermé" },
];
const PRIORITY_LABEL = Object.fromEntries(
  PRIORITY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<SupportPriority, string>;
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<
  SupportStatus,
  string
>;
const PRIORITY_BADGE: Record<SupportPriority, string> = {
  normal: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  urgent: "bg-red-500/10 text-red-600 dark:text-red-400",
};
const STATUS_BADGE: Record<SupportStatus, string> = {
  open: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  in_progress: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  waiting_customer: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  closed: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

function tenantInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", tone)}>
      {children}
    </span>
  );
}

function TicketRow({
  ticket,
  active,
  onClick,
}: {
  ticket: SuperAdminSupportTicket;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary bg-blue-50 dark:bg-blue-950/30"
          : "border-transparent bg-card hover:bg-muted/50",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
            {tenantInitials(ticket.tenantName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {ticket.tenantName}
            </p>
            {ticket.unreadFromTenant > 0 && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {ticket.unreadFromTenant > 9 ? "9+" : ticket.unreadFromTenant}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold">{ticket.subject}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Pill tone={STATUS_BADGE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Pill>
            <Pill tone={PRIORITY_BADGE[ticket.priority]}>{PRIORITY_LABEL[ticket.priority]}</Pill>
            {!ticket.hasSupportReply && (
              <Pill tone="bg-red-500/10 text-red-600 dark:text-red-400">Sans réponse</Pill>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {formatDateTime(ticket.lastMessageAt)}
          </p>
        </div>
      </div>
    </button>
  );
}

export function SupportConsoleView() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<SupportPriority | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<SupportCategory | "all">("all");
  const [needsAttentionOnly, setNeedsAttentionOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const [updatingField, setUpdatingField] = useState<"status" | "priority" | null>(null);

  const ticketsQueryKey = [
    "super-admin",
    "support-tickets",
    statusFilter,
    priorityFilter,
    categoryFilter,
  ] as const;
  const ticketsQuery = useQuery({
    queryKey: ticketsQueryKey,
    queryFn: () =>
      listSupportTickets({
        data: {
          status: statusFilter === "all" ? undefined : statusFilter,
          priority: priorityFilter === "all" ? undefined : priorityFilter,
          category: categoryFilter === "all" ? undefined : categoryFilter,
        },
      }),
    placeholderData: (previous) => previous,
  });

  const tickets = useMemo(() => {
    const rows = ticketsQuery.data ?? [];
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");
    return rows.filter((ticket) => {
      if (needsAttentionOnly && ticket.unreadFromTenant === 0 && ticket.hasSupportReply)
        return false;
      if (!normalizedSearch) return true;
      return (
        ticket.tenantName.toLocaleLowerCase("fr").includes(normalizedSearch) ||
        ticket.subject.toLocaleLowerCase("fr").includes(normalizedSearch)
      );
    });
  }, [ticketsQuery.data, search, needsAttentionOnly]);

  const threadQueryKey = ["super-admin", "support-thread", selectedTicketId] as const;
  const threadQuery = useQuery({
    queryKey: threadQueryKey,
    enabled: Boolean(selectedTicketId),
    queryFn: () => getSupportTicketThread({ data: { ticketId: selectedTicketId! } }),
  });

  const refreshAll = () => {
    void qc.invalidateQueries({ queryKey: ["super-admin", "support-tickets"] });
    void qc.invalidateQueries({ queryKey: ["super-admin", "support-thread"] });
  };

  const sendReply = async () => {
    if (!selectedTicketId || !replyMessage.trim() || replyPending) return;
    setReplyPending(true);
    try {
      await postSupportReply({
        data: { ticketId: selectedTicketId, message: replyMessage.trim() },
      });
      setReplyMessage("");
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'envoyer la réponse.");
    } finally {
      setReplyPending(false);
    }
  };

  const changeStatus = async (status: SupportStatus) => {
    if (!selectedTicketId) return;
    setUpdatingField("status");
    try {
      await updateSupportTicket({ data: { ticketId: selectedTicketId, status } });
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier le statut.");
    } finally {
      setUpdatingField(null);
    }
  };

  const changePriority = async (priority: SupportPriority) => {
    if (!selectedTicketId) return;
    setUpdatingField("priority");
    try {
      await updateSupportTicket({ data: { ticketId: selectedTicketId, priority } });
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier la priorité.");
    } finally {
      setUpdatingField(null);
    }
  };

  const thread = threadQuery.data;

  return (
    <main className="min-h-screen bg-muted/30 p-4 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div>
          <Button variant="ghost" className="-ml-3 mb-2" asChild>
            <a href="/super-admin">
              <ArrowLeft /> Super Admin
            </a>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tickets de tous les tenants — répondez et suivez leur statut.
          </p>
        </div>

        <Card className="rounded-xl p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_180px_170px_220px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                placeholder="Rechercher un tenant ou un sujet"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as SupportStatus | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter}
              onValueChange={(v) => setPriorityFilter(v as SupportPriority | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les priorités" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les priorités</SelectItem>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as SupportCategory | "all")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {SUPPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm">
              <Switch checked={needsAttentionOnly} onCheckedChange={setNeedsAttentionOnly} />
              Non lus / sans réponse
            </label>
          </div>
        </Card>

        <div
          className={cn(
            "grid gap-4 xl:h-[70vh] xl:min-h-[480px] xl:grid-cols-[3fr_7fr]",
            selectedTicketId ? "h-[calc(100vh-180px)]" : "h-[70vh] min-h-[480px]",
          )}
        >
          <Card
            className={cn(
              "flex-col overflow-hidden rounded-xl p-0",
              selectedTicketId ? "hidden xl:flex" : "flex",
            )}
          >
            <div className="flex items-center justify-between border-b px-3.5 py-2.5">
              <p className="text-sm font-semibold">Tickets ({tickets.length})</p>
              <p className="text-[11px] text-muted-foreground">Tri : Les plus récents</p>
            </div>
            {ticketsQuery.isLoading ? (
              <div className="grid flex-1 place-items-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : ticketsQuery.isError ? (
              <div className="p-6 text-center text-sm text-destructive">
                Impossible de charger les tickets. Réessayez plus tard.
              </div>
            ) : tickets.length ? (
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-3">
                  {tickets.map((ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      active={ticket.id === selectedTicketId}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <LifeBuoy className="size-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  Aucun ticket ne correspond à ces filtres.
                </p>
              </div>
            )}
          </Card>

          <Card
            className={cn(
              "flex-col overflow-hidden rounded-xl p-0",
              selectedTicketId ? "flex" : "hidden xl:flex",
            )}
          >
            {!selectedTicketId ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <LifeBuoy className="size-8" />
                <p className="text-sm">Sélectionnez un ticket pour afficher la conversation.</p>
              </div>
            ) : threadQuery.isLoading ? (
              <div className="grid flex-1 place-items-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : thread ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b p-3.5 sm:p-4">
                  <div className="min-w-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 mb-1 h-7 px-2 text-xs xl:hidden"
                      onClick={() => setSelectedTicketId(null)}
                    >
                      <ChevronLeft className="size-3.5" /> Tickets
                    </Button>
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Building2 className="size-3.5" /> {thread.ticket.tenantName}
                    </p>
                    <p className="mt-0.5 truncate font-semibold">{thread.ticket.subject}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{thread.ticket.category}</span>
                      <span>Créé le {formatDateTime(thread.ticket.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Select
                      value={thread.ticket.priority}
                      onValueChange={(v) => void changePriority(v as SupportPriority)}
                      disabled={updatingField === "priority"}
                    >
                      <SelectTrigger className="h-9 w-[130px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={thread.ticket.status}
                      onValueChange={(v) => void changeStatus(v as SupportStatus)}
                      disabled={updatingField === "status"}
                    >
                      <SelectTrigger className="h-9 w-[170px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-9 shrink-0">
                          <MoreVertical className="size-4" />
                          <span className="sr-only">Actions rapides</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void changeStatus("resolved")}>
                          Marquer résolu
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void changeStatus("closed")}>
                          Marquer fermé
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void changeStatus("open")}>
                          Rouvrir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3.5 sm:p-4">
                  <div className="space-y-3">
                    {thread.messages.map((message) => {
                      const isSupport = message.senderType === "support";
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex items-end gap-2",
                            isSupport ? "flex-row-reverse" : "flex-row",
                          )}
                        >
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback
                              className={cn(
                                "text-[10px] font-semibold",
                                isSupport
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-primary/10 text-primary",
                              )}
                            >
                              {isSupport ? (
                                <ShieldCheck className="size-3.5" />
                              ) : (
                                tenantInitials(thread.ticket.tenantName)
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[70%]",
                              isSupport
                                ? "rounded-br-sm border border-border/60 bg-white dark:bg-card"
                                : "rounded-bl-sm bg-blue-50 dark:bg-blue-950/20",
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>
                            {message.attachmentUrl && (
                              <a
                                href={message.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-xs text-foreground underline underline-offset-2"
                              >
                                {message.attachmentName ?? "Pièce jointe"}
                              </a>
                            )}
                            <p className="mt-1.5 text-[10px] text-muted-foreground">
                              {isSupport ? "Support" : "Tenant"} ·{" "}
                              {formatDateTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="shrink-0 border-t p-3 sm:p-4">
                  <Label className="mb-1.5 block text-xs text-muted-foreground">
                    Répondre en tant qu'équipe SAOVIA
                  </Label>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      disabled
                      title="Pièce jointe non disponible pour l'instant"
                    >
                      <Paperclip className="size-4" />
                      <span className="sr-only">Joindre un fichier</span>
                    </Button>
                    <Textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Écrire une réponse..."
                      rows={2}
                      className="flex-1 resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendReply();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={replyPending || !replyMessage.trim()}
                      className="shrink-0 gap-1.5"
                    >
                      {replyPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Répondre
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </Card>
        </div>
      </div>
    </main>
  );
}
