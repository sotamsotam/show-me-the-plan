# Show Me The Plan — 유료화 작업 종합 정리

> **작성일:** 2026-06-20  
> **범위:** Phase 0~4 코드·문서 구현 (1차 출시 준비)  
> **PG:** 토스페이먼츠 (빌링키 자동결제)  
> **아키텍처:** 결제·Webhook·Cron → **Next.js BFF** / 구독·할인 DB → **Strapi 5**

---

## 관련 문서

| 문서 | 용도 |
|------|------|
| [`MONETIZATION-REVIEW.md`](./MONETIZATION-REVIEW.md) | 정책·아키텍처 종합 검토 (설계 기준) |
| [`MONETIZATION-IMPLEMENTATION-TODO.md`](./MONETIZATION-IMPLEMENTATION-TODO.md) | Phase별 구현 체크리스트 |
| [`BILLING-QA-CHECKLIST.md`](./BILLING-QA-CHECKLIST.md) | 배포 전 QA |
| [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md) | 운영·CS 매뉴얼 |
| [`BILLING-PRODUCTION-GO-LIVE.md`](./BILLING-PRODUCTION-GO-LIVE.md) | 프로덕션 전환 가이드 |
| [`MONETIZATION-OPS-ADMIN-PLAN.md`](./MONETIZATION-OPS-ADMIN-PLAN.md) | 운영 Admin `/ops` 구현 계획 |

---

## 1. 확정 비즈니스 정책

| 항목 | 내용 |
|------|------|
| 과금 대상 | **학생만** (`elementary` · `middle` · `high` · `other`) |
| 매니저 | **항상 무료** |
| 기능 티어 | 없음 — 유효 구독·체험 중 **전 기능** |
| 체험 | 가입 **14일**, **카드 등록 없음** (`trialing`) |
| 요금 | **월 4,900원** (`student_monthly`, VAT 포함) |
| PG | **토스페이먼츠** 빌링키 자동결제 |
| 매니저–학생 | 학생 구독·체험 **유효 시에만** 매니저가 해당 학생 관리 |
| 할인 (1차) | Strapi Admin **수동 할인** (`discountPercent`, `overridePrice`, `discountApplyOnce`) |
| 만료 UX | **Hard block** — 대시보드 차단, billing·구독 설정 등 예외 허용 |
| 이메일 알림 | **보류** (Phase 3.6, 사용자 요청) |

---

## 2. 시스템 아키텍처

```
[학생 브라우저]
    ↓ Next.js (세션·middleware·UI)
    ↓ BFF /api/billing/*, /api/subscription/*
[Strapi 5]
    subscription · plan · payment-history
    subscription.ts · billing.ts · subscription-billing.ts
    manager-access.ts (학생 구독 검증)
    ↓ internal API (x-billing-internal-secret)
[토스페이먼츠]
    requestBillingAuth → 빌링키 → 자동결제 / Webhook
```

**역할 분리**

- **Strapi:** 구독 상태·할인·결제 이력·매니저 접근 도메인
- **Next.js BFF:** 토스 SDK·시크릿키·Webhook·갱신 cron (PG 직접 호출)
- **Middleware:** 학생 만료 시 dashboard/API 차단

---

## 3. Phase별 완료 작업

### Phase 1 — Strapi 데이터·도메인 (2026-06-20) ✅

**Content Types**

- `plan` — 요금제 (`student_monthly` 4,900원 seed)
- `subscription` — 학생 구독·할인 필드·빌링키(암호화)
- `payment-history` — `planPrice` / `discountAmount` / `amount` 구분

**핵심 서비스 (`backend/src/services/`)**

| 파일 | 역할 |
|------|------|
| `subscription.ts` | `hasActiveSubscription`, `createTrialSubscription`, `getSubscriptionSummaryForUser`, `expireDueSubscriptions` |
| `billing.ts` | `resolveBillingAmount()` — 정가·할인·0원·skipPgCharge |
| `subscription-constants.ts` | `TRIAL_DAYS=14`, CT UID |
| `subscription-billing.ts` | 결제 성공/실패, 빌링키 저장, 무료 기간, 갱신 후보, idempotent payment |
| `billing-crypto.ts` | 빌링키 암호화 |
| `manager-access.ts` | 매니저 → 학생 API 시 구독 검증 |

**연동**

