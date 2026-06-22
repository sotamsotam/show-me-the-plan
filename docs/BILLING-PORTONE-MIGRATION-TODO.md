# Show Me The Plan — PG 전환 TODO (토스페이먼츠 → 포트원)

> **기준 문서:** [`MONETIZATION-REVIEW.md`](./MONETIZATION-REVIEW.md)  
> **기존 구현:** [`MONETIZATION-IMPLEMENTATION-TODO.md`](./MONETIZATION-IMPLEMENTATION-TODO.md) (토스 기준, Phase 1~3 완료)  
> **전환 배경:** 토스 실연동·실결제 이력 없음 → 빌링키 이전 부담 없이 PG 교체 가능  
> **목표 PG:** **포트원 V2** (빌링키 자동결제)  
> **작성일:** 2026-06-22  
> **아키텍처:** 변경 없음 — 결제·Webhook·Cron → **Next.js BFF** / 구독·할인 DB → **Strapi 5**

---

## 진행 상태 범례

- [ ] 미착수
- [x] 완료 (구현 시 체크)

---

## 전환 범위 요약

| 변경 없음 (재사용) | 변경 필요 |
|-------------------|-----------|
| Strapi 구독 도메인 (`subscription.ts`, `billing.ts`, `manager-access`) | `frontend/src/lib/toss/*` → `lib/portone/*` |
| internal API (`payment-succeeded`, `renewal-candidates` 등) | 체크아웃 UI·성공 콜백 |
| `BILLING_INTERNAL_SECRET`, `BILLING_CRON_SECRET`, 암호화 | Webhook 라우트·서명 검증 |
| middleware 구독 차단, `/ops` 할인 | Cron 갱신 PG 호출 |
| 할인·체험·만료 UX | env·readiness·QA 스크립트 |
| | `pgProvider` enum·약관 문구 |

---

## Phase 0 — 사전 준비·의사결정

### 0.1 확정 사항

- [x] 토스 실연동 없음 — 기존 빌링키·결제 이력 이전 불필요
- [x] 구독 모델 유지 — 학생 월 4,900원, 빌링키 자동갱신, 14일 무카드 체험
- [ ] **포트원 V2** 연동 확정 (V1 아임포트 미사용)
- [ ] 포트원 콘솔 **하위 PG 채널** 선택 (나이스·토스·KG 등 — 영업·수수료 확인)
- [ ] 포트원 **테스트 스토어** 생성 및 채널 연동

### 0.2 계약·비즈니스 (병행)

- [ ] 포트원 가맹·정기결제(빌링) 채널 계약
- [ ] 통신판매업 신고 (또는 일정 확정) — 기존 TODO와 동일
- [ ] 유료서비스약관 PG 위탁 문구 **포트원** 기준 법무 검토

### 0.3 환경 변수 확정

포트원 V2 기준 (이름은 구현 시 공식 문서와 맞춤):

- [ ] `PORTONE_API_SECRET` — 서버 API 시크릿
- [ ] `NEXT_PUBLIC_PORTONE_STORE_ID` — 브라우저 SDK용 스토어 ID
- [ ] `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` — 빌링키 발급 채널 키
- [ ] `PORTONE_WEBHOOK_SECRET` — Webhook 서명 검증 (또는 문서상 권장 방식)
- [ ] `PORTONE_WEBHOOK_SKIP_VERIFY` — 로컬 `true`, **운영 `false`**
- [ ] Webhook URL: `https://{domain}/api/billing/webhooks/portone`
- [x] `.env.example`, `frontend/.env.example`, `docker-compose.yml` 변수 템플릿 반영
- [ ] 기존 유지: `BILLING_INTERNAL_SECRET`, `BILLING_CRON_SECRET`, `BILLING_ENCRYPTION_KEY`, `NEXTAUTH_URL`

**제거 예정 (토스):**

- `TOSS_SECRET_KEY`, `NEXT_PUBLIC_TOSS_CLIENT_KEY`, `TOSS_WEBHOOK_SKIP_VERIFY`

