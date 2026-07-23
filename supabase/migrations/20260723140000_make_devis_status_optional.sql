-- Rendre la colonne status optionnelle dans la table devis
ALTER TABLE public.devis ALTER COLUMN status DROP NOT NULL;
