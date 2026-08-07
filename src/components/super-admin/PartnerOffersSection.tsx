import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  adjustPartnerCredits,
  purchasePartnerCreditPack,
  removePartnerOffer,
  savePartnerCreditPack,
  savePartnerOffer,
  validatePartnerPayment,
  type SuperAdminCreditPack,
  type SuperAdminDashboard,
  type SuperAdminModulePack,
  type SuperAdminPartnerOffer,
} from "@/lib/super-admin.server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/mms/format";
import { formatDate } from "@/components/super-admin/shared";

export function PartnerOffersSection({
  commerce,
  packs,
}: {
  commerce: SuperAdminDashboard["partnerCommerce"];
  packs: SuperAdminModulePack[];
}) {
  const [editing, setEditing] = useState<SuperAdminPartnerOffer | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [credits, setCredits] = useState("1");
  const [duration, setDuration] = useState("30");
  const [packId, setPackId] = useState("");
  const [maxTrials, setMaxTrials] = useState("0");
  const [trialDays, setTrialDays] = useState("0");
  const [offerActive, setOfferActive] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [creditPackOpen, setCreditPackOpen] = useState(false);
  const [creditPurchaseOpen, setCreditPurchaseOpen] = useState(false);
  const [editingCreditPack, setEditingCreditPack] = useState<SuperAdminCreditPack | null>(null);
  const [creditPackName, setCreditPackName] = useState("");
  const [creditPackPrice, setCreditPackPrice] = useState("0");
  const [creditPackCount, setCreditPackCount] = useState("1");
  const [creditPackActive, setCreditPackActive] = useState(true);
  const [selectedCreditPackId, setSelectedCreditPackId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [adjustment, setAdjustment] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  const openOffer = (offer?: SuperAdminPartnerOffer) => {
    setEditing(offer ?? null);
    setName(offer?.name ?? "");
    setPrice(String(offer?.price ?? 0));
    setCredits(String(offer?.includedTenantCredits ?? 1));
    setDuration(String(offer?.durationDays ?? 30));
    setPackId(offer?.modulePackId ?? packs[0]?.id ?? "");
    setMaxTrials(String(offer?.maxTrials ?? 0));
    setTrialDays(String(offer?.trialDays ?? 0));
    setOfferActive(offer?.isActive ?? true);
    setOfferOpen(true);
  };

  const saveOffer = async () => {
    setSubmitting(true);
    try {
      await savePartnerOffer({
        data: {
          id: editing?.id ?? null,
          name,
          price: Number(price),
          includedTenantCredits: Number(credits),
          durationDays: Number(duration),
          modulePackId: packId,
          maxTrials: Number(maxTrials),
          trialDays: Number(trialDays),
          isActive: offerActive,
        },
      });
      toast.success("Offre enregistrée.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const validatePayment = async () => {
    setSubmitting(true);
    try {
      await validatePartnerPayment({
        data: {
          partnerId,
          offerId: selectedOfferId,
          amount: Number(amount),
          currency: "XOF",
          reference,
          reason,
        },
      });
      toast.success("Paiement validé et crédits attribués.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const adjustCredits = async () => {
    setSubmitting(true);
    try {
      await adjustPartnerCredits({
        data: { partnerId, credits: Number(adjustment), reason, reference },
      });
      toast.success("Solde ajusté.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajustement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreditPack = (pack?: SuperAdminCreditPack) => {
    setEditingCreditPack(pack ?? null);
    setCreditPackName(pack?.name ?? "");
    setCreditPackPrice(String(pack?.price ?? 0));
    setCreditPackCount(String(pack?.creditCount ?? 1));
    setCreditPackActive(pack?.isActive ?? true);
    setCreditPackOpen(true);
  };

  const saveCreditPack = async () => {
    setSubmitting(true);
    try {
      await savePartnerCreditPack({
        data: {
          id: editingCreditPack?.id ?? null,
          name: creditPackName,
          price: Number(creditPackPrice),
          creditCount: Number(creditPackCount),
          isActive: creditPackActive,
        },
      });
      toast.success("Pack de crédits enregistré.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const purchaseCreditPack = async () => {
    setSubmitting(true);
    try {
      await purchasePartnerCreditPack({
        data: { partnerId, packId: selectedCreditPackId, reference, reason },
      });
      toast.success("Crédits attribués au partenaire.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Attribution impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="offres-partenaires" className="scroll-mt-24 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Offres partenaires</h2>
          <p className="text-sm text-muted-foreground">
            Abonnements, paiements et ledger de crédits réels.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            Ajuster les crédits
          </Button>
          <Button variant="outline" onClick={() => setCreditPurchaseOpen(true)}>
            Attribuer un pack
          </Button>
          <Button variant="outline" onClick={() => openCreditPack()}>
            Nouveau pack de crédits
          </Button>
          <Button variant="outline" onClick={() => setPaymentOpen(true)}>
            Valider un paiement
          </Button>
          <Button onClick={() => openOffer()}>
            <Plus /> Nouvelle offre
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {commerce.offers.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            Aucune offre partenaire enregistrée.
          </Card>
        ) : (
          commerce.offers.map((offer) => (
            <Card key={offer.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{offer.name}</h3>
                <Badge variant={offer.isActive ? "default" : "secondary"}>
                  {offer.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-bold">{formatCurrency(offer.price)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {offer.includedTenantCredits} crédits · {offer.durationDays} jours ·{" "}
                {offer.maxTrials} essais de {offer.trialDays} jours
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openOffer(offer)}>
                  Modifier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await removePartnerOffer({ data: { offerId: offer.id } });
                      window.location.reload();
                    } catch (error) {
                      toast.error(
                        error instanceof Error ? error.message : "Suppression impossible.",
                      );
                    }
                  }}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold">Packs de crédits d’inscription</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {commerce.creditPacks.map((pack) => (
            <Card key={pack.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold">{pack.name}</h4>
                <Badge variant={pack.isActive ? "default" : "secondary"}>
                  {pack.isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-bold">{pack.creditCount} crédits</p>
              <p className="mt-1 text-sm text-muted-foreground">{formatCurrency(pack.price)}</p>
              <Button
                className="mt-4"
                size="sm"
                variant="outline"
                onClick={() => openCreditPack(pack)}
              >
                Modifier
              </Button>
            </Card>
          ))}
          {!commerce.creditPacks.length && (
            <Card className="p-5 text-sm text-muted-foreground">Aucun pack de crédits.</Card>
          )}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="border-b p-4 font-semibold">
            Achats et attributions de packs ({commerce.creditPurchases.length})
          </div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Crédits</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commerce.creditPurchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      {commerce.partners.find((partner) => partner.id === purchase.partner_id)
                        ?.name ?? purchase.partner_id}
                    </TableCell>
                    <TableCell>
                      {commerce.creditPacks.find((pack) => pack.id === purchase.credit_pack_id)
                        ?.name ?? "Pack"}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      +{purchase.credits}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(purchase.amount))}</TableCell>
                    <TableCell>{purchase.reference}</TableCell>
                    <TableCell>{formatDate(purchase.created_at, true)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b p-4 font-semibold">Paiements ({commerce.payments.length})</div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commerce.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {commerce.partners.find((partner) => partner.id === payment.partner_id)
                        ?.name ?? payment.partner_id}
                    </TableCell>
                    <TableCell>{payment.external_reference}</TableCell>
                    <TableCell>{formatCurrency(Number(payment.amount))}</TableCell>
                    <TableCell>{formatDate(payment.created_at, true)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b p-4 font-semibold">
            Crédits et débits ({commerce.credits.length})
          </div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Variation</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Solde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commerce.credits.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {commerce.partners.find((partner) => partner.id === item.partner_id)?.name ??
                        item.partner_id}
                    </TableCell>
                    <TableCell
                      className={item.credits > 0 ? "text-emerald-600" : "text-destructive"}
                    >
                      {item.credits > 0 ? "+" : ""}
                      {item.credits}
                    </TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell>{item.balance_after}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        <Card className="overflow-hidden xl:col-span-2">
          <div className="border-b p-4 font-semibold">
            Essais et activations ({commerce.trials.length})
          </div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partenaire</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Expiration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commerce.trials.map((trial) => (
                  <TableRow key={trial.id}>
                    <TableCell>
                      {commerce.partners.find((partner) => partner.id === trial.partner_id)?.name ??
                        trial.partner_id}
                    </TableCell>
                    <TableCell>{trial.client_email}</TableCell>
                    <TableCell>{trial.status}</TableCell>
                    <TableCell>{formatDate(trial.starts_at)}</TableCell>
                    <TableCell>{formatDate(trial.expires_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l’offre" : "Créer une offre"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nom</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prix XOF</Label>
              <Input
                type="number"
                min="0"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Crédits inclus</Label>
              <Input
                type="number"
                min="0"
                value={credits}
                onChange={(event) => setCredits(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Durée (jours)</Label>
              <Input
                type="number"
                min="1"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Pack</Label>
              <Select value={packId} onValueChange={setPackId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packs.map((pack) => (
                    <SelectItem key={pack.id} value={pack.id}>
                      {pack.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Essais maximum</Label>
              <Input
                type="number"
                min="0"
                value={maxTrials}
                onChange={(event) => setMaxTrials(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Durée essai (jours)</Label>
              <Input
                type="number"
                min="0"
                value={trialDays}
                onChange={(event) => setTrialDays(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <Label>Offre active</Label>
              <Switch checked={offerActive} onCheckedChange={setOfferActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferOpen(false)}>
              Annuler
            </Button>
            <Button disabled={submitting || !name || !packId} onClick={() => void saveOffer()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider un paiement</DialogTitle>
            <DialogDescription>La référence rend cette validation idempotente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Partenaire" />
              </SelectTrigger>
              <SelectContent>
                {commerce.partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedOfferId}
              onValueChange={(value) => {
                setSelectedOfferId(value);
                setAmount(String(commerce.offers.find((offer) => offer.id === value)?.price ?? ""));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Offre" />
              </SelectTrigger>
              <SelectContent>
                {commerce.offers
                  .filter((offer) => offer.isActive)
                  .map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Montant"
            />
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Référence externe unique"
            />
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Note (optionnelle)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={submitting || !partnerId || !selectedOfferId || !reference}
              onClick={() => void validatePayment()}
            >
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustement manuel</DialogTitle>
            <DialogDescription>
              Utilisez une valeur positive pour créditer, négative pour débiter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Partenaire" />
              </SelectTrigger>
              <SelectContent>
                {commerce.partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name} · {partner.creditBalance} crédits
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={adjustment}
              onChange={(event) => setAdjustment(event.target.value)}
              placeholder="Variation de crédits"
            />
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Motif obligatoire"
            />
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Référence (optionnelle)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={submitting || !partnerId || !reason.trim() || Number(adjustment) === 0}
              onClick={() => void adjustCredits()}
            >
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={creditPackOpen} onOpenChange={setCreditPackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCreditPack ? "Modifier le pack" : "Créer un pack de crédits"}
            </DialogTitle>
            <DialogDescription>Un crédit permet la création d’un tenant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input
                value={creditPackName}
                onChange={(event) => setCreditPackName(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prix XOF</Label>
                <Input
                  type="number"
                  min="0"
                  value={creditPackPrice}
                  onChange={(event) => setCreditPackPrice(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre de crédits</Label>
                <Input
                  type="number"
                  min="1"
                  value={creditPackCount}
                  onChange={(event) => setCreditPackCount(event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Pack actif</Label>
              <Switch checked={creditPackActive} onCheckedChange={setCreditPackActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditPackOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={submitting || !creditPackName.trim() || Number(creditPackCount) < 1}
              onClick={() => void saveCreditPack()}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={creditPurchaseOpen} onOpenChange={setCreditPurchaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acheter / attribuer des crédits</DialogTitle>
            <DialogDescription>
              L’attribution crédite immédiatement et atomiquement le portefeuille du Partner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Partenaire" />
              </SelectTrigger>
              <SelectContent>
                {commerce.partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name} · solde {partner.creditBalance}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCreditPackId} onValueChange={setSelectedCreditPackId}>
              <SelectTrigger>
                <SelectValue placeholder="Pack de crédits" />
              </SelectTrigger>
              <SelectContent>
                {commerce.creditPacks
                  .filter((pack) => pack.isActive)
                  .map((pack) => (
                    <SelectItem key={pack.id} value={pack.id}>
                      {pack.name} · {pack.creditCount} crédits · {formatCurrency(pack.price)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Référence unique"
            />
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Note (optionnelle)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditPurchaseOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={submitting || !partnerId || !selectedCreditPackId || !reference.trim()}
              onClick={() => void purchaseCreditPack()}
            >
              Attribuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
