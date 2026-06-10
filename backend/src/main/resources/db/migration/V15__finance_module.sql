ALTER TABLE app_users
ADD COLUMN can_access_finance BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_users
SET can_access_finance = TRUE
WHERE roles LIKE '%admin%'
   OR email = 'admin@vindesertao.local';

CREATE TABLE financial_transactions (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description VARCHAR(220) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  payment_method VARCHAR(80),
  transaction_date DATE NOT NULL,
  notes TEXT,
  responsible_user_id BIGINT NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(180) NOT NULL,
  updated_at TIMESTAMPTZ,
  updated_by VARCHAR(180)
);

CREATE INDEX idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX idx_financial_transactions_responsible ON financial_transactions(responsible_user_id);
