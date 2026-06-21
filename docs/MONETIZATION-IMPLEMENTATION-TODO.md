# Show Me The Plan — 유료화 구현 TODO (토스페이먼츠)

> **기준 문서:** [`MONETIZATION-REVIEW.md`](./MONETIZATION-REVIEW.md)  
> **작업 종합:** [`MONETIZATION-WORK-SUMMARY.md`](./MONETIZATION-WORK-SUMMARY.md)  
> **운영 Admin:** [`MONETIZATION-OPS-ADMIN-PLAN.md`](./MONETIZATION-OPS-ADMIN-PLAN.md)  
> **PG:** **토스페이먼츠** (빌링키 자동결제)  
> **작성일:** 2026-06-20  
> **아키텍처:** 결제·Webhook·Cron → **Next.js BFF** / 구독·할인 DB → **Strapi 5**

---

## 진행 상태 범례

- [ ] 미착수
- [x] 완료 (구현 시 체크)

---

## Phase 0 — 사전 준비·의사결정

### 0.1 확정 완료 ✅

- [x] 과금: 학생만 (`elementary` | `middle` | `high` | `other`)
- [x] 매니저: 항상 무료
- [x] 기능 티어 없음 — 유효 구독·체험 중 전 기능
- [x] 신규 가입 14일 체험 (`trialing`)
- [x] 매니저 접근 = 연결된 **학생 구독 유효** 시에만
- [x] 회원별 Admin 수동 할인 (1차)
- [x] PG: **토스페이먼츠**
- [x] 월간 요금: **4,900원 (VAT 포함)**
- [x] 체험 14일: **무카드**

### 0.2 비즈니스·계약 (병행)

- [x] 월간 **요금 확정** — `student_monthly` 4,900원
- [x] VAT **포함가** 표시
- [ ] 연간 요금 (`student_yearly`) 확정
- [ ] 환불 정책 초안 (중도 해지, 7일 이내 등)
- [ ] `past_due` **grace period** 일수 확정 (예: 3일 / 7일)
- [x] 만료 시 **Hard block** 확정 — dashboard 차단, `/billing`·구독 설정 예외 (Phase 3 구현)
- [x] 체험 14일: **무카드** (카드 선등록 없음)
- [ ] 토스페이먼츠 **가맹점·자동결제(빌링)** 계약 신청
- [ ] 통신판매업 신고 (또는 일정 확정)
- [x] 이용약관·유료서비스약관·개인정보(PG 위탁) **페이지 배포** (`/legal/*`) — 법무 검토 별도

### 0.3 환경·키

- [ ] 토스 **테스트** `secretKey`, `clientKey` 발급
- [ ] Docker / `.env`에 키 추가 (git 제외)
  - `TOSS_SECRET_KEY`
  - `NEXT_PUBLIC_TOSS_CLIENT_KEY`
  - `TOSS_WEBHOOK_SECRET` (또는 서명 검증용)
- [ ] Webhook 수신 URL 확정: `https://{domain}/api/billing/webhooks/toss`
- [ ] Caddy/방화벽에서 Webhook 경로 외부 접근 가능 확인

---

## Phase 1 — Strapi 데이터·도메인 서비스 ✅ (2026-06-20)

### 1.1 Content Types 생성

- [x] **`plan`**, **`subscription`**, **`payment-history`** CT
- [x] bootstrap seed: `student_monthly` **4,900원**

### 1.2 회원가입·매니저·API

- [x] 학생 register → 14일 `trialing` (카드 없음)
- [x] 매니저 register → subscription 없음
- [x] `manager-access`, `addMyManager`, `listStudents.isAccessAllowed`
- [x] `GET /api/plans/active`, `GET /api/subscriptions/me`, `/user-profiles/me` + subscription

### 1.3 서비스·운영

- [x] `subscription.ts`, `billing.ts`, `resolveBillingAmount`, `hasActiveSubscription`
- [x] `account-deletion` 연동, cron 만료, 기존 학생 backfill
- [x] Admin 실청구 미리보기 UI (`/ops` 할인 편집), `pgBillingKey` 암호화

---

## Phase 2 — 토스페이먼츠 · Next.js BFF ✅ (2026-06-20)

### 2.1 패키지·설정

- [x] `@tosspayments/tosspayments-sdk`
- [x] `frontend/src/lib/toss/*`, `frontend/src/lib/billing/*`
- [x] `.env.example` / `docker-compose.yml` env 추가

### 2.2 BFF 라우트

