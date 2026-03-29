CREATE POLICY "Medics can update patient medical data"
ON public.patient_medical_data
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'medic'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'medic'::app_role));

CREATE POLICY "Medics can insert patient medical data"
ON public.patient_medical_data
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'medic'::app_role));