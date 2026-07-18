# MMS AI CORE — ERP Imprimerie

ERP pour imprimerie / bureautique (point de vente, devis, achats, dépenses,
clients, fournisseurs, catalogue de services, rapports, assistant IA).
Stack : Vite + TanStack Start + React + TypeScript + Supabase (PostgreSQL).

Ce dépôt a fait l'objet d'une refonte de la base de données et d'une revue
complète des modules pour corriger les bugs de schéma et une faille de
sécurité, **sans modifier le design ni l'expérience utilisateur**. Voir
`RAPPORT_FINAL.md` pour le détail complet.

---

## 1. Installation

Prérequis : Node.js 18+ (ou Bun), un projet Supabase.

```bash
# Installer les dépendances
npm install
# ou : bun install

# Copier/vérifier les variables d'environnement (voir section 2)
cp .env.example .env   # si vous partez d'un environnement vierge

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build
```

> ⚠️ Cet environnement de travail n'avait pas d'accès réseau : `npm install`,
> `npm run dev` et `npm run build` n'ont **pas pu être exécutés ni vérifiés
> ici**. Tout le code a été relu manuellement et vérifié colonne par colonne
> par rapport au schéma SQL, mais une vérification de compilation reste
> recommandée avant mise en production (voir section 5).

## 2. Variables d'environnement (`.env`)

```
SUPABASE_URL=...
SUPABASE_PROJECT_ID=...
SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...

# Requise pour : l'Assistant IA (appel Gemini) et la nouvelle table
# integration_settings (clés API IA, non exposées au client).
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` se trouve dans Supabase → Project Settings → API
→ `service_role` (secret). **Ne jamais** l'exposer côté client ni la
préfixer par `VITE_`.

## 3. Base de données

La migration SQL consolidée se trouve dans :

```
supabase/migrations/20260716120000_clean_schema_rebuild.sql
```

Elle est **idempotente et non destructive** (utilise `IF NOT EXISTS` /
`ADD COLUMN IF NOT EXISTS`) : elle peut être appliquée directement sur la
base existante sans perte de données, via :

```bash
supabase db push
# ou : coller le contenu du fichier dans l'éditeur SQL de Supabase
```

Les trois anciennes migrations (historique conflictuel) sont conservées pour
référence dans `supabase/migrations_archive/` mais ne doivent plus être
appliquées.

## 4. Structure du projet

```
src/
  routes/            Pages (une par module ERP : ventes, devis, achats, ...)
  components/mms/    Composants métier (POS, tableaux CRUD génériques, ...)
  hooks/              use-dashboard-data.ts (agrégation tableau de bord)
  lib/mms/            Formatage, contexte ERP, paramètres IA sécurisés
  integrations/supabase/  Client Supabase (browser + serveur) et types générés
  assistant/          Module Assistant IA (chat + logique)
supabase/
  migrations/          Migration SQL consolidée (celle à appliquer)
  migrations_archive/  Anciennes migrations (référence uniquement)
```

## 5. Vérifications recommandées avant mise en production

1. `npm install && npm run build` — n'a pas pu être exécuté dans cet
   environnement (pas d'accès réseau). À faire avant déploiement.
2. Ajouter `SUPABASE_SERVICE_ROLE_KEY` dans `.env` (voir section 2).
3. Appliquer la migration SQL sur votre projet Supabase.
4. Tester la création d'un achat (le bug `subtotal` manquant est corrigé,
   mais à valider en conditions réelles).
5. Tester l'onglet Paramètres → Assistant IA (lecture/écriture des clés,
   désormais routées via le serveur).

Détail complet des changements : voir `RAPPORT_FINAL.md`.