- [x] `POST /api/billing/checkout/prepare`
- [x] `POST /api/billing/billing-key/confirm`
- [x] `GET /api/subscription/me`, `GET /api/billing/plans`
- [x] `POST /api/billing/subscription/cancel`
- [x] `GET /api/billing/history`
- [x] `POST /api/billing/webhooks/toss`
- [x] `POST /api/billing/cron/run`

### 2.3 Strapi internal API

- [x] payment-succeeded / payment-failed / save-billing-key / grant-free-period
- [x] renewal-candidates
- [x] `billing-crypto`, `subscription-billing`

### 2.4 UI (최소)

- [x] `/billing/checkout`, `/billing/checkout/success|fail`
- [x] `/dashboard/settings/billing`
- [x] 설정 화면 → 구독 관리 링크

### 2.5 남은 작업 (Phase 3~)

- [x] middleware 구독 차단, 체험 D-day 배너
- [ ] Webhook 서명 검증 운영 설정 (`TOSS_WEBHOOK_SKIP_VERIFY=false`) — 배포 시
- [x] 외부 cron `/api/billing/cron/run` → `npm run billing:cron` + [`BILLING-PRODUCTION-GO-LIVE.md`](./BILLING-PRODUCTION-GO-LIVE.md)

---

## Phase 3 — 접근 제어 · 프론트 UI ✅ (2026-06-20)

### 3.1 인증·세션

- [x] `frontend/src/lib/auth.ts` — JWT callback에 subscription payload
  - [x] `status`, `currentPeriodEnd`, `isAccessAllowed`, `trialEndsAt`, `nextBillingAmount`
- [x] `frontend/src/types/next-auth.d.ts` — 세션 타입 확장

### 3.2 Middleware·Guard

- [x] `frontend/src/middleware.ts`
  - [x] **학생** `/dashboard/*`: `!isAccessAllowed` → `/billing/expired`
  - [x] **매니저**: 구독 검사 없음
- [x] `DashboardAccessGuard` — 체험 D-day 배너
- [x] BFF `/api/*` — 학생 만료 시 allowlist 외 403 (middleware)

### 3.3 학생 Billing UI

- [x] `/pricing` — 요금 안내 (마케팅)
- [x] `/billing/checkout` — 토스 결제창, plan 선택
- [x] `/dashboard/settings/billing` — 상태, 체험 잔여, 정가·할인·**다음 청구액**, 해지
- [x] `/dashboard/settings/billing/history` — 결제 내역
- [x] `/billing/expired` — 만료 안내·재결제 CTA

### 3.4 매니저 UI

- [x] 담당 학생 목록 — 구독 상태 배지 (`유효` / `만료 — 관리 불가`)
- [x] 만료 학생 선택 시 관리 메뉴·TODO 차단 안내 (API 403 대응 UX)
- [x] 구독·결제 UI **노출하지 않음** (기존 설정 화면 분기 유지)

### 3.5 마케팅 카피

- [x] `for-students.ts`, `elementary.ts`, `middle.ts`, `high.ts` — "14일 무료 체험"
- [x] `for-parents.ts` — 매니저 무료, 학생 구독 필요 명시

### 3.6 이메일 (Brevo) — ⏸ 보류

> 사용자 요청으로 1차 출시 범위에서 제외. 추후 Phase 5 또는 별도 스프린트.

- [ ] 체험 3일·1일·당일 남음
- [ ] 체험 만료·구독 만료
- [ ] 결제 성공·실패 (`past_due`)
- [ ] 갱신 7일·1일 전
- [ ] (선택) 매니저: 담당 학생 만료 알림

---

## Phase 4 — 법무 · 운영 · QA ✅ (코드·문서, 2026-06-20)

### 4.1 약관·고지

- [x] 이용약관·**유료서비스약관** 배포 (`/legal/paid-service`)
- [x] 결제 화면: 자동갱신·해지 방법·체험 후 요금 고지 (`BillingDisclosure`)
- [x] 영수증/내역: 정가·할인·실결제액 구분 (`PaymentHistoryTable`)
- [x] 미성년자: `guardianConsentConfirmedAt` + 결제 전 고지 (checkout prepare 403)

### 4.2 CS 매뉴얼

- [x] Admin 수동 할인 설정 방법 → [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md)
- [x] 구독 수동 연장 (100% 할인 대체)
- [x] 0원 청구 / `discountApplyOnce` 시나리오
- [ ] 환불 시 PG + Strapi sync (2차 상세 가능)

### 4.3 테스트