- 학생 가입 → 14일 `trialing` 자동 생성
- `GET /api/plans/active`, `GET /api/subscriptions/me`, `GET /api/subscriptions/payment-history`
- `POST /api/subscriptions/cancel`
- `/api/user-profiles/me` 응답에 `subscription` 포함
- `listStudents` → `isAccessAllowed` 필드
- `account-deletion` — 구독·결제 이력 삭제
- `backend/config/cron.ts` — 매일 03:00 만료 처리
- bootstrap — plan seed, 기존 학생 backfill

---

### Phase 2 — 토스 BFF (2026-06-20) ✅

**패키지:** `@tosspayments/tosspayments-sdk`

**Next.js BFF (`frontend/src/app/api/`)**

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/billing/checkout/prepare` | 결제 준비 (플랜·다음 청구액·clientKey) |
| POST | `/api/billing/billing-key/confirm` | authKey → 빌링키 발급·첫 결제 |
| GET | `/api/subscription/me` | 구독 요약 |
| GET | `/api/billing/plans` | 활성 요금제 |
| GET | `/api/billing/history` | 결제 내역 |
| POST | `/api/billing/subscription/cancel` | 해지 예약 |
| POST | `/api/billing/webhooks/toss` | 토스 Webhook |
| POST | `/api/billing/cron/run` | 구독 자동 갱신 cron |
| GET | `/api/billing/health` | 배포 readiness (cron secret) |

**Strapi internal API** (`x-billing-internal-secret`)

- `payment-succeeded` / `payment-failed`
- `save-billing-key` / `grant-free-period`
- `renewal-candidates`

**라이브러리**

- `frontend/src/lib/toss/*` — SDK·서버 API
- `frontend/src/lib/billing/*` — auth, strapi-internal, checkout, logger, readiness, format

**UI (1차)**

- `/billing/checkout`, `/billing/checkout/success|fail`
- `/dashboard/settings/billing`

---

### Phase 3 — 접근 제어·프론트 UI (2026-06-20) ✅

**인증·세션**

- `frontend/src/lib/auth.ts` — 로그인 시 `schoolLevel`, `subscription` JWT/세션 저장
- `frontend/src/types/next-auth.d.ts` — 타입 확장

**Middleware (`frontend/src/middleware.ts`)**

- 학생 + `!isAccessAllowed`:
  - `/dashboard/*` → `/billing/expired` (예외: `/dashboard/settings/billing`)
  - `/billing/checkout*`, `/billing/expired` 허용
  - 그 외 `/api/*` → 403 (billing·subscription·auth 등 allowlist)
- 매니저: 구독 검사 없음
- Strapi `/api/subscriptions/me` 실시간 조회 (실패 시 JWT fallback)

**Guard·배너**

- `SubscriptionStatusBanner` — trialing D-day + 구독 CTA
- `DashboardAccessGuard` — pending manager + 체험 배너

**학생 UI**

| 경로 | 설명 |
|------|------|
| `/pricing` | 요금 안내 (마케팅) |
| `/billing/expired` | 만료 안내·재구독 CTA |
| `/dashboard/settings/billing` | 구독 상태·다음 청구액·해지 |
| `/dashboard/settings/billing/history` | 결제 내역 (정가/할인/실결제액) |

**매니저 UI**

- `StudentSubscriptionBadge` — `유효` / `만료 — 관리 불가`
- `ManagerDashboard`, `ManagerOverviewDashboard`, `ManagerStudentSelector` 반영
- 만료 학생 — 관리 메뉴 숨김 + 안내 문구

**마케팅 카피**

- `for-students`, `elementary`, `middle`, `high` — 14일 무료 체험·4,900원
- `for-parents` — 매니저 무료·학생 구독 필요

**유틸**

- `frontend/src/lib/subscription-access.ts` — allowlist, D-day 계산

---

### Phase 4 — 법무·운영·QA (2026-06-20) ✅

**약관·고지**

- `/legal/paid-service` — 유료서비스 이용약관 (`content/legal/paid-service-v1.ts`)
- `BillingDisclosure` — checkout·구독 설정에 자동갱신·해지·체험 후 요금 고지
- `PaymentHistoryTable` — 정가 / 할인 / 실결제액 / 영수증
- checkout — 유료서비스 약관 동의 체크박스 필수
- `guardianConsentConfirmedAt` 없으면 prepare API 403

**운영·모니터링**

- `lib/billing/logger.ts` — `[billing] webhook.*`, `cron.*` 구조화 로그
- Webhook 서명 실패 → 401 + 로그

**npm 스크립트 (repo root)**

| 명령 | 설명 |
|------|------|
| `npm run billing:qa` | QA 자동 실행 (`scripts/run-billing-qa.mjs`) |
| `npm run billing:manual-qa` | 토스 없이 API·UI 시나리오 (`scripts/run-billing-manual-qa.mjs`) |
| `npm run billing:health` | env readiness 확인 |
| `npm run billing:cron` | 갱신 cron 수동 호출 |
| `npm run ops:qa` | 운영 Admin QA (`scripts/run-ops-qa.mjs`) |

---

### Phase Ops — 운영 Admin `/ops` (2026-06-21) ✅

> 상세: [`MONETIZATION-OPS-ADMIN-PLAN.md`](./MONETIZATION-OPS-ADMIN-PLAN.md)

**기반 (Ops-0)**

- `user-profile.isOperator` — Strapi Admin에서만 `true` 설정
- `OPS_INTERNAL_SECRET` — Strapi internal `/api/ops/internal/*`
- Next.js `/ops` + `/api/ops/*` — `isOperator` 이중 검증

**읽기 (Ops-1)**

- `/ops` 대시보드, `/ops/members`, `/ops/subscriptions`, 구독 상세

**CS 쓰기 (Ops-2)**

- 할인 편집 + `resolveBillingAmount` 미리보기 모달
- `/ops/managers/pending` — 매니저 승인·거절
- [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md) `/ops` 워크플로 반영

**QA:** `npm run ops:qa` → Pass 23 / Skip 3 (2026-06-21)

---

## 4. 환경 변수

루트 `.env.example` / `docker-compose.yml` / `frontend/.env.example` 참고.

| 변수 | 용도 |
|------|------|
| `TOSS_SECRET_KEY` | 토스 API (BFF 서버) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 토스 SDK (브라우저) |
| `BILLING_INTERNAL_SECRET` | Strapi ↔ BFF internal API (동일 값) |
| `BILLING_ENCRYPTION_KEY` | 빌링키 암호화 (Strapi) |
| `BILLING_CRON_SECRET` | cron/health 인증 헤더 |
| `TOSS_WEBHOOK_SKIP_VERIFY` | 로컬 `true`, **운영 `false`** |
| `NEXTAUTH_URL` | checkout success/fail URL 기준 |
| `OPS_INTERNAL_SECRET` | Strapi ↔ BFF ops internal API (동일 값) |

**로컬 테스트 키:** 토스 개발자센터 가입 → `test_sk_` / `test_ck_` (가맹 계약 전 가능, 빌링 MID 확인 필요)

---

## 5. QA 실행 결과

### Billing (`npm run billing:qa`) — 2026-06-21

**Pass 16 / Fail 0 / Skip 7** (토스·`BILLING_*` 키 미설정)

| 통과 | 내용 |
|------|------|
| Unit | Backend 전체 + Frontend billing |
| API | plan 4900원, 학생 가입→14일 trialing |
| HTTP | `/pricing`, `/legal/paid-service`, `/billing/expired` |
| Webhook | 잘못된 서명 → 401 |
| Static | 고지 컴포넌트·마케팅 카피 |

| Skip | 사유 |
|------|------|
| TOSS/BILLING env | 토스 계정·키 **미발급** (추후) |
| cron/health, internal payment | `BILLING_*` secret 없음 |

### Ops (`npm run ops:qa`) — 2026-06-21

**Pass 23 / Fail 0 / Skip 3**

### Manual (`npm run billing:manual-qa`) — 2026-06-21

**Pass 26 / Fail 0 / Skip 5** (토스 키 없이)

| 통과 | D-day 로직, 매니저 연결·배지, 만료·403, 해지 예약, Ops 매니저 승인 API |
| Skip | 브라우저: `/ops`, middleware 리다이렉트, D-day 배너, 토스 결제 |

**수동 QA 남음 (브라우저):** middleware `/billing/expired` 리다이렉트, D-day 배너 표시, 운영자 `/ops`

**토스 키 후:** 테스트 카드 결제, PG amount·cron 갱신 E2E

---

## 5-b. QA 실행 결과 (2026-06-20, 이전)

**자동:** `npm run billing:qa` → **Pass 16 / Fail 0 / Skip 7**

| 통과 | 내용 |
|------|------|
| Unit | Backend 전체 + Frontend billing |
| API | plan 4900원, 학생 가입→14일 trialing |
| HTTP | `/pricing`, `/legal/paid-service`, `/billing/expired` |
| Webhook | 잘못된 서명 → 401 |
| Static | 고지 컴포넌트·마케팅 카피 |

| Skip | 사유 |
|------|------|
| TOSS/BILLING env | 로컬 `.env` 미설정 |
| cron/health, internal payment | `BILLING_*` secret 없음 |

**수동 QA 남음:** D-day 배너, 만료 리다이렉트, 매니저 배지, 토스 테스트 카드 결제, 해지·재구독 UX

---

## 6. 주요 파일·디렉터리

```
backend/
  src/api/plan/
  src/api/subscription/
  src/api/payment-history/
  src/services/subscription.ts
  src/services/subscription-billing.ts
  src/services/billing.ts
  src/services/manager-access.ts
  config/cron.ts

  src/services/ops.ts
  src/services/ops-internal-auth.ts
  src/services/operator.ts

frontend/
  src/middleware.ts
  src/lib/auth.ts
  src/lib/subscription-access.ts
  src/lib/ops/
  src/lib/billing/
  src/lib/toss/
  src/app/api/billing/
  src/app/api/ops/
  src/app/api/subscription/
  src/app/billing/
  src/app/ops/
  src/app/(marketing)/pricing/
  src/app/dashboard/settings/billing/
  src/app/legal/paid-service/
  src/components/billing/
  src/components/ops/
  src/components/SubscriptionStatusBanner.tsx
  src/components/StudentSubscriptionBadge.tsx
  src/content/legal/paid-service-v1.ts
  src/content/marketing/pricing.ts

scripts/
  run-billing-qa.mjs
  run-billing-manual-qa.mjs
  run-billing-cron.mjs
  run-ops-qa.mjs
  check-billing-health.mjs

docs/
  MONETIZATION-WORK-SUMMARY.md   ← 본 문서
  MONETIZATION-REVIEW.md
  MONETIZATION-IMPLEMENTATION-TODO.md
  MONETIZATION-OPS-ADMIN-PLAN.md
  OPS-OPERATOR-SETUP.md
  BILLING-QA-CHECKLIST.md
  BILLING-CS-MANUAL.md
  BILLING-PRODUCTION-GO-LIVE.md
```

---

## 7. 구독 상태 흐름 (요약)

```
학생 가입 → trialing (14일, 무카드)
    ↓
[체험 중] 전 기능 + D-day 배너
    ↓
체험 만료 & 미구독 → expired → /billing/expired, API 403
    ↓
/billing/checkout → active (빌링키 + 결제)
    ↓
매월 cron 갱신 (resolveBillingAmount → PG 또는 0원 skip)
    ↓
해지 예약 (cancelAtPeriodEnd) → 기간 종료 후 expired
```

**매니저:** 연결된 학생 `isAccessAllowed === false` → 관리 403 + UI `만료 — 관리 불가`

---

## 8. 아직 남은 작업

### 출시 전 필수

1. **토스 개발자센터** — 테스트 키 발급 후 `.env` 설정 → `npm run billing:qa` Skip 항목 해소
2. **수동 QA** — [`BILLING-QA-CHECKLIST.md`](./BILLING-QA-CHECKLIST.md) (토스 없이: 배너·리다이렉트·매니저 배지)
3. **프로덕션 전환** — [`BILLING-PRODUCTION-GO-LIVE.md`](./BILLING-PRODUCTION-GO-LIVE.md)

### 비즈니스·법무 (Phase 0 잔여)

- 토스 가맹·빌링 계약, 통신판매업
- 환불 정책, `past_due` grace period, 연간 요금
- 약관·개인정보 **법무 검토** (페이지는 배포됨)

### Phase Ops — 2차 (Ops-3)

- [ ] `ops-audit-log` CT, 환불 UI, 체험 재부여, CSV export

### Phase 5 (장기)

- 쿠폰, past_due 독촉, 학교급별 요금, B2B
- **이메일 알림** (보류)
- Sentry / MRR 지표

---

## 9. 로컬 개발 빠른 참조

```powershell
# 1. Strapi + Frontend 기동
cd backend; npm run develop
cd frontend; npm run dev

# 2. env 설정 후 QA
$env:FRONTEND_URL='http://localhost:3000'
$env:STRAPI_URL='http://localhost:1337'
npm run billing:qa    # 토스 키 없이도 Pass 16 / Skip 7
npm run ops:qa        # OPS_INTERNAL_SECRET 필요 ( .env.example 기본값 )

# 3. 운영 Admin (Strapi Admin에서 isOperator=true 계정 생성 후)
# /login → /ops

# 4. 학생 흐름 확인
# 가입 → /dashboard (체험 배너)
# /billing/checkout (약관 동의 + 카드)
# /dashboard/settings/billing
```

---

*본 문서는 2026-06-21 기준 1차 유료화·Ops Admin 구현 스냅샷입니다.*
