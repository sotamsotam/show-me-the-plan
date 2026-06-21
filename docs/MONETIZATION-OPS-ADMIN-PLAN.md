# Show Me The Plan — 운영 Admin (`/ops`) 구현 계획

> **작성일:** 2026-06-20  
> **상태:** Ops-0~2 구현 완료 · Ops-3 2차 대기  
> **선행 문서:** [`MONETIZATION-REVIEW.md`](./MONETIZATION-REVIEW.md) §9, [`MONETIZATION-WORK-SUMMARY.md`](./MONETIZATION-WORK-SUMMARY.md)  
> **범위:** 회사 운영자용 회원·구독·매니저 승인 관리 (학생/매니저 `/dashboard`와 분리)

---

## 1. 배경

현재 운영·CS 작업은 **Strapi Admin** (`/admin`)에서 Content Type별 CRUD로만 가능하다.

- 회원·구독·해지 회원을 **한 화면에서 필터·검색**하기 어렵다.
- `resolveBillingAmount()` 기반 **실청구 미리보기** UI가 없다.
- 매니저 승인·할인 설정 등 **반복 CS 워크플로**에 맞는 UI가 없다.

본 문서는 **Next.js 운영 포털 `/ops`** 구현 계획이며, Strapi Admin은 Plan 수정·DB 긴급 수정용으로 **병행 유지**한다.

---

## 2. 확정 의사결정 ✅

| # | 항목 | 결정 |
|---|------|------|
| 1 | **운영자 인증** | `user-profile.isOperator === true` 인 앱 회원만 `/ops` 접근 |
| 2 | **운영자 가입** | **공개 `/signup` 사용 안 함** — **Strapi Admin에서 User + Profile 직접 생성** |
| 3 | **URL** | **선택지 A** — 같은 사이트, 경로만 분리 (`https://{domain}/ops`) |
| 4 | **감사 로그** | **1차:** Subscription 기존 필드만 (`discountGrantedAt`, `discountGrantedBy`, `discountNote`) · **2차:** 전용 이력 CT |
| 5 | **2차 범위** | 환불, 체험 재부여, past_due 독촉, CSV, 전용 audit-log CT |
| 6 | **Strapi Super Admin** | `admin::user` + `/admin` — 운영 포털과 **별도** (비상·스키마용) |

---

## 3. 운영자 vs 기존 역할

| 구분 | 로그인 | 접근 | 가입 경로 |
|------|--------|------|-----------|
| 학생 | `/login` | `/dashboard`, billing | `/signup` |
| 매니저 | `/login` | `/dashboard` (무료) | `/signup` |
| **운영자 (operator)** | `/login` (동일) | **`/ops`만** (+ API) | **Strapi Admin에서만 생성** |
| Strapi Super Admin | `/admin` | Strapi 백오피스 | Strapi 최초 설정 |

**원칙**

- `isOperator`는 **앱 API로 설정·변경 불가** (가입·`updateMe`에서 무시/거부).
- 운영자 계정 이메일은 **학생·매니저와 분리** 권장.
- 운영자는 **구독·결제 대상 아님** — Subscription 레코드 없음.

---

## 4. 데이터 모델 변경 (1차)

### 4.1 `user-profile` 필드 추가

```json
"isOperator": {
  "type": "boolean",
  "default": false
}
```

| 규칙 | 내용 |
|------|------|
| 기본값 | `false` |
| true 설정 | Strapi Admin UI 또는 향후 internal API (Super Admin 전용) |
| 공개 API | `registerWithProfile`, `updateMe`에서 **반영 금지** |

### 4.2 운영자 Profile 생성 가이드 (Strapi Admin)

1. **Content Manager → User** — 운영자용 계정 생성 (email, username, password, role: `authenticated`)
2. **Content Manager → User Profile** — 해당 user 연결
   - `isOperator`: **true**
   - `schoolLevel`: 구독·NEIS와 무관 (`other` 권장, 또는 추후 `operator` enum 검토)
   - `managerStatus`: 비움 (매니저 아님)
3. 운영자는 **`/login`** 으로 로그인 후 **`/ops`** 접속

> Subscription·Plan·Payment History CT는 **변경 없음** (기존 스키마 재사용).

---

## 5. 아키텍처

```
[운영자 브라우저]
    ↓ /login (NextAuth, 기존과 동일)
    ↓ /ops/* (Next.js App Router)
    ↓ /api/ops/* (BFF — isOperator 검증)
    ↓ /api/ops/internal/* (Strapi — x-ops-internal-secret)
[Strapi 5]
    user-profile · subscription · payment-history · plan
    subscription.ts · billing.ts · subscription-billing.ts (재사용)
```

