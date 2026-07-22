-- Corrige les clés étrangères de activity_logs
-- pour permettre la suppression des utilisateurs
-- tout en conservant l'historique.

ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_admin_id_fkey;

ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_admin_id_fkey
FOREIGN KEY (admin_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_affected_user_id_fkey;

ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_affected_user_id_fkey
FOREIGN KEY (affected_user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;