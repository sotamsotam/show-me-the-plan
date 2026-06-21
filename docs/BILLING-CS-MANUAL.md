# Show Me The Plan — Billing CS 매뉴얼

> **대상:** 운영·고객지원  
> **관련 문서:** [`MONETIZATION-REVIEW.md`](./MONETIZATION-REVIEW.md), [`MONETIZATION-IMPLEMENTATION-TODO.md`](./MONETIZATION-IMPLEMENTATION-TODO.md)

---

## 1. 기본 정책 요약

| 항목 | 내용 |
|------|------|
| 과금 대상 | **학생** (`elementary` ~ `high`, `other`) |
| 매니저 | **항상 무료** (학생 구독 유효 시에만 관리) |
| 체험 | 가입 **14일**, **무카드** |
| 정가 | **월 4,900원** (`student_monthly`, VAT 포함) |
| PG | 토스페이먼츠 빌링키 자동결제 |

---

## 2. 운영 Admin (`/ops`) 할인 설정 (권장)

운영자 계정(`user-profile.isOperator = true`)으로 `/login` 후 **`/ops`** 접속:

1. **구독** → 해당 학생 선택 (`/ops/subscriptions/[userId]`)
2. **할인 편집** 폼 입력 → **미리보기**로 `resolveBillingAmount` 결과 확인
3. **저장** → `discountGrantedAt`, `discountGrantedBy`(운영자 이메일) 자동 기록

| 필드 | 설명 |
|------|------|
| `discountPercent` | 다음 청구부터 적용할 할인율 (예: 20) |
| `discountFixedAmount` | 정가에서 차감할 고정 금액 (원) |
| `overridePrice` | 정가 대신 고정 청구액 (원). 설정 시 percent보다 우선 |
| `discountStartsAt` / `discountEndsAt` | 할인 유효 기간 (비우면 즉시·무기한) |
| `discountApplyOnce` | `true`면 **1회 청구 후** 할인 필드 자동 제거 |
| `discountNote` | CS 메모 (내부용) |

**확인 방법**

1. `/ops`에서 저장 후 상세 화면의 **다음 청구**·**할인 설정 (현재)** 확인
2. 학생 계정 → **설정 → 구독 · 결제**에서 `다음 청구 예정액` 확인
3. Cron/수동 갱신 시 PG `amount`가 `resolveBillingAmount()` 결과와 일치하는지 확인

### 매니저 승인 (`/ops/managers/pending`)

`managerStatus = pending` 목록에서 **승인** / **거절** → Strapi lifecycle으로 `manager` 역할 동기화.

---

## 2-b. Strapi Admin 수동 할인 (비상·백업)

Strapi Admin → **Subscription** → 해당 학생 구독 레코드:

| 필드 | 설명 |
|------|------|
| `discountPercent` | 다음 청구부터 적용할 할인율 (예: 20) |
| `overridePrice` | 정가 대신 고정 청구액 (원). 설정 시 percent보다 우선 |
| `discountApplyOnce` | `true`면 **1회 청구 후** 할인 필드 자동 제거 |

**확인 방법**

1. Admin에서 값 저장
2. 학생 계정 → **설정 → 구독 · 결제**에서 `다음 청구 예정액` 확인
3. Cron/수동 갱신 시 PG `amount`가 `resolveBillingAmount()` 결과와 일치하는지 확인

---

## 3. 구독 수동 연장 (100% 할인 대체)

CS에서 “무료로 N개월 연장”이 필요할 때:

1. `overridePrice = 0` 또는 `discountPercent = 100` 설정
2. `discountApplyOnce = true` (1회만 적용 시)
3. 또는 internal API `grant-free-period` 호출 (BFF cron/운영 스크립트)

**주의:** 0원 청구는 PG 호출을 생략(`skipPgCharge`)하고 Strapi에서 기간만 연장합니다.

---

## 4. 0원 청구 / discountApplyOnce 시나리오

| 시나리오 | 동작 |
|----------|------|
| `overridePrice = 0` | PG 없이 기간 연장, payment-history에 0원 기록 |
| `discountPercent = 100` | billedAmount 0 → PG 생략 |
| `discountApplyOnce = true` | 1회 적용 후 `discountPercent`/`overridePrice` 초기화 |

---

## 5. 환불 (1차 — 수동)

1. 토스페이먼츠 관리자에서 **환불 처리**
2. Strapi **payment-history** 상태 수동 반영 (또는 2차 Admin UI)
3. 필요 시 subscription `currentPeriodEnd` 조정 / `status` 변경
4. 학생·매니저 접근은 `hasActiveSubscription` / `isAccessAllowed` 기준으로 자동 반영

---

## 6. 자주 받는 문의

### “체험이 끝났는데 로그인은 되는데 대시보드가 안 열려요”

- 정상 동작(Hard block). `/billing/expired` 또는 **설정 → 구독 · 결제**에서 재구독 안내

### “매니저인데 학생 TODO가 안 보여요”

- 연결된 **학생 구독 만료** 가능성 → 학생 목록 `만료 — 관리 불가` 배지 확인

### “해지했는데 당장 끊기나요?”

- **해지 예약** = 현재 기간 종료일까지 이용 가능 (`cancelAtPeriodEnd`)

---

## 7. 운영 체크리스트

- [ ] `npm run billing:health` → `"ready": true`
- [ ] Cron: `npm run billing:cron` 또는 OS 스케줄러 (일 1회 이상)
- [ ] Webhook: `TOSS_WEBHOOK_SKIP_VERIFY=false` (운영)
- [ ] 결제 실패 로그: `[billing] webhook.*` / `[billing] cron.*` 서버 로그

---

*법무·환불 정책 확정 후 본 문서를 갱신합니다.*
