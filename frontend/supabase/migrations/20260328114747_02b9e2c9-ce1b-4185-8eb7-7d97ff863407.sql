
-- Vital signs table
CREATE TABLE public.vital_signs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  heart_rate INTEGER,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  temperature NUMERIC,
  oxygen_saturation INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own vitals" ON public.vital_signs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Medics can view vitals" ON public.vital_signs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'medic'::app_role));
CREATE POLICY "Medics can insert vitals" ON public.vital_signs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'medic'::app_role));
CREATE POLICY "Medics can update vitals" ON public.vital_signs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'medic'::app_role));

-- Medical visits table
CREATE TABLE public.medical_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  doctor_name TEXT,
  department TEXT,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  follow_up_date DATE,
  prescriptions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own visits" ON public.medical_visits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Medics can view visits" ON public.medical_visits FOR SELECT TO authenticated USING (has_role(auth.uid(), 'medic'::app_role));
CREATE POLICY "Medics can insert visits" ON public.medical_visits FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'medic'::app_role));
CREATE POLICY "Medics can update visits" ON public.medical_visits FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'medic'::app_role));

-- Detailed medications table
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE,
  prescribed_by TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own medications" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Medics can view medications" ON public.medications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'medic'::app_role));
CREATE POLICY "Medics can insert medications" ON public.medications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'medic'::app_role));
CREATE POLICY "Medics can update medications" ON public.medications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'medic'::app_role));

-- Emergency contacts table (multiple contacts per patient)
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own contacts" ON public.emergency_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Patients can insert own contacts" ON public.emergency_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients can update own contacts" ON public.emergency_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Patients can delete own contacts" ON public.emergency_contacts FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Medics can view contacts" ON public.emergency_contacts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'medic'::app_role));
