CREATE TABLE IF NOT EXISTS leads (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz   DEFAULT now(),
  name        text,
  email       text,
  phone       text,
  address     text,
  source      text,         -- website / google / facebook / unknown
  subject     text,
  message     text,
  product     text,         -- mirrors / doors / both / unknown
  status      text          DEFAULT 'new',
  value       numeric,
  notes       text,
  raw         text
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "auth users only"
  ON leads
  FOR ALL
  USING (auth.role() = 'authenticated');
