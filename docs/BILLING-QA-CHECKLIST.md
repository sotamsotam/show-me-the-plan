# Show Me The Plan — Billing QA 체크리스트

> **실행 시점:** 스테이징 / 라이브 전  
> **환경:** 토스 테스트 키, Strapi + Next.js BFF 기동  
> **자동 실행:** `npm run billing:qa` (기본) · `npm run billing:manual-qa` (토스 없이 API 시나리오)

---

## 최근 QA 실행 (2026-06-21)

| 구분 | 결과 |
|------|------|
| Billing 자동 (`npm run billing:qa`) | **Pass 16 / Fail 0 / Skip 7** |
| Ops 자동 (`npm run ops:qa`) | **Pass 23 / Fail 0 / Skip 3** |
| Strapi | `localhost:1337` |
| Frontend | `localhost:3000` |

**Billing 자동 통과:** unit tests, plan 4900원, 학생 가입→14일 trialing, `/pricing`·약관·만료 페이지, Webhook 서명 401, static UI

**Billing Skip:** TOSS/BILLING_* env (토스 계정·키 **미발급** — 추후 설정), cron/health, internal payment

**Ops 자동 통과:** internal API 인증, `isOperator` 가입 차단, 할인 preview/PATCH, `pgBillingKey` 미노출, BFF 비로그인 307

**Ops Skip (브라우저 수동):** 운영자 `/ops` 접근, 일반 회원 `/ops` 차단, `pending` 매니저 승인 E2E

| Billing 수동 API (`npm run billing:manual-qa`) | **Pass 26 / Fail 0 / Skip 5** |

**토스 키 필요:** 테스트 카드 결제 UI, PG amount 검증, cron 갱신 E2E

---

## 이전 QA (2026-06-20)

| 구분 | 결과 |
|------|------|
| 자동 (`npm run billing:qa`) | **Pass 16 / Fail 0 / Skip 7** |
| Frontend | `localhost:3001` (3000 점유 시) |

---

## 배포 전 확인

```bash
export NEXTAUTH_URL=https://your-domain.example.com
export BILLING_CRON_SECRET=your-cron-secret
npm run billing:health   # ready: true 확인
npm run billing:cron       # 갱신 cron 수동 1회 (선택)
```

자세한 전환 절차: [`BILLING-PRODUCTION-GO-LIVE.md`](./BILLING-PRODUCTION-GO-LIVE.md)

---

## 사전 준비

- [ ] `TOSS_SECRET_KEY`, `NEXT_PUBLIC_TOSS_CLIENT_KEY` (테스트) — _로컬 .env 미설정 (2026-06-20)_
- [ ] `BILLING_INTERNAL_SECRET`, `BILLING_ENCRYPTION_KEY`, `BILLING_CRON_SECRET` — _로컬 .env 미설정_
- [x] Strapi `student_monthly` plan **4,900원** seed 확인 — _자동 QA 통과_

---

## 핵심 시나리오

### 가입 · 체험

- [x] **학생 가입** → 14일 `trialing` — _API 자동 QA_
- [x] 체험 중 **D-day 배너** 로직 — _manual-qa static + unit test_
- [x] **매니저 연결** + `isAccessAllowed` 배지 데이터 — _manual-qa API_

### 만료 · 차단

- [x] 만료 후 `isAccessAllowed=false` — _manual-qa expire-for-qa API_
- [x] `/dashboard/settings/billing`, `/billing/checkout`, `/billing/expired` 경로 존재 — _manual-qa HTTP_
- [x] 만료 학생 Strapi API → 매니저 일정 403 — _manual-qa API_
- [x] 매니저 → 만료 학생 `isAccessAllowed=false` — _manual-qa API_
- [ ] 체험 만료 → `/dashboard` → `/billing/expired` — _브라우저 (middleware)_

### 결제 · 갱신

- [ ] **토스 테스트 카드** → 빌링키 → `active`, 기간 연장
- [ ] 결제 내역: **정가 / 할인 / 실결제액** 구분 표시
- [ ] **Admin 20% 할인** → 다음 청구액 반영 — _토스 PG 검증은 키 발급 후; 할인 로직은 `/ops` + `npm run ops:qa`로 검증됨 (2026-06-21)_
- [ ] **overridePrice / 0원** → PG 생략, 기간 연장
- [ ] **discountApplyOnce** → 1회 후 할인 제거

### 해지 · 재구독

- [x] **해지 예약** `cancelAtPeriodEnd` — _manual-qa API_
- [ ] 기간 종료일까지 이용 후 만료 — _브라우저 / cron_
- [ ] **학생 재구독** → 매니저 관리 재개 — _토스 키 후_

### 권한

- [x] **매니저 계정** — `/api/subscriptions/me` 403 — _manual-qa API_
- [x] **매니저 설정** — 구독 UI 학생만 노출 — _manual-qa static_
- [x] 결제 prepare — **법정대리인** 검증 코드 — _manual-qa static_

---

## Webhook · Cron · 장애

- [ ] Webhook **중복** 수신 → idempotent — _BILLING_INTERNAL_SECRET 설정 후 `billing:qa`_
- [x] Webhook **서명 실패** → 401 — _자동 QA 통과_
- [ ] Cron 누락 후 수동 `/api/billing/cron/run` — _BILLING_CRON_SECRET 설정 후_

---

## UI · 고지

- [x] `/pricing` 요금 안내 — _자동 QA (HTTP 200)_
- [x] `/legal/paid-service` 유료서비스 약관 — _자동 QA_
- [x] checkout **자동갱신·해지·체험 후 요금** 고지 — _BillingDisclosure 컴포넌트 존재_
- [x] 마케팅 페이지 **14일 무료 체험** 카피 — _자동 QA_

---

## 프로덕션 전 (Phase 4.5)

- [ ] 토스 **라이브** 키 교체
- [ ] Webhook URL 운영 도메인 등록
- [ ] `TOSS_WEBHOOK_SKIP_VERIFY=false`
- [ ] 외부 cron 스케줄 등록

---

*테스트 완료 시 항목에 `[x]` 표시 후 릴리스 노트에 반영합니다.*
