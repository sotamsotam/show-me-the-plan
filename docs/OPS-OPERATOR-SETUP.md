# 운영자(Operator) 계정 설정 — 빠른 가이드

> 상세: [`MONETIZATION-OPS-ADMIN-PLAN.md`](./MONETIZATION-OPS-ADMIN-PLAN.md) §4.2, §11

## 1. 환경 변수

Strapi·Next.js **동일 값** (루트 `.env.example` 참고):

```env
OPS_INTERNAL_SECRET=change-me-ops-internal-secret
```

Docker: `docker-compose.yml`에 이미 포함됨.

## 2. Strapi Admin에서 운영자 생성

1. **http://localhost:1337/admin** 로그인 (Super Admin)
2. **Content Manager → User** — 새 사용자
   - email, username, password
   - role: `Authenticated`
3. **Content Manager → User Profile** — 새 프로필
   - `user`: 위 사용자 연결
   - `isOperator`: **true**
   - `schoolLevel`: `other` (권장)
   - `managerStatus`: 비움

## 3. 앱 로그인

1. **http://localhost:3000/login** (또는 Caddy `:80`)
2. 운영자 계정으로 로그인
3. **http://localhost:3000/ops** 접속

> `isOperator`는 **로그인 시점** JWT에 반영됩니다. Profile 생성 후 **재로그인**이 필요할 수 있습니다.

## 4. 확인 체크리스트

- [ ] `/ops` 대시보드·회원·구독 목록 조회
- [ ] 일반 학생 계정으로 `/ops` → `/dashboard` 리다이렉트
- [ ] `npm run ops:qa` Pass (자동)

## 5. CS 작업

- 할인: `/ops/subscriptions/[userId]`
- 매니저 승인: `/ops/managers/pending`
- 매뉴얼: [`BILLING-CS-MANUAL.md`](./BILLING-CS-MANUAL.md)
