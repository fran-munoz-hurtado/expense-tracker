-- Tabla para registrar consentimiento de Política de Tratamiento de Datos (Colombia)
CREATE TABLE IF NOT EXISTS public.user_privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  accepted_privacy BOOLEAN NOT NULL DEFAULT false,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  policy_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_privacy_consents_user_id ON public.user_privacy_consents(user_id);

ALTER TABLE public.user_privacy_consents ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver su propio consentimiento
CREATE POLICY "Users can view own consent"
  ON public.user_privacy_consents FOR SELECT
  USING (auth.uid() = user_id);

-- Usuarios pueden insertar su propio consentimiento (para signup)
CREATE POLICY "Users can insert own consent"
  ON public.user_privacy_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar su propio consentimiento
CREATE POLICY "Users can update own consent"
  ON public.user_privacy_consents FOR UPDATE
  USING (auth.uid() = user_id);