**Strapi Admin (`/admin`)과의 역할 분담**

| 작업 | `/ops` | Strapi `/admin` |
|------|--------|-----------------|
| 회원·구독 통합 목록·필터 | ◎ 1차 | △ CT별 |
| 할인·CS 워크플로 | ◎ 1차 | ◎ 가능 |
| 실청구 미리보기 | ◎ 1차 | ✗ |
| 매니저 승인 UI | ◎ 1차 | ◎ profile 편집 |
| Plan 가격 수정 | 읽기만 | ◎ |
| DB 긴급 수동 수정 | ✗ | ◎ |
| 운영자 계정 생성 | ✗ | ◎ User + Profile |

---

## 6. URL·라우팅 (선택지 A)

**같은 Next.js 앱, 같은 도메인, 경로 prefix만 분리.**

| 경로 | 대상 | 비고 |
|------|------|------|
| `/` | 마케팅 | 기존 |
| `/login` | 전체 회원 로그인 | 기존 |
| `/dashboard/*` | 학생·매니저 | 기존 |
| **`/ops`** | 운영 대시보드 | **신규** |
| **`/ops/members`** | 회원 목록 | 신규 |
| **`/ops/subscriptions`** | 구독 목록 | 신규 |
| **`/ops/subscriptions/[userId]`** | 구독·할인 상세 | 신규 |
| **`/ops/managers/pending`** | 매니저 승인 대기 | 신규 |

**미들웨어**

- `/ops/*`: NextAuth 세션 필수 + `isOperator === true` (아니면 `/dashboard` 또는 403)
- 학생/매니저가 `/ops` URL을 알아도 **접근 불가**

**향후 (선택):** 트래픽·보안 요구 시 `ops.{domain}` 서브도메인으로 분리 가능 — 1차 범위 아님.

---

## 7. 화면·기능 (Phase별)

### Phase Ops-0 — 기반 ✅ (2026-06-21)

- [x] `user-profile.isOperator` 필드 + 가입/API 차단
- [x] `GET /api/user-profiles/me`에 `isOperator` 포함 (profile spread)
- [x] Strapi `assertOpsInternalAccess` + `OPS_INTERNAL_SECRET` env
- [x] Next.js `/ops` 레이아웃·미들웨어·`requireOperatorSession()` BFF 헬퍼
- [x] 비운영자 → `/ops` 접근 시 리다이렉트/403

### Phase Ops-1 — 읽기 전용 ✅ (2026-06-21)

**대시보드 `/ops`**

| 지표 | 소스 |
|------|------|
| 회원 수 (학생 / 매니저 / 전체) | user + profile |
| trialing / active / expired / past_due | subscription.status |
| 해지 예약 (`cancelAtPeriodEnd`) | subscription |
| 7일 내 만료 예정 | currentPeriodEnd |

**회원 목록 `/ops/members`**

- 컬럼: id, username, email, schoolLevel, managerStatus, 구독 status, isAccessAllowed
- 필터: schoolLevel, 구독 status, 검색(email/username)
- 페이지네이션

**구독 목록 `/ops/subscriptions`**

- 탭/필터: trialing · active · 해지 예약 · expired · past_due
- 컬럼: 사용자, status, periodEnd, 다음 청구액(읽기), 할인 여부

**구독 상세 `/ops/subscriptions/[userId]`** (읽기)

- 구독 상태·기간·해지 예약
- `resolveBillingAmount` → 다음 청구액 표시
- 결제 내역 (payment-history)
- 연결 매니저 수 (읽기)

### Phase Ops-2 — CS 쓰기 ✅ (2026-06-21)

**구독 상세 — 편집**

- 할인: `discountPercent`, `discountFixedAmount`, `overridePrice`, `discountStartsAt`, `discountEndsAt`, `discountApplyOnce`, `discountNote`
- 저장 시 `discountGrantedAt`, `discountGrantedBy` 자동 기록 (운영자 email/username)
- 저장 전 **실청구 미리보기** 확인 모달

**매니저 승인 `/ops/managers/pending`**

- `managerStatus === pending` 목록
- 승인 / 거절 → 기존 `user-profile` lifecycle (`syncManagerRoleForProfile`) 경유

