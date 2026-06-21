# Show Me The Plan — Billing 프로덕션 전환 가이드

> **선행 문서:** [`BILLING-QA-CHECKLIST.md`](./BILLING-QA-CHECKLIST.md), [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md)  
> **이메일 알림(Phase 3.6):** 보류 — 본 가이드 범위 외

---

## 1. 전환 순서 요약

```
QA 체크리스트 (스테이징) → env 교체 → health 확인 → Webhook 등록 → cron 스케줄 → 모니터링
```

---

## 2. 환경 변수 (운영)

루트 `.env` (또는 Docker secrets)에서 아래를 **라이브** 값으로 교체합니다.

| 변수 | 개발 | 운영 |
|------|------|------|
| `NEXTAUTH_URL` | `http://localhost` | `https://your-domain.example.com` |
| `TOSS_SECRET_KEY` | `test_sk_...` | `live_sk_...` |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | `test_ck_...` | `live_ck_...` |
| `TOSS_WEBHOOK_SKIP_VERIFY` | `true` (로컬) | **`false`** |
| `BILLING_INTERNAL_SECRET` | 임의 문자열 | Strapi·Next.js **동일** 값 |
| `BILLING_CRON_SECRET` | 임의 문자열 | cron 호출용 |
| `BILLING_ENCRYPTION_KEY` | 32자 이상 | 빌링키 암호화용 |
| `OPS_INTERNAL_SECRET` | 임의 문자열 | Strapi·Next.js **동일** — `/api/ops/internal/*` |

Strapi에도 `BILLING_INTERNAL_SECRET`, `BILLING_ENCRYPTION_KEY`, `OPS_INTERNAL_SECRET`이 frontend와 일치해야 합니다.

---

## 3. Health check

배포 후 설정이 올바른지 확인합니다.

```bash
# Linux / macOS / Git Bash
export NEXTAUTH_URL=https://your-domain.example.com
export BILLING_CRON_SECRET=your-cron-secret
npm run billing:health
```

- exit `0` + `"ready": true` → 필수 항목 통과
- exit `2` → `"checks"` 배열에서 `severity: "error"` 항목 수정

응답에 `webhookUrl`, `cronUrl`이 포함됩니다. 토스 개발자센터 Webhook URL 등록 시 사용하세요.

---

## 4. 토스페이먼츠 Webhook

1. [토스 개발자센터](https://developers.tosspayments.com/) → **라이브** 키 확인
2. Webhook URL 등록:
   ```
   https://your-domain.example.com/api/billing/webhooks/toss
   ```
3. `TOSS_WEBHOOK_SKIP_VERIFY=false` 확인 후 테스트 결제 1건 → 서버 로그 `[billing] webhook.payment_succeeded` 확인

---

## 5. 갱신 Cron 스케줄

Strapi는 **매일 03:00** `expireDueSubscriptions` cron을 실행합니다 (`backend/config/cron.ts`).

**자동 결제 갱신**은 Next.js BFF cron이 담당합니다. 외부 스케줄러에서 **하루 1~2회** 호출하세요.

### npm 스크립트 (권장)

```bash
export NEXTAUTH_URL=https://your-domain.example.com
export BILLING_CRON_SECRET=your-cron-secret
npm run billing:cron
```

### Linux crontab 예시

```cron
# 매일 09:00 KST — 구독 자동 갱신
0 9 * * * NEXTAUTH_URL=https://your-domain.example.com BILLING_CRON_SECRET=secret /usr/bin/node /path/to/show-me-the-plan/scripts/run-billing-cron.mjs >> /var/log/smp-billing-cron.log 2>&1
```

### Windows Task Scheduler

- 프로그램: `node`
- 인수: `D:\show-me-the-plan\scripts\run-billing-cron.mjs`
- 환경 변수: `NEXTAUTH_URL`, `BILLING_CRON_SECRET`

---

## 6. Strapi Admin 확인

- [ ] **Plan** → `student_monthly` 가격 **4,900원**
- [ ] 테스트 학생 구독 상태·할인 필드 확인

---

## 7. 배포 후 스모크 테스트

[`BILLING-QA-CHECKLIST.md`](./BILLING-QA-CHECKLIST.md)의 **핵심 시나리오** 5~10분 버전:

1. 학생 가입 → trialing
2. `/pricing`, `/legal/paid-service` 접근
3. 테스트 카드 결제 → active
4. 해지 예약 → 기간 종료까지 이용
5. 매니저 → 학생 만료 시 배지·403

---

## 8. 모니터링

서버 로그에서 아래 이벤트를 확인합니다.

| 로그 prefix | 의미 |
|-------------|------|
| `[billing] cron.renewal_started` | 갱신 cron 시작 |
| `[billing] cron.renewal_finished` | 갱신 cron 완료 |
| `[billing] webhook.payment_succeeded` | Webhook 결제 성공 |
| `[billing] webhook.signature_invalid` | Webhook 서명 실패 (조사 필요) |

(선택) Sentry 등에 `console.error` 수집 연동 — Phase 5

---

## 9. 롤백

- 토스 키를 **test** 키로 되돌리거나 Webhook 비활성화
- `TOSS_WEBHOOK_SKIP_VERIFY=true`는 **임시**만 사용 (운영 상시 금지)
- Strapi subscription 수동 연장(CS 매뉴얼 참고)

---

*토스 가맹·통신판매업 신고 등 **계약/법무** 항목은 별도 일정으로 진행합니다.*
