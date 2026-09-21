import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.env.DATA_DIR ?? "./dados");
export const UPLOAD_DIR = path.join(DATA_DIR, "anexos");

mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "chamados.db"));

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  senha_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'usuario',
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sistemas (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chamados (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  sistema_id TEXT REFERENCES sistemas(id),
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'aberto',
  solicitante_id TEXT NOT NULL REFERENCES usuarios(id),
  tecnico_id TEXT REFERENCES usuarios(id),
  resolvido_em TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comentarios (
  id TEXT PRIMARY KEY,
  chamado_id TEXT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  autor_id TEXT NOT NULL REFERENCES usuarios(id),
  conteudo TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anexos (
  id TEXT PRIMARY KEY,
  chamado_id TEXT NOT NULL REFERENCES chamados(id) ON DELETE CASCADE,
  arquivo TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chamados_status ON chamados(status);
CREATE INDEX IF NOT EXISTS idx_chamados_solicitante ON chamados(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_chamado ON comentarios(chamado_id);
`);

db.prepare(
  "INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES ('cadastro_habilitado', 'true')",
).run();

for (const nome of ["ERP", "CRM", "Portal do Cliente", "E-mail Corporativo", "Rede/Infraestrutura"]) {
  db.prepare("INSERT OR IGNORE INTO sistemas (id, nome) VALUES (?, ?)").run(
    `sistema-${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    nome,
  );
}

export function getConfig(chave) {
  return db.prepare("SELECT valor FROM configuracoes WHERE chave = ?").get(chave)?.valor ?? null;
}

export function setConfig(chave, valor) {
  db.prepare(
    "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor",
  ).run(chave, String(valor));
}