---

## Phase 1 — 패키지·설정 레이어

### 1.1 npm 패키지

- [x] `@tosspayments/tosspayments-sdk` **제거**
- [x] 포트원 브라우저 SDK 추가 (`@portone/browser-sdk`)
- [x] `frontend/package.json` / `package-lock.json` 반영

### 1.2 `frontend/src/lib/portone/` 신규

- [x] `config.ts` — `getPortOneApiSecret`, `getPortOneStoreId`, `getPortOneChannelKey`, `isPortOneConfigured`
- [x] `server.ts` — 서버 REST 래퍼
  - [x] 빌링키 단건 조회 (`getBillingKey`)
  - [x] `payWithBillingKey` — `POST /payments/{paymentId}/billing-key`
  - [x] 결제 단건 조회 (`getPayment`) — 리다이렉트 누락 대비
- [x] `config.test.ts` — 설정 유닛 테스트

### 1.3 토스 코드 제거

- [x] `frontend/src/lib/toss/config.ts` 삭제
- [x] `frontend/src/lib/toss/server.ts` 삭제
- [x] 전역 import `@/lib/toss/*` 참조 0건
- [x] `@tosspayments/tosspayments-sdk` 제거

---

## Phase 2 — Strapi 스키마·백엔드

### 2.1 Content Type

- [x] `subscription.pgProvider` enum: `["toss"]` → `["portone"]`
- [x] `schema.json` 수정 및 `contentTypes.d.ts` 갱신 (Strapi 재시작 시 자동 재생성)

### 2.2 서비스 하드코딩 제거

- [x] `backend/src/services/subscription-billing.ts` — `DEFAULT_PG_PROVIDER` 사용, `saveBillingKey`·`applyPaymentSuccess`에 `pgProvider` 입력 지원
- [x] `backend/src/services/subscription.ts` — `createTrialSubscription` 기본값 `portone`
- [x] internal `save-billing-key` / `payment-succeeded` API — `pgProvider` body 선택 수신

### 2.3 변경 없음 확인

- [x] `billing.ts` (`resolveBillingAmount`) — 수정 불필요
- [x] `billing-crypto.ts` — 수정 불필요
- [x] renewal-candidates / payment-succeeded / payment-failed — 수정 불필요 (PG 무관)

---

## Phase 3 — Next.js BFF 라우트

### 3.1 체크아웃 준비

**파일:** `frontend/src/app/api/billing/checkout/prepare/route.ts`

- [x] `isTossConfigured()` → `isPortOneConfigured()`
- [x] 응답 필드: `storeId`, `channelKey`, `paymentId` 등 포트원 SDK에 맞게 변경
- [x] `successUrl` / `failUrl` 유지

### 3.2 빌링키 확정

**파일:** `frontend/src/app/api/billing/billing-key/confirm/route.ts`

- [x] 요청 body: `billingKey` (+ 선택 `paymentId`)
- [x] `completeBillingCheckout` 시그니처에 맞게 수정

### 3.3 체크아웃 완료 로직

**파일:** `frontend/src/lib/billing/checkout.ts`

- [x] 토스 `issueBillingKey` 제거 — 포트원 `billingKey` 직접 사용 + `getBillingKey` 검증
- [x] `chargeBillingKey` → `payWithBillingKey`
- [x] `pgPaymentId` / `pgProvider` 매핑
- [x] 0원·할인 `skipPgCharge` 분기 유지

### 3.4 Cron 갱신

**파일:** `frontend/src/app/api/billing/cron/run/route.ts`

- [x] `payWithBillingKey` 사용
- [x] `isPortOneConfigured()` 가드

### 3.5 Webhook (신규·교체)

- [x] `POST /api/billing/webhooks/portone` **신규**
- [x] `@portone/server-sdk/webhook` 서명 검증 + `PORTONE_WEBHOOK_SKIP_VERIFY`
- [x] `Transaction.Paid` / `Transaction.Failed` 처리
- [x] `paymentId`에서 `userId` 추출 (`smp-{userId}-` 규칙)
- [x] `POST /api/billing/webhooks/toss` **삭제**

