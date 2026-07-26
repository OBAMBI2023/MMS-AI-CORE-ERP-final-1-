import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Boxes, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActionPermission } from "@/hooks/use-action-permission";
import { formatCurrency } from "@/lib/mms/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StockItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  stock_alert_threshold: number;
};

type Movement = {
  id: string;
  service_id: string;
  movement_type: "entry" | "exit" | "adjustment";
  quantity: number;
  quantity_delta: number;
  stock_after: number;
  reason: string;
  source: string;
  created_at: string;
  services: { name: string } | { name: string }[] | null;
  profiles: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null;
};

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });
const movementLabels = { entry: "Entrée", exit: "Sortie", adjustment: "Ajustement" };

function relation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function StockPage() {
  const queryClient = useQueryClient();
  const canManage = useActionPermission("ventes.create");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [alertOnly, setAlertOnly] = useState(false);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [movementType, setMovementType] = useState<"entry" | "exit" | "adjustment">("entry");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const stockQuery = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, unit, price, stock, stock_alert_threshold")
        .eq("type", "product")
        .eq("manage_stock", true)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((item) => ({ ...item, stock: Number(item.stock) })) as StockItem[];
    },
  });

  const historyQuery = useQuery({
    queryKey: ["inventory-movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("id, service_id, movement_type, quantity, quantity_delta, stock_after, reason, source, created_at, services(name), profiles!inventory_movements_user_id_fkey(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Movement[];
    },
  });

  const items = stockQuery.data ?? [];
  const categories = [...new Set(items.map((item) => item.category))].sort();
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fr");
    return items.filter(
      (item) =>
        (!needle || item.name.toLocaleLowerCase("fr").includes(needle)) &&
        (category === "all" || item.category === category) &&
        (!alertOnly || item.stock <= item.stock_alert_threshold),
    );
  }, [alertOnly, category, items, search]);
  const lowStock = items.filter((item) => item.stock <= item.stock_alert_threshold);
  const stockValue = items.reduce((total, item) => total + item.stock * item.price, 0);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const parsedQuantity = Number(quantity);
      if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) throw new Error("Quantité invalide.");
      if (!reason.trim()) throw new Error("Le motif est requis.");
      const { error } = await supabase.rpc("apply_inventory_movement", {
        requested_service_id: selected.id,
        requested_type: movementType,
        requested_quantity: parsedQuantity,
        requested_reason: reason.trim(),
        requested_source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Mouvement enregistré.");
      setSelected(null);
      setQuantity("");
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory-items"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["services"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openMovement = (item: StockItem, type: "entry" | "exit" | "adjustment") => {
    setSelected(item);
    setMovementType(type);
    setQuantity(type === "adjustment" ? String(item.stock) : "");
    setReason("");
  };

  return (
    <div className="space-y-6">
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{lowStock.length} produit{lowStock.length > 1 ? "s" : ""} au seuil d’alerte ou en dessous.</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric title="Produits gérés" value={number.format(items.length)} icon={<Boxes />} />
        <Metric title="Stock faible" value={number.format(lowStock.length)} icon={<AlertTriangle />} />
        <Metric title="Valeur du stock" value={formatCurrency(stockValue)} icon={<History />} />
      </div>

      <Card>
        <CardHeader><CardTitle>Stock actuel</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit…" className="md:max-w-sm" />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="md:w-56"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {categories.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant={alertOnly ? "default" : "outline"} onClick={() => setAlertOnly((value) => !value)}>
              <AlertTriangle /> Stock faible
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead>Stock</TableHead><TableHead>Seuil</TableHead><TableHead>Valeur</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((item) => {
                  const low = item.stock <= item.stock_alert_threshold;
                  return (
                    <TableRow key={item.id}>
                      <TableCell><div className="font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{item.category}</div></TableCell>
                      <TableCell><Badge variant={low ? "destructive" : "secondary"}>{number.format(item.stock)} {item.unit}</Badge></TableCell>
                      <TableCell>{number.format(item.stock_alert_threshold)}</TableCell>
                      <TableCell>{formatCurrency(item.stock * item.price)}</TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button size="sm" variant="outline" disabled={!canManage} onClick={() => openMovement(item, "entry")}><ArrowDownToLine /> Entrée</Button>
                        <Button size="sm" variant="outline" disabled={!canManage} onClick={() => openMovement(item, "exit")}><ArrowUpFromLine /> Sortie</Button>
                        <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => openMovement(item, "adjustment")}>Ajuster</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!stockQuery.isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Aucun produit géré en stock.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Historique des mouvements</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Produit</TableHead><TableHead>Mouvement</TableHead><TableHead>Quantité</TableHead><TableHead>Motif / source</TableHead><TableHead>Utilisateur</TableHead></TableRow></TableHeader>
            <TableBody>
              {(historyQuery.data ?? []).map((movement) => {
                const service = relation(movement.services);
                const profile = relation(movement.profiles);
                return <TableRow key={movement.id}>
                  <TableCell>{new Date(movement.created_at).toLocaleString("fr-FR")}</TableCell>
                  <TableCell>{service?.name ?? "Produit supprimé"}</TableCell>
                  <TableCell>{movementLabels[movement.movement_type]}</TableCell>
                  <TableCell className={movement.quantity_delta > 0 ? "text-emerald-600" : "text-rose-600"}>{movement.quantity_delta > 0 ? "+" : ""}{number.format(movement.quantity_delta)} → {number.format(movement.stock_after)}</TableCell>
                  <TableCell><div>{movement.reason}</div><div className="text-xs text-muted-foreground">{movement.source}</div></TableCell>
                  <TableCell>{profile?.full_name || profile?.email || "Utilisateur"}</TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{movementLabels[movementType]} de stock</DialogTitle>
            <DialogDescription>{selected?.name} · stock actuel {number.format(selected?.stock ?? 0)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <label className="space-y-2"><Label>{movementType === "adjustment" ? "Nouveau stock constaté" : "Quantité"}</Label><Input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
            <label className="space-y-2"><Label>Motif</Label><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motif obligatoire" /></label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button><Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-semibold">{value}</p></div></CardContent></Card>;
}
