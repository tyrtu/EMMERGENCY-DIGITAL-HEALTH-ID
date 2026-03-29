
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS health_id TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_health_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_id TEXT;
  year_part TEXT;
  seq_num INT;
BEGIN
  year_part := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(health_id FROM 'EHID-\d{4}-(\d+)') AS INT)), 0) + 1
  INTO seq_num
  FROM public.profiles
  WHERE health_id LIKE 'EHID-' || year_part || '-%';
  
  new_id := 'EHID-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_health_id_on_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.health_id IS NULL THEN
    NEW.health_id := public.generate_health_id();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_health_id ON public.profiles;
CREATE TRIGGER trigger_assign_health_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_health_id_on_create();

UPDATE public.profiles SET health_id = public.generate_health_id() WHERE health_id IS NULL;
