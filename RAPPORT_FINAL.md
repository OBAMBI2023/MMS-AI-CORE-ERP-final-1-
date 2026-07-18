# Rapport final — Refonte base de données MMS AI CORE

Date : 17 juillet 2026

## 1. Résumé

L'application était déjà, avant intervention, un ERP largement fonctionnel
et réellement connecté à Supabase (pas un prototype avec des données
fictives). Le travail effectué porte sur : la correction de deux problèmes
réels de la base de données, la consolidation de l'historique de migrations
en un fichier unique et propre, et l'adaptation stricte du code nécessaire à
ces corrections — **sans aucune modification du design, des composants UI ou
de l'expérience utilisateur**.

---

## 2. Bugs corrigés

| #   | Bug                                                                                                                                                                                             | Impact avant correction                                                                                                                                    | Correction                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Table `achats` sans colonnes `subtotal` / `discount` alors que le formulaire (`LineItemsDialog`) les envoie systématiquement à chaque création/édition                                          | Échec silencieux ou erreur Supabase (`Could not find the 'subtotal' column`) à chaque enregistrement d'achat                                               | Colonnes ajoutées avec valeurs par défaut (`numeric(12,2) DEFAULT 0`) et contraintes `CHECK (>= 0)`                                                                                                         |
| 2   | Deux migrations SQL historiques recréaient les mêmes tables (`CREATE TABLE public.clients ...` en double)                                                                                       | Rejouer l'historique de migrations sur un nouveau projet Supabase échoue (`relation already exists`)                                                       | Historique consolidé en une seule migration idempotente ; anciennes migrations déplacées dans `supabase/migrations_archive/` pour référence uniquement                                                      |
| 3   | Clés API IA (`openai_key`, `gemini_key`, `claude_key`) stockées dans `parametres`, table dont la politique RLS autorise lecture **et** écriture par le rôle `anon` (clé publique du navigateur) | N'importe quel visiteur du site, sans authentification, pouvait lire ces clés via l'API REST Supabase avec la clé publique déjà présente dans le bundle JS | Clés déplacées dans `integration_settings`, table **sans aucune policy RLS** pour `anon`/`authenticated` ; accès exclusivement via `service_role`, côté serveur, par de nouvelles fonctions serveur dédiées |
| 4   | `SUPABASE_SERVICE_ROLE_KEY` absente de `.env`                                                                                                                                                   | Le module Assistant IA (appel Gemini) ne peut pas fonctionner côté serveur, indépendamment des changements ci-dessus                                       | Signalé — nécessite une action de votre part (voir README, section 2), la clé secrète ne peut pas être générée ni devinée depuis l'extérieur de votre projet Supabase                                       |

---

## 3. Fichiers modifiés ou créés

### Base de données

- **Créé** : `supabase/migrations/20260716120000_clean_schema_rebuild.sql` — migration consolidée unique
- **Déplacés** (archivage, non appliqués) : les 3 fichiers de `supabase/migrations/` d'origine → `supabase/migrations_archive/`

### Code applicatif

