-- Add unique constraint on cigars.name for upsert to work
ALTER TABLE public.cigars ADD CONSTRAINT cigars_name_unique UNIQUE (name);