CREATE TABLE inscricoes (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(160) NOT NULL,
  email VARCHAR(180) NOT NULL,
  telefone VARCHAR(40),
  cidade VARCHAR(120),
  igreja VARCHAR(160),
  tamanho_camisa VARCHAR(20),
  observacoes TEXT,
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_atualizacao TIMESTAMPTZ,
  usuario_id BIGINT REFERENCES app_users(id)
);

CREATE INDEX idx_inscricoes_status ON inscricoes(status);
CREATE INDEX idx_inscricoes_email ON inscricoes(email);
CREATE INDEX idx_inscricoes_data_criacao ON inscricoes(data_criacao);
CREATE INDEX idx_inscricoes_usuario ON inscricoes(usuario_id);