### 3.6 Health·Readiness

- [x] `health/route.ts` — webhook URL portone
- [x] `readiness.ts` / `readiness.test.ts` — 포트원 키 체크
- [x] `lib/toss/*` 삭제 (BFF 참조 제거)
- [x] `scripts/run-billing-qa.mjs` — portone env·webhook

---

## Phase 4 — 프론트엔드 UI

### 4.1 체크아웃

**파일:** `frontend/src/app/billing/checkout/BillingCheckoutClient.tsx`

- [x] `PortOne.requestIssueBillingKey()` 연동
- [x] `PrepareResponse` 타입 필드 갱신 (`storeId`, `channelKey`, `paymentId`)
- [x] `customer.customerId` 매핑

### 4.2 성공 콜백

**파일:** `frontend/src/app/billing/checkout/success/BillingCheckoutSuccessClient.tsx`

- [x] 쿼리 파라미터: `billingKey`, `paymentId`, `planCode`
- [x] confirm API body 형식 맞춤
- [x] Webhook 최종 처리 주석

### 4.3 실패 페이지

- [x] `BillingCheckoutFailClient` — `message` / `pgMessage` 쿼리 표시

### 4.4 변경 없음 확인

- [x] `/dashboard/settings/billing` — 수정 불필요
- [x] `BillingDisclosure`, middleware, D-day 배너 — 수정 불필요
- [x] `@tosspayments/tosspayments-sdk` 제거

---

## Phase 5 — 인프라·환경·약관

### 5.1 환경 파일

- [x] 루트 `.env.example` — 포트원 변수, 토스 변수 제거
- [x] `frontend/.env.example` — 동일
- [x] `docker-compose.yml` — env 치환

### 5.2 법적 문구

- [x] `frontend/src/content/legal/paid-service-v1.ts` — 포트원·연동 PG 문구

### 5.3 운영 문서 갱신

- [x] [`BILLING-PRODUCTION-GO-LIVE.md`](./BILLING-PRODUCTION-GO-LIVE.md)
- [x] [`BILLING-QA-CHECKLIST.md`](./BILLING-QA-CHECKLIST.md)
- [x] [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md)
- [x] [`MONETIZATION-WORK-SUMMARY.md`](./MONETIZATION-WORK-SUMMARY.md) — PG 섹션
- [x] [`MONETIZATION-IMPLEMENTATION-TODO.md`](./MONETIZATION-IMPLEMENTATION-TODO.md) — 포트원 전환 링크·PG 표기
- [x] [`MONETIZATION-REVIEW.md`](./MONETIZATION-REVIEW.md) — 1차 확정 PG portone

---

## Phase 6 — QA·스크립트·정리

### 6.1 자동 QA

- [x] `scripts/run-billing-qa.mjs` — 포트원 env·webhook URL·정적 검증 추가
- [x] `scripts/run-billing-manual-qa.mjs` — 포트원 문구·시크릿 mismatch Skip 처리
- [x] `npm run billing:qa` — **Pass 22 / Fail 0 / Skip 8** (2026-06-22)
- [x] `npm run billing:manual-qa` — **Pass 9 / Fail 0 / Skip 7** (2026-06-22)

### 6.2 수동 QA (포트원 테스트 키 필요)

- [ ] `/billing/checkout` — 빌링키 발급 + 1차 결제 — _포트원 키 발급 후_
- [ ] `/billing/checkout/success` — confirm 후 `active` 전환
- [ ] Strapi `subscription.pgBillingKey` 암호화 저장 확인
- [ ] `POST /api/billing/cron/run` — 갱신 1건 성공
- [ ] Webhook 수신 → `payment-history` 기록
- [ ] Admin 20% 할인 → 다음 청구액 반영
- [ ] `skipPgCharge` (0원) — PG 호출 없이 기간 연장
- [ ] 결제 실패 → `past_due` 전환

