import crypto from "node:crypto";

const SECRET = process.env.AUTH_SECRET ?? "segredo-de-desenvolvimento-troque-em-producao";
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

export function hashSenha(senha, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(senha, salt, 120000, 32, "sha256").toString("hex");
  return { hash, salt };
}

export function conferirSenha(senha, hash, salt) {
  const atual = crypto.pbkdf2Sync(senha, salt, 120000, 32, "sha256").toString("hex");
  const a = Buffer.from(atual, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function assinar(payloadB64) {
  return crypto.createHmac("sha256", SECRET).update(payloadB64).digest("base64url");
}

export function gerarToken(usuario) {
  const payload = { sub: usuario.id, role: usuario.role, exp: Date.now() + TOKEN_TTL_MS };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${assinar(b64)}`;
}

export function lerToken(token) {
  if (!token || !token.includes(".")) return null;
  const [b64, assinatura] = token.split(".");
  const esperada = assinar(b64);
  if (
    assinatura.length !== esperada.length ||
    !crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
