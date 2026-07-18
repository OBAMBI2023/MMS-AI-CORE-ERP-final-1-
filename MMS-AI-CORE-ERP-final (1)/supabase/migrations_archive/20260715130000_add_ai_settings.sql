-- Add AI settings to parametres table
ALTER TABLE public.parametres
ADD COLUMN ai_temperature numeric(3, 2) DEFAULT 0.7,
ADD COLUMN ai_max_tokens integer DEFAULT 2048,
ADD COLUMN ai_enabled boolean DEFAULT true;