### 6.3 잔여 참조 제거

- [x] 코드·스크립트에 `TOSS_` / `tosspayments` / `lib/toss` 참조 없음
- [x] `billing:qa` 정적 검증 — Toss lib 제거·PortOne SDK 확인

---

## Phase 7 — 배포·Go-Live

- [ ] 포트원 콘솔 **라이브** 채널·키 발급
- [ ] 운영 env에 라이브 키 설정
- [ ] `PORTONE_WEBHOOK_SKIP_VERIFY=false`
- [ ] 포트원 콘솔 Webhook URL 등록
- [ ] 테스트 결제 1건 → 서버 로그 `webhook.payment_succeeded` 확인
- [ ] 외부 cron (`npm run billing:cron`) 스모크 테스트

---

## 파일별 체크리스트 (구현 시 빠른 참조)

| 작업 | 파일 |
|------|------|
| **삭제** | `frontend/src/lib/toss/*` |
| **삭제** | `frontend/src/app/api/billing/webhooks/toss/route.ts` |
| **신규** | `frontend/src/lib/portone/config.ts`, `server.ts` |
| **신규** | `frontend/src/app/api/billing/webhooks/portone/route.ts` |
| **수정** | `frontend/src/lib/billing/checkout.ts` |
| **수정** | `frontend/src/lib/billing/readiness.ts`, `readiness.test.ts` |
| **수정** | `frontend/src/app/billing/checkout/BillingCheckoutClient.tsx` |
| **수정** | `frontend/src/app/billing/checkout/success/BillingCheckoutSuccessClient.tsx` |
| **수정** | `frontend/src/app/api/billing/checkout/prepare/route.ts` |
| **수정** | `frontend/src/app/api/billing/billing-key/confirm/route.ts` |
| **수정** | `frontend/src/app/api/billing/cron/run/route.ts` |
| **수정** | `frontend/src/app/api/billing/health/route.ts` |
| **수정** | `backend/.../subscription/schema.json` |
| **수정** | `backend/src/services/subscription-billing.ts`, `subscription.ts` |
| **수정** | `frontend/src/content/legal/paid-service-v1.ts` |
| **수정** | `.env.example`, `frontend/.env.example`, `docker-compose.yml` |
| **수정** | `scripts/run-billing-qa.mjs`, `run-billing-manual-qa.mjs` |
| **수정** | `frontend/package.json` |
| **유지** | `backend/src/services/billing.ts`, `manager-access.ts`, internal API 전반 |
| **유지** | middleware, `/ops`, 구독 설정 UI |

---

## 권장 구현 순서

```
Phase 0 (포트원 계정·키)
    ↓
Phase 1 (lib/portone + 패키지)
    ↓
Phase 2 (Strapi pgProvider)
    ↓
Phase 3 BFF (prepare → confirm → checkout.ts)
    ↓
Phase 4 UI (checkout + success)
    ↓
Phase 3 Webhook + Cron
    ↓
Phase 5~6 (env·문서·QA)
    ↓
Phase 7 (Go-Live)
```

---

## 예상 일정 (참고)

| 구분 | 기간 |
|------|------|
| 코드 구현 (Phase 1~4) | 2~3일 |
| Webhook·Cron·QA (Phase 3 후반~6) | 1~2일 |
| 포트원 계약·채널 연동 (Phase 0, 병행) | 1~2주 |
| **합계** | 코드 3~5일 + 계약 병행 |

---

## 참고 링크

- [포트원 V2 빌링키 발급](https://developers.portone.io/opi/ko/integration/start/v2/billing/issue)
- [포트원 REST API V2 — 빌링키 결제](https://developers.portone.io/api/rest-v2/payment)
- [포트원 Webhook](https://developers.portone.io/opi/ko/integration/webhook)

---

*이 문서의 체크리스트를 구현하면서 완료 항목을 `[x]`로 갱신하세요.*
