#!/usr/bin/env node
/**
 * 프로덕션 .env 생성 스크립트
 * Usage: node scripts/generate-production-env.mjs [--domain showmepl.com] [--out .env]
 *
 * 외부 서비스 키(NEIS, Brevo, PortOne, VAPID)는 PoC .env에서 복사하거나
 * 각 콘솔에서 발급 후 REPLACE_* 항목을 수동으로 채운다.
 */
import { createECDH, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function urlBase64(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateVAPIDKeys() {
  const curve = createECDH('prime256v1');
  curve.generateKeys();
  return {
    publicKey: urlBase64(curve.getPublicKey()),
    privateKey: urlBase64(curve.getPrivateKey()),
  };
}

const args = process.argv.slice(2);
const domainIdx = args.indexOf('--domain');
const outIdx = args.indexOf('--out');
const domain = domainIdx >= 0 ? args[domainIdx + 1] : 'showmepl.com';
const outPath = resolve(root, outIdx >= 0 ? args[outIdx + 1] : '.env');

const b64 = () => randomBytes(32).toString('base64');
const hex = () => randomBytes(16).toString('hex');
const vapid = generateVAPIDKeys();

const baseUrl = `https://${domain}`;

const content = `# ── Show Me The Plan — Production .env ─────────────────────────
# Generated: ${new Date().toISOString().slice(0, 10)}
# Domain: ${domain}
# ⚠️  Git에 커밋하지 마세요. 비밀번호 관리자에 백업하세요.
#
# 수동 입력 필요 (REPLACE_*):
#   NEIS_KEY, BREVO_*, EMAIL_DEFAULT_FROM, PortOne 키, 사업자 정보

# ── App (Caddy + Next.js) ──────────────────────────────────────
APP_DOMAIN=${domain}
NEXTAUTH_URL=${baseUrl}
NEXTAUTH_SECRET=${b64()}

# www 서브도메인도 사용할 경우 CORS에 함께 등록
CORS_ORIGIN=${baseUrl},https://www.${domain}
FRONTEND_URL=${baseUrl}

# ── Strapi secrets ─────────────────────────────────────────────
APP_KEYS=${b64()},${b64()}
API_TOKEN_SALT=${hex()}
ADMIN_JWT_SECRET=${hex()}
TRANSFER_TOKEN_SALT=${hex()}
JWT_SECRET=${hex()}

# ── PostgreSQL ───────────────────────────────────────────────────
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=${b64()}

# ── External APIs ──────────────────────────────────────────────
NEIS_KEY=REPLACE_NEIS_KEY_FROM_POC_OR_open.neis.go.kr

NEIS_CACHE_ENABLED=true
NEIS_CACHE_TTL_HOURS=12
NEIS_CACHE_MAX_ENTRIES=2000

# ── Email (Brevo SMTP) ─────────────────────────────────────────
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
BREVO_SMTP_USER=REPLACE_BREVO_SMTP_USER
BREVO_SMTP_KEY=REPLACE_BREVO_SMTP_KEY
EMAIL_DEFAULT_FROM=REPLACE_VERIFIED_SENDER@showmepl.com
EMAIL_DEFAULT_NAME=Show Me The Plan

# ── Billing (PortOne V2) — 테스트 키로 시작, 라이브 전환 시 교체 ──
BILLING_INTERNAL_SECRET=${b64()}
BILLING_ENCRYPTION_KEY=${b64()}
BILLING_CRON_SECRET=${b64()}
PORTONE_API_SECRET=REPLACE_PORTONE_TEST_API_SECRET
NEXT_PUBLIC_PORTONE_STORE_ID=REPLACE_PORTONE_TEST_STORE_ID
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=REPLACE_PORTONE_TEST_CHANNEL_KEY
PORTONE_WEBHOOK_SECRET=REPLACE_PORTONE_WEBHOOK_SECRET
# 테스트: true | 라이브 런칭: false (필수)
PORTONE_WEBHOOK_SKIP_VERIFY=true

# ── Ops internal API ─────────────────────────────────────────────
OPS_INTERNAL_SECRET=${b64()}

# ── Web Push (VAPID) ─────────────────────────────────────────────
VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}
VAPID_SUBJECT=mailto:support@showmepl.com

# ── Cloudflare Turnstile (Next.js BFF runtime) ───────────────────
TURNSTILE_SECRET_KEY=REPLACE_TURNSTILE_SECRET_KEY

# ── Upload storage ───────────────────────────────────────────────
UPLOAD_PROVIDER=local

# ── Frontend build-time (NEXT_PUBLIC_*) ──────────────────────────
NEXT_PUBLIC_TURNSTILE_SITE_KEY=REPLACE_TURNSTILE_SITE_KEY
NEXT_PUBLIC_STRAPI_URL=${baseUrl}
NEXT_PUBLIC_CONTACT_EMAIL=support@showmepl.com
NEXT_PUBLIC_REPRESENTATIVE_NAME=REPLACE_REPRESENTATIVE_NAME
NEXT_PUBLIC_BUSINESS_REG_NO=REPLACE_BUSINESS_REG_NO
NEXT_PUBLIC_BUSINESS_ADDRESS=REPLACE_BUSINESS_ADDRESS

# ── GHCR images (docker-compose.prod.yml) ────────────────────────
SMP_FRONTEND_IMAGE=ghcr.io/sotamsotam/show-me-the-plan-frontend:latest
SMP_STRAPI_IMAGE=ghcr.io/sotamsotam/show-me-the-plan-strapi:latest
`;

writeFileSync(outPath, content, { encoding: 'utf8', flag: 'wx' });
console.log(`Created ${outPath}`);
console.log('Next: fill REPLACE_* values from PoC .env or service consoles.');