| Fichier                               | Nature                             | Raison                                                                                                                                                                         |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/integrations/supabase/types.ts`  | Modifié                            | Types TypeScript réalignés sur le nouveau schéma (`achats`, `ventes`, `depenses`, `parametres`, `integration_settings`)                                                        |
| `src/lib/ai-server.ts`                | Modifié                            | Lit désormais la clé Gemini dans `integration_settings` au lieu de `parametres`                                                                                                |
| `src/routes/parametres.tsx`           | Modifié                            | Chargement, sauvegarde, réinitialisation et import de configuration scindés entre `parametres` (public) et `integration_settings` (sécurisé) — **JSX/UI strictement inchangé** |
| `src/lib/mms/ai-settings.server.ts`   | Créé                               | Fonctions serveur `getAiSettings` / `saveAiSettings` (service role uniquement)                                                                                                 |
| `src/integrations/supabase/client.ts` | Modifié (correctif post-livraison) | Résolution des variables d'environnement sécurisée contre une `ReferenceError` silencieuse (voir section 10)                                                                   |

### Documentation

- **Créé** : `README.md` — installation et vue d'ensemble
- **Créé** : `RAPPORT_FINAL.md` — ce document

Aucun autre fichier (composants, hooks, autres routes) n'a été modifié : ils
ont été vérifiés compatibles avec le nouveau schéma sans changement requis
(voir section 6, déjà transmise et reconfirmée dans ce rapport).

---

## 4. Nouvelles tables

| Table                  | Rôle                                                                                                                                          | Accès                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `integration_settings` | Stocke les clés API des fournisseurs IA (OpenAI, Gemini, Claude) et les réglages associés (modèle, température, max tokens, activé/désactivé) | **Aucune policy RLS pour `anon`/`authenticated`** — accessible uniquement via `service_role`, côté serveur |

Table singleton (comme `parametres`) : une contrainte `UNIQUE (singleton)`
garantit qu'une seule ligne de configuration IA peut exister.

Une vue bonus a également été ajoutée, non consommée par le code actuel mais
disponible pour une future évolution : `v_rapport_mensuel` (agrégation
mensuelle ventes / achats / dépenses / bénéfice sur 12 mois glissants).

---

## 5. Changements de la base de données (détail complet)

| Table                                                                                       | Changement                                                               | Type                                         |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| `clients`, `fournisseurs`, `services`, `devis`, `devis_items`, `vente_items`, `achat_items` | Aucun changement de colonne                                              | —                                            |
| `ventes`                                                                                    | + `updated_at` (avec trigger)                                            | additif                                      |
| `depenses`                                                                                  | + `updated_at` (avec trigger)                                            | additif                                      |
| `achats`                                                                                    | + `subtotal`, `discount`, `updated_at`                                   | additif (corrige le bug #1)                  |
| `parametres`                                                                                | + `singleton` (contrainte d'unicité) ; − les 7 colonnes IA (voir bug #3) | seul retrait, entièrement compensé côté code |
| `integration_settings`                                                                      | Nouvelle table                                                           | additif                                      |

Ajouts transverses sur toutes les tables métier :

- Contraintes `CHECK` : montants/quantités ≥ 0, remise ≤ sous-total, statuts
  (`devis.status`, `achats.status`) limités aux valeurs réellement utilisées
  par les menus déroulants du code.
- Index sur toutes les clés étrangères et les colonnes de tri/filtre
  (`created_at DESC`, `client_id`, `fournisseur_id`, `status`, `category`...).
- Triggers `updated_at` harmonisés sur l'ensemble des tables transactionnelles.
- Policies RLS recréées de façon idempotente (`DROP POLICY IF EXISTS` puis
  `CREATE POLICY`) pour permettre de rejouer la migration sans erreur.
- Bucket de stockage `company-assets` recréé si absent (`ON CONFLICT DO NOTHING`).

---

## 6. Vérification de compatibilité — module par module

Chaque requête Supabase du code a été relue et comparée colonne par colonne
au nouveau schéma :

| Module       | Fichiers concernés                                             | Statut                           |
| ------------ | -------------------------------------------------------------- | -------------------------------- |
| Dashboard    | `index.tsx`, `use-dashboard-data.ts`, `GlobalSearchDialog.tsx` | ✅ compatible, inchangé          |
| Ventes (POS) | `ventes.tsx`, `PosPage.tsx`                                    | ✅ compatible, inchangé          |
| Devis        | `devis.tsx`, `LineItemsDialog.tsx`                             | ✅ compatible, inchangé          |
| Achats       | `achats.tsx`, `LineItemsDialog.tsx`                            | ✅ **corrigé** (bug #1)          |
| Dépenses     | `depenses.tsx`                                                 | ✅ compatible, inchangé          |
| Clients      | `clients.tsx`                                                  | ✅ compatible, inchangé          |
| Fournisseurs | `fournisseurs.tsx`                                             | ✅ compatible, inchangé          |
| Services     | `services.tsx`                                                 | ✅ compatible, inchangé          |
| Rapports     | `rapports.tsx`                                                 | ✅ compatible, inchangé          |
| Paramètres   | `parametres.tsx`                                               | ✅ adapté (bug #3), UI identique |
| Assistant IA | `ai-server.ts`, `ai-settings.server.ts`, `ai-logic.ts`         | ✅ adapté (bug #3)               |

---

## 7. Améliorations apportées (au-delà des corrections de bugs)

- Contraintes d'intégrité (`CHECK`, `UNIQUE`, valeurs par défaut) sur
  l'ensemble du schéma, absentes ou partielles auparavant.
- Index de performance sur les clés étrangères et colonnes de tri, utiles dès
  que le volume de données augmentera.
- `updated_at` + trigger harmonisés sur toutes les tables transactionnelles
  (`ventes`, `achats`, `depenses`), pour un futur suivi d'audit/historique.
- Isolation des secrets IA hors de portée du navigateur (faille corrigée,
  voir bug #3) — pattern réutilisable pour toute future clé sensible.
- Migration unique, idempotente, documentée et rejouable sans erreur —
  remplace un historique de 3 fichiers partiellement contradictoires.
- Vue SQL de reporting mensuel disponible pour une future migration de
  `/rapports` vers une agrégation côté base plutôt que côté client.

---

## 8. Ce qui n'a volontairement pas été modifié

- **Aucun composant visuel, aucune classe CSS, aucune animation.**
- La politique RLS des tables métier (`clients`, `ventes`, etc.) reste
  ouverte pour `anon` : cohérente avec l'absence totale d'écran de connexion
  dans l'application actuelle (usage mono-poste / kiosque). Verrouiller ces
  tables sans ajouter d'écran de connexion casserait l'application.
- La pagination des listes (`ResourceTable`, achats, devis) n'a pas été
  ajoutée : c'est un changement de comportement front-end plus large que le
  périmètre "base de données / logique" de cette mission. À surveiller si le
  volume de données augmente fortement.
- La génération des numéros de documents (`makeNumber()`, suffixe aléatoire
  4 chiffres côté client) n'a pas été modifiée ; collision improbable mais
  possible avec la contrainte `UNIQUE` sur `number`.

---

## 9. Limite de vérification

Cet environnement de travail n'a pas d'accès réseau : `npm install`,
`npm run dev` et `npm run build` n'ont pas pu être exécutés ici. L'ensemble
des modifications a été relu manuellement, ligne par ligne, et vérifié par
recoupement systématique entre le schéma SQL et chaque requête Supabase du
code (section 6). Une compilation réelle (`npm run build`) reste recommandée
avant mise en production — voir `README.md`, section 5.

---

## 10. Correctifs post-livraison

| Date       | Problème signalé                                                                                               | Cause exacte                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Correction                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17/07/2026 | Échec de la migration sur une base Supabase neuve : `42P07: relation "parametres_singleton_uq" already exists` | Les contraintes `parametres_singleton_uq` (et `achats_subtotal_nonneg`, `achats_discount_nonneg`, `achats_status_valid`) étaient déjà créées de façon inline par `CREATE TABLE IF NOT EXISTS`, puis un second bloc `DO $$ ... EXCEPTION WHEN duplicate_object` tentait de les recréer. Pour une contrainte **UNIQUE**, PostgreSQL crée un index implicite du même nom ; la collision sur cet index remonte l'erreur `42P07` (`duplicate_table`), pas `42710` (`duplicate_object`) — non interceptée par le handler existant | Les 5 blocs concernés ont été réécrits pour vérifier directement `pg_constraint` (`IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = ... AND conrelid = ...)`) avant toute tentative d'ajout, au lieu de s'appuyer sur la capture d'une exception. Cette méthode est indépendante du type de contrainte (CHECK, UNIQUE, FK) et du code d'erreur PostgreSQL retourné |

| 17/07/2026 | Erreur critique au chargement du Dashboard + `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` non détectées sur la page Achats, alors que `.env` existe | `src/integrations/supabase/client.ts` retombait sur `process.env.SUPABASE_URL` sans vérifier que `process` existe. Le client Supabase étant créé au premier accès, et le Dashboard étant la première page chargée, c'est là que l'erreur apparaissait en premier ; Achats déclenche le même client partagé. Si `import.meta.env.VITE_SUPABASE_URL` n'est pas injecté au build, la référence à `process.env` non gardée lève une `ReferenceError` dans un environnement navigateur/Workers, au lieu du message d'erreur explicite prévu | Résolution des variables d'environnement sécurisée (`readEnvVar()`) : vérifie `import.meta.env` puis, seulement si `typeof process !== "undefined"`, `process.env`, pour les deux orthographes (préfixée `VITE_` et non préfixée). Comportement inchangé quand les variables sont détectées normalement ; élimine uniquement le risque de crash silencieux |
| 17/07/2026 | `ERROR: 42702: column reference "mois" is ambiguous` en testant la migration | Dans la vue bonus `v_rapport_mensuel`, `date_trunc('month', mois)` référençait `mois` sans le qualifier ; après les `LEFT JOIN`, quatre sous-requêtes (`months`, `v`, `a`, `d`) exposent chacune une colonne `mois` | Qualification explicite en `months.mois`. N'affecte que la vue bonus, non consommée par le code applicatif — aucun impact sur les modules de l'ERP |

Ce dernier correctif ne concerne que `src/integrations/supabase/client.ts` (code
applicatif) — la migration SQL elle-même n'a pas été retouchée pour ce
correctif-ci, mais l'a été pour les deux précédents (idempotence des
contraintes et ambiguïté de la vue).

## 11. Statut de la mission

- [x] Migration SQL consolidée, non destructive, idempotente
- [x] Bug `achats.subtotal` corrigé
- [x] Faille clés API IA corrigée, code adapté, UI inchangée
- [x] Compatibilité vérifiée sur les 11 modules
- [x] README (installation + vue d'ensemble)
- [x] Rapport final (ce document)
- [x] Archive ZIP finale générée (voir livraison)
- [x] Bug d'idempotence de la migration (`42P07`) corrigé et documenté
- [ ] Compilation/build réels non vérifiables dans cet environnement — à
      confirmer de votre côté (ou via Claude Code) avant mise en production
