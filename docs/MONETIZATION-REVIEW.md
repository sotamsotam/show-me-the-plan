# Show Me The Plan — 유료화(구독) 종합 검토

> **문서 목적:** Show Me The Plan 서비스를 구독형 유료 모델로 전환하기 위해 필요한 기능, 아키텍처, PG 연동, 운영·법적 검토사항을 종합 정리한다.  
> **작성 기준일:** 2026-06-20 (정책 확정·1차 범위 반영: 2026-06-20)  
> **현재 상태:** PoC 단계, 결제·구독 코드 없음, 모든 가입 사용자 동일 권한

---

## 목차

0. [확정 비즈니스 정책](#0-확정-비즈니스-정책)
1. [현황 요약](#1-현황-요약)
2. [과금 대상·사용자 유형 정의](#2-과금-대상사용자-유형-정의)
3. [구독 모델 설계](#3-구독-모델-설계)
4. [매니저–학생 구독 연동 규칙](#4-매니저학생-구독-연동-규칙)
5. [PG(결제대행) 연동 검토](#5-pg결제대행-연동-검토)
6. [시스템 아키텍처 제안](#6-시스템-아키텍처-제안)
7. [데이터 모델 설계](#7-데이터-모델-설계)
8. [구독 생명주기·접근 제어](#8-구독-생명주기접근-제어)
9. [관리자(Admin) 기능 요구사항](#9-관리자admin-기능-요구사항)
10. [프론트엔드·UX 요구사항](#10-프론트엔드ux-요구사항)
11. [법적·정책 검토사항](#11-법적정책-검토사항)
12. [운영·인프라 검토사항](#12-운영인프라-검토사항)
13. [가격·상품 전략 검토](#13-가격상품-전략-검토)
14. [구현 로드맵(권장 단계)](#14-구현-로드맵권장-단계)
15. [리스크·미결정 사항](#15-리스크미결정-사항)
16. [체크리스트](#16-체크리스트)

---

## 0. 확정 비즈니스 정책

> 아래 항목은 **확정**되었으며, 이후 설계·구현은 이 정책을 기준으로 한다.

| 항목 | 확정 내용 |
|------|-----------|
| **과금 대상** | **학생 계정만** 유료 — `elementary`, `middle`, `high`, `other` |
| **매니저 과금** | **항상 무료** — `manager` 계정은 구독·결제 없음 |
| **기능 차등** | **Free / Pro 티어 없음** — 유효 구독(또는 체험) 기간 동안 **전 기능 제공** |
| **신규 가입 체험** | **첫 회원가입 시 2주(14일) 무료 체험** — **카드 등록 없음** (체험 종료 후 결제 유도) |
| **월간 요금** | **4,900원 (VAT 포함)** — `student_monthly` |
| **PG** | **토스페이먼츠** (Phase 2 연동) |
| **매니저–학생 구독** | **서로 무관** — 매니저 구독 상태는 학생 접근에 영향 없음 |
| **매니저 연결 조건** | 학생이 **유효 구독(체험 포함) 상태**일 때 매니저를 연결하면, 해당 매니저가 그 학생을 관리 가능 |
| **학생 만료 시 매니저** | 학생 구독·체험이 **만료**되면, 연결된 매니저는 **해당 학생을 더 이상 관리할 수 없음** |
| **회원별 수동 할인** | **1차 구현 포함** — Admin이 특정 학생 구독에 할인율·할인가를 수동 설정, PG 청구 시 반영 |

---

## 1. 현황 요약

### 1.1 기술 스택

| 계층 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router), NextAuth v4 |
| Backend | Strapi 5.3, users-permissions |
| DB | PostgreSQL 16 |
| 배포 | Docker Compose + Caddy |

### 1.2 현재 사용자 구분 (이미 존재)

| 구분 | 필드/역할 | 유료화 적용 |
|------|-----------|-------------|
| **학생 (NEIS)** | `schoolLevel`: elementary / middle / high | ✅ 구독·체험·결제 대상 |
| **기타 학생** | `schoolLevel`: other | ✅ 구독·체험·결제 대상 |
| **매니저** | `schoolLevel`: manager + Strapi `manager` 역할 | ❌ 항상 무료 |
| **매니저 승인** | `managerStatus`: pending / approved / rejected | Admin 승인 흐름 (코드·문서 일부 불일치 존재) |
| **시스템 역할** | Strapi role: public / authenticated / manager | API 권한 기준 |

### 1.3 현재 없는 것

- 결제·구독 관련 코드, DB 필드, 의존성
- 구독 만료 시 접근 차단 로직
- 매니저 접근 시 **학생 구독 상태** 검증
- 청구·영수증·구독 관리 UI
- PG Webhook 처리

### 1.4 유료화에 유리한 기존 기반

- NextAuth + Strapi JWT 기반 인증 (세션에 구독 상태 주입 가능)
- BFF 패턴 (`frontend/src/app/api/*` → Strapi) — 결제 검증을 BFF에서 중앙 집중 가능
- `user-profile` 1:1 모델 — 구독 메타데이터 확장 용이
- `manager-access.ts` — 매니저→학생 대리 접근 검증 (여기에 **학생 구독 유효성** 추가하면 됨)
- 약관·개인정보·14세 미만 보호자 동의 이미 구현 (`termsAgreedAt`, `guardianConsentConfirmedAt` 등)
- 계정 탈퇴·연쇄 삭제 로직 존재 (`account-deletion.ts`)
- Strapi Admin — 사용자·역할 관리 UI 기반

---

## 2. 과금 대상·사용자 유형 정의

### 2.1 과금 주체 (확정)

| 사용자 유형 | schoolLevel | 결제 | 서비스 이용 |
|-------------|-------------|------|-------------|
| 초등학생 | `elementary` | ✅ | 구독 또는 14일 체험 중 전 기능 |
| 중학생 | `middle` | ✅ | 동일 |
| 고등학생 | `high` | ✅ | 동일 |
| 기타학생 | `other` | ✅ | 동일 |
| 매니저 | `manager` | ❌ 무료 | 학생 구독 유효 시에만 담당 학생 관리 |

**결제 주체:** 학생 계정 소유자(본인 또는 법정대리인이 학생 계정에서 결제 등록).  
매니저 계정으로는 결제 UI·구독 관리를 제공하지 않는다.

### 2.2 기능 제공 방식 (확정)

- **기능 티어 없음:** 유효 구독(`trialing` | `active`) 또는 체험 기간 동안 앱의 **모든 기능** 사용 가능.
  - NEIS 시간표, 개인 일정·TODO, 주차별 계획(시험/방학/평소), 템플릿, Excel import, 통계, 매니저 연결 등 **제한 없음**.
- **만료 후:** 학생은 대시보드 사용 차단(정책은 §8.2 참고). 기능별 부분 잠금은 **하지 않음**.

### 2.3 사용자 리스트 관리 요구사항

Admin(Strapi 또는 전용 관리 화면)에서 아래를 **필터·검색·내보내기** 가능해야 한다.

| 컬럼 | 출처 | 비고 |
|------|------|------|
| 사용자 ID, username, email | `up_users` | |
| 가입 유형 | `user_profiles.schoolLevel` | manager는 구독 컬럼 N/A |
| 매니저 승인 상태 | `user_profiles.managerStatus` | manager만 |
| Strapi 역할 | role.type | |
| 구독 상태 | `subscription.status` | **학생만** |
| 체험 사용 여부 | `trialUsed` / `trialing` 이력 | **최초 1회 14일** |
| 구독 시작·만료일 | `currentPeriodStart`, `currentPeriodEnd` | 학생만 |
| 결제 수단(마스킹) | PG customerId / card last4 | 학생만 |
| 최근 결제일·금액 | payment history | 학생만 |
| 할인율 / 할인가 | `subscription.discount*` | Admin 수동 설정 |
| 실청구 예정액 | `resolveBillingAmount()` | plan.price − 할인 |
| 연결 매니저 수 (학생) | assignment count | |
| 관리 가능 학생 수 (매니저) | assignment 중 **학생 구독 유효**인 건수 | 실시간 계산 |
| 연결만 있으나 만료 학생 수 (매니저) | assignment 있으나 학생 expired | CS·UX 참고 |

**필터 예:**

- `schoolLevel IN (elementary,middle,high,other) AND status=trialing`
- `schoolLevel IN (...) AND currentPeriodEnd < 7일`
- `schoolLevel=manager` — 구독 필터 불필요

---

## 3. 구독 모델 설계

### 3.1 단일 학생 구독 + 14일 체험

| 단계 | 상태 | 기간 | 기능 |
|------|------|------|------|
| **신규 가입** | `trialing` | 가입일 + **14일** | 전 기능 (매니저 연결 포함) |
| **체험 종료 전 결제** | `active` | 결제 주기(월/년) | 전 기능 |
| **체험 종료·미결제** | `expired` | — | 학생 사용 차단, 매니저 해당 학생 관리 불가 |
| **결제 실패** | `past_due` → `expired` | grace 기간 후 | 동일 |

**체험 규칙:**

- **계정당 1회** — `trialUsedAt` 또는 `hasUsedTrial` 플래그로 재가입·중복 체험 방지 검토
- 체험 중에도 매니저 연결·관리 **허용**
- 체험 종료 시점에 카드 등록·자동 전환 여부는 PG 연동 방식에 따름 (§5, §11)

### 3.2 구독 주기 (미확정 — 가격 정책)

| 주기 | 비고 |
|------|------|
| 월간 | 진입 장벽 낮음 |
| 연간 | 할인율은 별도 결정 (예: 2개월분 할인) |

학생 유형(elementary / middle / high / other)별 **요금 차등 여부**는 미확정 — 초기에는 단일 요금제 권장.

### 3.3 만료·환불 등 운영 케이스

| 케이스 | 처리 방안 |
|--------|-----------|
| 체험 14일 종료, 미결제 | `expired` — 학생 차단, 연결 매니저 관리 불가 |
| 유료 구독 만료 | 동일 |
| 매니저 탈퇴 | 학생 데이터·구독은 학생 계정에 유지 |
| 학생 탈퇴 | 기존 `account-deletion.ts` — assignment·구독·결제 기록 정책 정의 |
| 환불 | PG·전자상거래법에 따른 환불 정책 문서화 |
| 만료 후 데이터 | §8.2 — 읽기 전용 vs 완전 차단 중 선택 필요 |

### 3.4 회원별 수동 할인 (1차 구현 ✅)

표준 `plan.price`와 별도로, **특정 학생 구독**에 Admin이 할인을 수동 적용한다. CS·이벤트·VIP 대응용이며, 쿠폰 코드(셀프 입력)는 **1차 범위 외** (2차 검토).

**적용 방식 (택1, Admin UI에서 설정):**

| 방식 | 필드 | 예 |
|------|------|-----|
| 정률 할인 | `discountPercent` | 20 → 20% 할인 |
| 정액 할인 | `discountFixedAmount` | 3000 → 3,000원 차감 |
| 최종 청구가 고정 | `overridePrice` | 4900 → 무조건 4,900원 (plan.price 무시) |

**청구 금액 계산 (`resolveBillingAmount`):**

```text
1. base = plan.price
2. overridePrice 있으면 → billed = overridePrice
3. 아니면 discountPercent 적용 → billed = round(base × (1 - percent/100))
4. discountFixedAmount 추가 차감 → billed = max(0, billed - fixed)
5. billed = 0 이면 PG 청구 생략, currentPeriodEnd만 연장 (Admin·Cron 공통)
```

**할인 유효 기간:**

| 필드 | 설명 |
|------|------|
| `discountStartsAt` | null이면 즉시 |
| `discountEndsAt` | null이면 무기한(매 갱신마다 적용) |
| `discountApplyOnce` | true면 **다음 1회 청구만** 할인 (이후 자동 해제) |

**감사·CS:**

| 필드 | 설명 |
|------|------|
| `discountNote` | "2026 여름 이벤트", "장애 보상" |
| `discountGrantedAt` | 설정 시각 |
| `discountGrantedBy` | Admin user id / email |

**규칙 (1차):**

- 할인 대상: **학생 subscription만** (매니저 과금 없음)
- `trialing` 중 PG 첫 결제·이후 갱신 모두 동일 로직
- 할인 중복: `overridePrice` > 정률 > 정액 순 우선 (동시 입력 시 UI에서 하나만 허용 권장)
- `payment-history`에 `planPrice`, `discountAmount`, `billedAmount` 기록 (영수증·정산)

---

## 4. 매니저–학생 구독 연동 규칙

### 4.1 원칙 (확정)

```
매니저 구독 상태 ──(무관)──▶ 매니저 기능
학생 구독 상태 ──(필수)──▶ 학생 본인 사용
학생 구독 상태 ──(필수)──▶ 매니저의 해당 학생 관리
```

- 매니저는 **무료**이므로 `subscription` 레코드가 없거나, 있더라도 **접근 제어에 사용하지 않음**.
- `student_manager_assignment`가 `active`여도, **학생의 구독이 유효하지 않으면** 매니저 API는 403.

### 4.2 시나리오별 동작

| # | 학생 구독 | assignment | 학생 본인 | 매니저 |
|---|-----------|------------|-----------|--------|
| 1 | trialing / active | 없음 | ✅ 전 기능 | — |
| 2 | trialing / active | active | ✅ | ✅ 해당 학생 관리 |
| 3 | expired | active (연결 유지) | ❌ 차단 | ❌ 해당 학생 관리 불가 |
| 4 | trialing → expired | active | ❌ | ❌ (연결은 DB에 남을 수 있음, UI에 “구독 만료” 표시) |
| 5 | expired → 재구독 active | active | ✅ | ✅ 자동으로 관리 재개 |

**연결(assignment) 자동 해제 vs 유지:**  
정책상 **assignment는 유지**하고, 접근만 막는 방식 권장 — 학생이 재결제하면 매니저가 다시 관리 가능(재연결 UX 불필요).

### 4.3 구현: `manager-access.ts` 확장

현재 `resolveTargetUserId`는 다음만 검사한다:

1. 요청자가 approved manager인가
2. `student_manager_assignment`가 active인가

**추가 필요:**

3. 대상 **학생**의 구독 상태가 `trialing` 또는 `active`이고 `currentPeriodEnd > now`인가

```typescript
// 개념 (backend/src/services/manager-access.ts)
async function isStudentSubscriptionActive(
  strapi: Core.Strapi,
  studentUserId: number
): Promise<boolean> {
  // subscription 조회: status in (trialing, active) && currentPeriodEnd > now
}

// resolveTargetUserId 내 assigned 확인 후:
if (!await isStudentSubscriptionActive(strapi, studentUserId)) {
  return { error: '학생의 구독이 만료되어 관리할 수 없습니다.', status: 403 };
}
```

**매니저 UI:**

- 학생 목록에서 구독 만료 학생은 “구독 만료 — 관리 불가” 배지
- 만료 학생 상세·TODO·일정 API 호출 불가

**학생 UI — 매니저 추가:**

- 구독 유효(`trialing` | `active`)일 때만 매니저 검색·추가 허용 (선택: 만료 상태에서는 “구독 갱신 후 이용 가능” 안내)

---

## 5. PG(결제대행) 연동 검토

### 5.1 국내 PG 후보 비교

| PG/솔루션 | 구독(정기결제) | Strapi/Next 연동 | 특징 |
|-----------|----------------|------------------|------|
| **토스페이먼츠** | ✅ 빌링키(자동결제) | REST API, SDK | 국내 B2C 많이 사용, 문서 양호 |
| **PortOne(구 아임포트)** | ✅ | 통합 SDK, 여러 PG | PG 추상화, 초기 연동 빠름 |
| **나이스페이** | ✅ | REST | 전통 PG |
| **Stripe** | ✅ Subscription | 공식 SDK 우수 | 해외 확장 시 유리, 국내 사업자·정산 검토 필요 |

**1차 확정:** **토스페이먼츠** (구현 TODO: [`MONETIZATION-IMPLEMENTATION-TODO.md`](./MONETIZATION-IMPLEMENTATION-TODO.md))

### 5.2 구독 결제 흐름 (학생 계정 기준)

```
1. 학생 가입 → subscription status=trialing, currentPeriodEnd=가입+14일 (결제 수단 없음)
2. 체험 중 또는 종료 전 → 학생 /billing 에서 요금제·카드 등록
3. Frontend → PG 결제창 (카드 등록 + 1회 결제 또는 0원 인증)
4. Backend → billingKey 저장 (학생 userId에만)
5. 체험 종료일 또는 결제 주기마다 `resolveBillingAmount(subscription)` 으로 금액 산출 후 PG 자동 청구
6. Webhook → trialing→active 또는 active 기간 연장 (`payment-history`에 할인 내역 저장)
7. 실패 → past_due → grace → expired (학생·매니저 접근 차단)
```

**매니저 계정:** 위 흐름 **전체 생략**.

### 5.3 Webhook 필수 이벤트

| 이벤트 | 액션 |
|--------|------|
| `payment.succeeded` | `currentPeriodEnd` 연장, status = active |
| `payment.failed` | status = past_due, **학생** 이메일 알림 |
| `subscription.canceled` | 갱신 중단, period end까지 trialing/active 유지 |
| `billing_key.deleted` | 갱신 불가, 만료일까지 사용 후 expired |

### 5.4 정산·사업자 요건

- 통신판매업 신고, PG 계약 (사업자등록증 등)
- 디지털 서비스 VAT 표시 방식
- B2C 카드 매출 중심 (매니저 과금 없음 → B2B 세금계산서 1차 범위 외)

---

## 6. 시스템 아키텍처 제안

```
[브라우저]
    │
    ▼
[Next.js BFF]
    ├── /api/billing/*        ← PG·Webhook (학생 세션만 결제 API)
    ├── /api/subscription/*   ← 구독 조회 (학생); 매니저는 조회 불필요
    └── 기존 /api/*           ← 학생: 구독 검증 / 매니저: 학생 구독 검증
    │
    ▼
[Strapi 5]
    ├── subscription (학생 user만)
    ├── payment-history
    ├── plan (학생 대상 요금제)
    ├── billing.ts — resolveBillingAmount, runStudentBilling (할인 반영)
    └── manager-access + subscription-check
    │
    ▼
[PostgreSQL] ──▶ [PG]
```

### 6.1 접근 제어 레이어

| 레이어 | 학생 | 매니저 |
|--------|------|--------|
| **UI** | 만료 시 `/billing` 유도 | 만료 학생 목록 비활성·배지 |
| **BFF** | 본인 API: 구독 유효 필수 | `studentUserId` 요청: **해당 학생** 구독 유효 필수 |
| **Strapi** | create/update 정책 | `resolveTargetUserId` + 학생 구독 검증 |

> 기능별 entitlement 분기 **없음** — `hasActiveSubscription(userId)` 단일 boolean으로 충분.

### 6.2 세션에 구독 정보 포함

```typescript
// 학생 세션 (frontend/src/lib/auth.ts)
session.subscription = {
  status: 'trialing' | 'active' | 'past_due' | 'expired' | ...,
  currentPeriodEnd: '2026-07-04T00:00:00Z',
  isAccessAllowed: true, // trialing | active && periodEnd > now
  trialEndsAt: '...',     // trialing일 때
};

// 매니저 세션 — subscription 필드 없음 (또는 null)
```

`middleware.ts`:

- **학생** `/dashboard/*`: `isAccessAllowed === false` → `/billing/expired`
- **매니저** `/dashboard/*`: 구독 검사 **하지 않음** (학생별 API에서 검증)

### 6.3 Cron / 배치

| 작업 | 주기 | 설명 |
|------|------|------|
| 만료 처리 | 매일 | `currentPeriodEnd < now` → expired |
| 체험 종료 3일·1일 전 알림 | 매일 | 학생 이메일 |
| past_due 재시도·알림 | 매일 | 학생 대상 |
| (선택) 만료 학생의 매니저 알림 | 매일 | “담당 학생 ○○ 구독 만료” |

---

## 7. 데이터 모델 설계

### 7.1 `plan` — 학생 요금제 (Admin)

| 필드 | 타입 | 설명 |
|------|------|------|
| code | string (unique) | `student_monthly`, `student_yearly` |
| name | string | 표시명 |
| targetSchoolLevels | json | `["elementary","middle","high","other"]` — **manager 제외** |
| price | integer | 원화 |
| interval | enum | month / year |
| active | boolean | 판매 중 |

> `entitlements` 필드 **불필요** (기능 차등 없음).  
> 체험 14일은 plan이 아닌 **가입 시 subscription 생성 로직**에서 처리.

### 7.2 `subscription` — 학생만

| 필드 | 타입 | 설명 |
|------|------|------|
| user | relation → up_users | **1:1**, schoolLevel이 학생인 경우만 생성 |
| plan | relation → plan | 체험 중 null 가능, 결제 후 설정 |
| status | enum | trialing, active, past_due, canceled, expired |
| trialStartedAt | datetime | 최초 체험 시작 |
| hasUsedTrial | boolean | 재체험 방지 |
| pgProvider | enum | toss / portone / … |
| pgCustomerId | string | |
| pgBillingKey | string | 암호화 저장 |
| currentPeriodStart | datetime | |
| currentPeriodEnd | datetime | **학생·매니저 접근 공통 기준(학생 ID 기준)** |
| cancelAtPeriodEnd | boolean | |
| canceledAt | datetime | |
| **할인 (1차)** | | Admin 수동, nullable |
| discountPercent | integer | 0–100, 정률 |
| discountFixedAmount | integer | 원, 정액 |
| overridePrice | integer | 최종 청구가 고정 |
| discountStartsAt | datetime | 할인 시작 (null=즉시) |
| discountEndsAt | datetime | 할인 종료 (null=무기한) |
| discountApplyOnce | boolean | true=1회 청구만 |
| discountNote | string | CS 메모 |
| discountGrantedAt | datetime | |
| discountGrantedBy | string | Admin 식별 |

**가입 시 (학생 register):**

```text
status = trialing
trialStartedAt = now
currentPeriodStart = now
currentPeriodEnd = now + 14 days
hasUsedTrial = true
plan = null
```

**매니저 가입:** subscription 레코드 **생성하지 않음**.

### 7.3 `payment-history`

| 필드 | 타입 | 설명 |
|------|------|------|
| subscription | relation | |
| planPrice | integer | 할인 전 정가 |
| discountAmount | integer | planPrice − billedAmount |
| amount | integer | **실청구액** (billedAmount, PG 전송값) |
| currency | string (KRW) | |
| status | succeeded / failed / refunded | |
| pgPaymentId | string (unique) | |
| paidAt | datetime | |
| receiptUrl | string | 할인 적용가 표시 |
| discountSnapshot | json | 청구 시점 할인 필드 스냅샷 (감사) |

### 7.4 인덱스

- `subscription.user` (unique)
- `subscription.status`, `subscription.currentPeriodEnd`
- `payment-history.pgPaymentId` (unique)

---

## 8. 구독 생명주기·접근 제어

### 8.1 상태 전이도

```
[학생 가입]
     │
     ▼
┌─────────────┐
│  trialing   │  ← 14일, 전 기능, 매니저 연결 가능
└──────┬──────┘
       │ 기간 내 결제 성공
       ▼
┌─────────────┐     해지 예약      ┌──────────┐
│   active    │ ─────────────────▶│ canceled │ (period end까지 active)
└──────┬──────┘                   └──────────┘
       │ 결제 실패
       ▼
┌─────────────┐
│  past_due   │  grace 3~7일 (미확정)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  expired    │  ← 학생 차단 + 매니저 해당 학생 관리 불가
└─────────────┘

trialing ──(14일 경과, 미결제)──▶ expired
```

### 8.2 학생 만료 시 접근 정책 (미확정)

| 정책 | 동작 | 비고 |
|------|------|------|
| **Hard block (권장)** | dashboard 전체 차단, `/billing`만 허용 | 기능 티어 없으므로 단순 |
| **Soft block** | 조회만, 수정 불가 | 구현 복잡도↑, 이점 적음 |

### 8.3 구현 포인트

| 파일 | 변경 |
|------|------|
| `user-profile` register | 학생 가입 시 subscription(trialing) 생성 |
| `frontend/src/middleware.ts` | 학생만 구독 검사 |
| `frontend/src/lib/auth.ts` | 학생 세션에 subscription |
| `backend/src/services/manager-access.ts` | **학생 구독 유효성** 검사 추가 |
| `backend/src/api/user-profile/controllers/*` | `addMyManager`: 학생 구독 유효 시만 |
| `frontend/src/components/*Guard*` | 학생 DashboardAccessGuard + 체험 D-day 배너 |

---

## 9. 관리자(Admin) 기능 요구사항

### 9.1 Strapi Admin (1차)

- Plan CRUD (학생 요금제만)
- Subscription 목록 (**schoolLevel ≠ manager** 필터 기본)
- 체험 중·만료 임박·**할인 적용 중** 학생 필터
- **회원별 수동 할인** — Subscription 편집 화면에서 `discountPercent` / `discountFixedAmount` / `overridePrice`, 기간, 메모, `discountApplyOnce` 설정 (Super Admin)
- 할인 적용 시 **실청구 예정액** 미리보기 (`resolveBillingAmount` 표시)
- Payment history (정가·할인·실청구액 컬럼)
- 매니저 계정: 구독 없음 표시, “관리 중인 학생 / 구독 유효 학생” 집계

### 9.2 CS·운영 (1차 포함 + 2차)

| 기능 | 단계 | 용도 |
|------|------|------|
| **회원별 수동 할인** | **1차** | 이벤트·VIP·개별 CS |
| **학생 구독 수동 연장** | **1차** | 100% 할인과 동일 효과 (`currentPeriodEnd` 연장) |
| `discountApplyOnce` 1회 할인 | **1차** | 첫 결제만 프로모 |
| 청구액 0원 처리 | **1차** | PG 생략 + 기간 연장 |
| 체험 14일 재부여 | 2차 | 예외 CS (`hasUsedTrial` override) |
| 환불 기록 | 2차 | PG 환불 후 sync |
| past_due 학생 리스트 | 2차 | 독촉 |
| 쿠폰·프로모 코드 (셀프 입력) | 2차 | 대량 프로모 |

---

## 10. 프론트엔드·UX 요구사항

### 10.1 신규 화면 (학생 전용)

| 화면 | 경로 | 대상 |
|------|------|------|
| 요금 안내 | `/pricing` | 학생 마케팅 |
| 결제·카드 등록 | `/billing/checkout` | **학생만** |
| 구독·체험 관리 | `/dashboard/settings/billing` | **학생만** — 정가·할인 적용가·다음 청구액 표시 |
| 결제 내역 | `.../billing/history` | **학생만** |
| 만료 안내 | `/billing/expired` | **학생만** |

매니저 설정 화면: 구독 UI **없음**. 담당 학생 목록에 구독 상태 표시.

### 10.2 마케팅 문구

- CTA 예: **“14일 무료 체험 시작”** / “가입 후 2주 무료, 이후 월 ○○원”
- `frontend/src/content/marketing/for-students.ts`, `elementary.ts` 등 반영
- 학부모 페이지(`for-parents.ts`): **매니저는 무료**, 학생 계정 구독 필요 명시

### 10.3 UX 원칙

- 가입 직후: “체험 ○일 남음” 배너 (학생)
- 체험 **3일·1일·당일** 알림 + 결제 유도
- 유료 갱신 **7일·1일 전** 알림
- 매니저: 담당 학생 만료 시 이메일(선택) + 앱 내 알림

---

## 11. 법적·정책 검토사항

### 11.1 약관·고지

| 문서 | 내용 |
|------|------|
| 이용약관 | 학생 구독, 14일 체험, 자동갱신, 해지, 환불 |
| 유료서비스 약관 | **학생 계정 대상** 명시, 매니저 무료 명시 |
| 체험 고지 | 가입 시 14일 무료, 이후 유료 전환 조건 |
| 개인정보처리방침 | PG 위탁 |
| 결제·영수증 | 정가, 할인액, **실결제액** 구분 표시 (Admin 수동 할인 포함) |

### 11.2 미성년자 결제

- 학생 계정이 결제 주체 → **법정대리인 동의** 필수 (`guardianConsentConfirmedAt` 연계)
- 초등·중등 저학년: 보호자 대리 결제 UX 검토

### 11.3 체험 + 자동결제

- 체험 종료 후 **자동 청구** 시 사전 고지 (카드 등록 시점 고지 문구)
- 무카드 14일 체험만 제공 시 체험 종료 후 Hard block → 결제 페이지 유도 (법무 리스크 낮음)

---

## 12. 운영·인프라 검토사항

- billingKey 암호화, Webhook 서명 검증
- PG reconcile 배치
- 지표: 활성 학생 구독 수, trialing→active 전환율, churn, MRR (**매니저 제외**)
- Brevo: 체험 만료·결제 실패·갱신 알림 (학생 email)
- Admin 할인 변경 감사: `discountGrantedBy`, `discountSnapshot` (분쟁·CS 추적)

---

## 13. 가격·상품 전략 검토

- **단일 학생 구독** (초·중·고·기타 동일가 vs 학교급별 차등 — 미확정)
- **14일 체험**으로 onboarding — 기능 제한 없이 가치 체험
- **매니저 무료** — 학부모·코치 유입 장벽 제거, 학생 구독 전환에 집중
- 벤치마크: 월 3,000~9,900원 구간 (참고)

---

## 14. 구현 로드맵(권장 단계)

### Phase 0 — 의사결정 ✅ 대부분 완료

- [x] 과금 주체: **학생만**, 매니저 무료
- [x] 기능: **티어 없음**, 전 기능 제공
- [x] 체험: **가입 14일**
- [x] 매니저–학생: **학생 구독에 연동**
- [x] 회원별 수동 할인: **1차 포함**
- [x] PG사: **토스페이먼츠**
- [x] 월간 가격: **4,900원 (VAT 포함)**
- [x] 체험: **14일, 카드 등록 없음**
- [ ] 연간 요금·환불·grace period
- [x] 만료 후 **Hard block** — dashboard 차단, billing 예외 (Phase 3 구현)
- [x] 약관·유료서비스 페이지 배포 (`/legal/*`) — 법무 검토 별도

### Phase 1 — 데이터·Admin (2~3주) ✅ 구현 완료 (2026-06-20)

- [x] `subscription` (학생 가입 시 trialing 자동 생성)
- [x] `plan`, `payment-history` (planPrice / discountAmount / amount)
- [x] **할인 필드** on subscription
- [x] **`resolveBillingAmount(subscription)`** 서비스
- [x] **`hasActiveSubscription(userId)`** 서비스
- [x] `GET /api/plans/active`, `GET /api/subscriptions/me`
- [x] bootstrap: plan seed (4900원), 기존 학생 backfill, 만료 cron
- [x] `manager-access` · `addMyManager` · account `/me` 구독 연동
- [x] Admin **실청구 예정액** UI — `/ops` 할인 미리보기 (Ops-2)

### Phase 2 — PG ✅ 구현 완료 (2026-06-20)

- [x] 학생 빌링키·Webhook (Next.js BFF)
- [x] Cron: 갱신 시 **`resolveBillingAmount` → PG 청구** (`/api/billing/cron/run`)
- [x] trialing → active / expired 전환
- [x] `discountApplyOnce` — 1회 청구 후 할인 필드 자동 초기화

### Phase 3 — 접근 제어·UI ✅ 구현 완료 (2026-06-20)

- [x] 학생 middleware·billing UI (할인 적용가·다음 결제액 표시)
- [x] `manager-access.ts` 학생 구독 검증
- [x] 매니저 UI: 만료 학생 표시
- [x] 체험 D-day 배너

### Phase 4 — 운영·법무 ✅ 코드·문서 (2026-06-20)

- [x] 약관·결제 고지·CS 매뉴얼·QA 체크리스트·프로덕션 가이드
- [ ] **수동 QA** · **라이브 키 전환** (배포 시)
- [ ] 이메일 알림 — **보류**

**총 예상:** 7~10주 (Phase 0 잔여·PG 심사·수동 QA 별도)

---

## 15. 리스크·미결정 사항

| 항목 | 상태 | 비고 |
|------|------|------|
| 과금 주체 | ✅ 확정 | 학생만 |
| 기능 티어 | ✅ 확정 | 없음 |
| 체험 14일 | ✅ 확정 | |
| 매니저–학생 | ✅ 확정 | 학생 구독 연동 |
| 회원별 수동 할인 | ✅ 1차 포함 | Admin + resolveBillingAmount |
| 쿠폰 코드 (셀프) | 2차 | 1차는 Admin 수동만 |
| 체험 시 카드 등록 필수 여부 | ✅ 확정 | **무카드** 14일 체험 |
| grace period 일수 | ⏳ 미정 | past_due |
| 만료 후 Hard block | ✅ 확정 | dashboard 차단, billing 예외 |
| 학교급별 요금 차등 | ⏳ 미정 | |
| assignment 유지 vs 만료 시 해제 | ✅ 권장 | 유지 + 접근만 차단 |
| 매니저 approved 즉시 vs Admin 승인 | ⏳ 코드 정합 | 스팸 매니저 |
| Webhook 누락 | 리스크 | reconcile + periodEnd expire |

---

## 16. 체크리스트

### 비즈니스 ✅ / ⏳

- [x] 과금: 학생만, 매니저 무료
- [x] 기능 티어 없음, 14일 체험
- [x] 매니저 접근 = 학생 구독 유효
- [x] 회원별 Admin 수동 할인 (1차 범위)
- [ ] 월/년 가격
- [ ] 환불·체험 후 자동결제 고지
- [ ] PG·통신판매업

### 기술

- [ ] 학생 가입 → subscription trialing
- [ ] `hasActiveSubscription` + manager-access 연동
- [ ] PG + Webhook + Cron
- [ ] 학생 BFF·middleware 차단
- [ ] Admin 학생 구독 리스트 + **수동 할인**
- [ ] `resolveBillingAmount` + 0원 청구 처리
- [ ] payment-history 할인 스냅샷

### UX·법무

- [ ] 학생 billing UI (매니저 제외)
- [ ] “14일 무료 체험” 마케팅
- [ ] 미성년자·보호자 결제 동의
- [ ] 체험/만료/갱신 이메일
- [ ] billing UI·영수증에 할인 내역 표시

---

## 부록 A — 참고 파일

| 영역 | 경로 |
|------|------|
| 프로젝트 개요 | `docs/PROJECT-OVERVIEW.md` |
| 인증 | `frontend/src/lib/auth.ts` |
| 미들웨어 | `frontend/src/middleware.ts` |
| 사용자 타입 | `frontend/src/types/school.ts` |
| 프로필 스키마 | `backend/src/api/user-profile/content-types/user-profile/schema.json` |
| 매니저 권한 | `backend/src/services/manager-access.ts` |
| 회원가입 | `backend/src/api/user-profile/controllers/user-profile.ts` |
| 마케팅 | `frontend/src/content/marketing/for-students.ts`, `for-parents.ts` |

---

## 부록 B — 접근 판단 헬퍼 (구현용)

기능별 entitlement **없음**. 아래 두 함수면 충분하다.

```typescript
/** 학생 본인 대시보드·API */
function isStudentAccessAllowed(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  const now = new Date();
  if (subscription.currentPeriodEnd <= now) return false;
  return subscription.status === 'trialing' || subscription.status === 'active';
}

/** 매니저가 특정 학생 관리 가능 여부 */
async function canManagerAccessStudent(
  strapi, managerUserId, studentUserId
): Promise<boolean> {
  if (!await isApprovedManager(strapi, managerUserId)) return false;
  if (!await isManagerOfStudent(strapi, managerUserId, studentUserId)) return false;
  return isStudentAccessAllowed(await getSubscription(strapi, studentUserId));
}
```

---

## 부록 C — 청구 금액 계산 (1차 구현)

```typescript
type BillingBreakdown = {
  planPrice: number;
  discountAmount: number;
  billedAmount: number;
  skipPgCharge: boolean; // billedAmount === 0
};

function resolveBillingAmount(
  plan: { price: number },
  sub: Subscription,
  now = new Date()
): BillingBreakdown | null {
  if (sub.discountStartsAt && now < sub.discountStartsAt) return baseOnly(plan);
  if (sub.discountEndsAt && now > sub.discountEndsAt) return baseOnly(plan);

  const planPrice = plan.price;
  let billed = planPrice;

  if (sub.overridePrice != null) {
    billed = sub.overridePrice;
  } else {
    if (sub.discountPercent) billed = Math.round(billed * (1 - sub.discountPercent / 100));
    if (sub.discountFixedAmount) billed = Math.max(0, billed - sub.discountFixedAmount);
  }

  return {
    planPrice,
    discountAmount: planPrice - billed,
    billedAmount: billed,
    skipPgCharge: billed === 0,
  };
}

// PG 청구·Webhook 성공 후:
// if (sub.discountApplyOnce) → 할인 필드 null 초기화
```

---

*확정 정책(§0)을 기준으로 한 설계 검토 문서이다. 1차 범위에 회원별 Admin 수동 할인이 포함된다. Phase 0 잔여 항목(가격, PG, 체험 결제 UX) 확정 후 API·스키마 상세 설계서를 별도 작성한다.*