- [x] QA 체크리스트 문서 → [`BILLING-QA-CHECKLIST.md`](./BILLING-QA-CHECKLIST.md)
- [x] **자동 QA** — `npm run billing:qa` + `npm run billing:manual-qa` (2026-06-21)
- [ ] **브라우저 QA** — middleware 리다이렉트, D-day 배너, `/ops` (체크리스트 Browser 섹션)

### 4.4 모니터링

- [x] 결제 실패·Webhook·Cron **구조화 로깅** (`lib/billing/logger.ts`)
- [x] Billing readiness API → `GET /api/billing/health` + `npm run billing:health`
- [ ] Sentry·MRR 지표 (2차)

### 4.5 프로덕션 전환

- [x] 전환 가이드 → [`BILLING-PRODUCTION-GO-LIVE.md`](./BILLING-PRODUCTION-GO-LIVE.md)
- [x] Cron 스크립트 → `npm run billing:cron`
- [ ] 토스 **라이브** 키로 교체 (배포 시)
- [ ] Webhook URL 운영 도메인 등록 (배포 시)
- [ ] Admin plan 가격 최종 반영 (배포 시)
- [x] `MONETIZATION-REVIEW.md` Phase 0 잔여 항목 정리 (Hard block·약관 배포 반영, 2026-06-21)

---

## Phase 5 — 2차 (범위 외, 추후)

- [ ] 쿠폰·프로모 코드 (사용자 셀프 입력)
- [ ] 체험 14일 재부여 (CS override)
- [ ] 환불 Admin UI + PG 환불 API 연동
- [ ] past_due 전용 Admin 독촉 리스트
- [ ] 학교급별 차등 요금
- [ ] 기관(B2B) 계약·세금계산서

---

## Phase Ops — 운영 Admin `/ops` (계획 확정)

> **상세:** [`MONETIZATION-OPS-ADMIN-PLAN.md`](./MONETIZATION-OPS-ADMIN-PLAN.md)

### 확정 의사결정

- [x] 운영자: `user-profile.isOperator`, **Strapi Admin에서만 가입**
- [x] URL: 같은 사이트 `/ops` (선택지 A)
- [x] 감사 1차: Subscription 필드만 / 2차: 전용 audit-log

### Ops-0 — 기반 ✅ (2026-06-21)

- [x] `isOperator` 필드 + API 차단
- [x] `/ops` middleware·BFF·Strapi internal auth (`OPS_INTERNAL_SECRET`)

### Ops-1 — 읽기 ✅ (2026-06-21)

- [x] 대시보드·회원·구독 목록·상세(읽기)

### Ops-2 — CS 쓰기 ✅ (2026-06-21)

- [x] 할인 편집·실청구 미리보기·매니저 승인
- [x] `npm run ops:qa` — Pass 23 / Skip 3 (브라우저 수동)

### Ops-3 — 2차

- [ ] audit-log CT, 환불, 체험 재부여, CSV

---

## 파일·디렉터리 체크리스트 (신규 예상)

| 구분 | 경로 |
|------|------|
| Strapi CT | `backend/src/api/plan/`, `subscription/`, `payment-history/` |
| 서비스 | `backend/src/services/subscription.ts`, `billing.ts` |
| 매니저 | `backend/src/services/manager-access.ts` (수정) |
| 가입 | `backend/src/api/user-profile/controllers/user-profile.ts` (수정) |
| BFF | `frontend/src/app/api/billing/**`, `api/subscription/**` |
| 토스 | `frontend/src/lib/toss/**`, `frontend/src/lib/billing/**` |
| UI | `frontend/src/app/(marketing)/pricing/`, `billing/**`, `dashboard/settings/billing/**` |
| 인증 | `frontend/src/lib/auth.ts`, `middleware.ts` (수정) |

---

## 의존 관계 (순서 요약)

```
Phase 0 (가격·계약·키)
    ↓
Phase 1 (Strapi CT + hasActiveSubscription + resolveBillingAmount)
    ↓
Phase 2 (토스 BFF + Webhook + Cron)  ← Phase 1 API 필요
    ↓
Phase 3 (middleware + UI + manager-access UI)  ← Phase 1·2 병행 가능
    ↓
Phase 4 (약관·QA·라이브)
```

---

## 참고 링크

- [토스페이먼츠 개발자센터](https://docs.tosspayments.com/)
- [자동결제(빌링)](https://docs.tosspayments.com/guides/v2/billing)
- [Webhook](https://docs.tosspayments.com/guides/v2/webhook)
- 내부: [`MONETIZATION-REVIEW.md`](./MONETIZATION-REVIEW.md)

---

*구현 착수 시 이 문서의 Phase 순서대로 진행하고, 완료 항목을 `[x]`로 갱신한다.*
