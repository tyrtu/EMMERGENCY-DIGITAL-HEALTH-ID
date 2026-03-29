
-- Scan records table
CREATE TABLE public.scan_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medic_user_id uuid NOT NULL,
  patient_user_id uuid NOT NULL,
  patient_health_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medics can view their own scans"
ON public.scan_records FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'medic'::app_role) AND medic_user_id = auth.uid());

CREATE POLICY "Medics can insert scans"
ON public.scan_records FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'medic'::app_role) AND medic_user_id = auth.uid());

CREATE POLICY "Medics can update their own scans"
ON public.scan_records FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'medic'::app_role) AND medic_user_id = auth.uid());

-- Scan notes table
CREATE TABLE public.scan_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.scan_records(id) ON DELETE CASCADE,
  medic_user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medics can view notes on their scans"
ON public.scan_notes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'medic'::app_role) AND medic_user_id = auth.uid());

CREATE POLICY "Medics can insert notes"
ON public.scan_notes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'medic'::app_role) AND medic_user_id = auth.uid());

-- Enable realtime for scan_records
ALTER PUBLICATION supabase_realtime ADD TABLE public.scan_records;