**API (Strapi internal 예시)**

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/ops/internal/dashboard/summary` | 대시보드 집계 |
| GET | `/api/ops/internal/members` | 회원 목록 |
| GET | `/api/ops/internal/subscriptions` | 구독 목록 |
| GET | `/api/ops/internal/subscriptions/:userId` | 상세 + nextBilling |
| PATCH | `/api/ops/internal/subscriptions/:userId/discount` | 할인 수정 |
| GET | `/api/ops/internal/managers/pending` | 승인 대기 |
| POST | `/api/ops/internal/managers/:userId/approve` | 승인 |
| POST | `/api/ops/internal/managers/:userId/reject` | 거절 |

Next BFF: `/api/ops/*` → 위 internal API 프록시 (`OPS_INTERNAL_SECRET` + `isOperator` 이중 검증).

---

## 8. 감사(Audit) 정책

### 1차 (본 계획)

Subscription 기존 필드만 사용:

| 필드 | 용도 |
|------|------|
| `discountGrantedAt` | 마지막 할인 설정 시각 |
| `discountGrantedBy` | 운영자 식별 (email 또는 username) |
| `discountNote` | CS 메모 |

- **마지막 변경**만 추적 가능 (이력 누적 없음).
- [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md) 1차 운영 기준 유지.

### 2차 (범위 외)

- [ ] `ops-audit-log` Content Type (누가·언제·무엇을·before/after)
- [ ] `/ops` 변경 이력 탭
- [ ] 환불·체험 재부여·past_due 독촉·CSV export

---

## 9. 보안 체크리스트

- [x] `isOperator` — 공개 register/update API에서 설정 불가
- [x] `/api/ops/*` — BFF에서 `isOperator` 검증 (UI만 막지 않음)
- [x] Strapi internal — `x-ops-internal-secret` (브라우저 직접 호출 불가)
- [x] `pgBillingKey` — 운영 UI에 **노출 금지** (`hasBillingKey`만)
- [x] 운영자 계정 — Strapi Admin에서만 생성 (§4.2 가이드)
- [ ] (권장) 운영자 수 최소화, 이메일 분리

---

## 10. 환경 변수 (추가 예정)

| 변수 | 위치 | 용도 |
|------|------|------|
| `OPS_INTERNAL_SECRET` | Strapi + Next BFF | internal API 인증 |
| `BILLING_INTERNAL_SECRET` | 기존 | billing internal (별도 유지) |

`.env.example` / `docker-compose.yml` 반영 완료 (2026-06-21).

---

## 11. Strapi Admin과의 관계 (운영자 온보딩)

```
[신규 운영자 필요]
    ↓
Strapi Admin (/admin)
    → Users & Permissions → User 생성
    → User Profile 생성 (isOperator: true)
    ↓
운영자: /login → /ops
```

공개 **`/signup`에는 운영자 가입 UI를 두지 않는다.**

---

## 12. 일정·의존 관계

```
유료화 Phase 1~4 (완료)
    ↓
Ops-0 (isOperator + /ops guard + internal auth)
    ↓
Ops-1 (읽기: 대시보드·목록)
    ↓
Ops-2 (쓰기: 할인·매니저 승인)
    ↓
Ops-3 (2차: audit-log·환불·체험 재부여·CSV)
```

**MVP 출시 기준:** Ops-0 + Ops-1 + Ops-2 (약 **2~3주**)

---

## 13. 테스트·QA

- [x] `npm run ops:qa` — Pass 23 / Skip 3 (2026-06-21)
- [x] 공개 signup에 `isOperator: true` 전송 → 거부
- [x] 할인 PATCH → `discountGrantedBy` 기록 + `nextBilling` 반영
- [x] `pgBillingKey` 미노출 확인
- [ ] `isOperator=false` 회원 → `/ops` 리다이렉트 (브라우저) — [`OPS-OPERATOR-SETUP.md`](./OPS-OPERATOR-SETUP.md)
- [ ] `isOperator=true` 회원 → 대시보드·목록 조회 (브라우저)
- [x] 매니저 승인 → `managerStatus=approved` — _manual-qa + ops:qa API_

---

## 14. 관련 문서 갱신 (구현 시)

| 문서 | 갱신 내용 |
|------|-----------|
| [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md) | Strapi-only → `/ops` 우선 워크플로 |
| [`MONETIZATION-IMPLEMENTATION-TODO.md`](./MONETIZATION-IMPLEMENTATION-TODO.md) | Phase Ops 섹션 추가 |
| [`MONETIZATION-WORK-SUMMARY.md`](./MONETIZATION-WORK-SUMMARY.md) | Ops 링크 |

---

## 15. 미결정·2차 검토

| 항목 | 비고 |
|------|------|
| `schoolLevel`에 `operator` enum 추가 여부 | 1차는 `other` + `isOperator`로 충분할 수 있음 |
| 구독 **수동 기간 연장** UI | internal `grant-free-period` 재사용 — Ops-2 후반 또는 Ops-3 |
| `ops.` 서브도메인 분리 | 보안 강화 시 2차 인프라 |

---

*본 문서 기준 Ops-0~2 구현·QA 완료 (2026-06-21). Ops-3 착수 시 체크리스트를 갱신한다.*
