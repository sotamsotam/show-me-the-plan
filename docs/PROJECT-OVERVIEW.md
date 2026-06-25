# Show Me The Plan — 프로젝트 개요

> **문서 목적:** Show Me The Plan를 처음 접하는 사람에게 **기술 구성**과 **기능**을 설명할 수 있는 수준으로 정리한다.  
> **작성 기준일:** 2026-06-11  
> **서비스 URL (PoC):** https://rmaker.duckdns.org

---

## 목차

1. [한 줄 소개](#1-한-줄-소개)
2. [누구를 위한 서비스인가](#2-누구를-위한-서비스인가)
3. [시스템 구성도](#3-시스템-구성도)
4. [기술 스택](#4-기술-스택)
5. [아키텍처 설계](#5-아키텍처-설계)
6. [사용자 역할](#6-사용자-역할)
7. [주요 기능](#7-주요-기능)
8. [화면 구성](#8-화면-구성)
9. [데이터 모델](#9-데이터-모델)
10. [외부 연동](#10-외부-연동)
11. [인증·보안](#11-인증보안)
12. [배포 환경](#12-배포-환경)
13. [PWA (모바일 앱처럼 쓰기)](#13-pwa-모바일-앱처럼-쓰기)
14. [프로젝트 디렉터리 구조](#14-프로젝트-디렉터리-구조)
15. [현재 단계와 범위](#15-현재-단계와-범위)

---

## 1. 한 줄 소개

**Show Me The Plan**는 초·중·고 학생이 **학교 시간표·개인 일정·과목별 학습 계획**을 한곳에서 관리하고, **매니저(코치·학원 선생님 등)** 가 담당 학생의 실행 현황을 모니터링할 수 있는 **웹 기반 루틴 관리 서비스**입니다.

---

## 2. 누구를 위한 서비스인가

| 대상 | 하는 일 |
|------|---------|
| **학생** (초·중·고) | NEIS 시간표 확인, 개인 스케줄·스터디 플랜 등록, TODO 실행·통계 확인 |
| **매니저** | 학생이 지정한 뒤, 담당 학생의 일정·TODO 달성률 모니터링 |
| **관리자** (Strapi Admin) | 매니저 가입 승인, 시스템·권한 관리 |

**현재 단계:** PoC(개념 증명) — 소규모 실증용. 앱스토어 배포·대규모 상용화는 범위 외.

---

## 3. 시스템 구성도

```
[ 사용자 브라우저 / PWA ]
         │ HTTPS
         ▼
    ┌─────────┐
    │  Caddy  │  ← 리버스 프록시, HTTPS 자동 발급
    └────┬────┘
         │
    ┌────▼────────────┐
    │  Next.js 14     │  ← 화면(UI) + API 중계(BFF) + 로그인(NextAuth)
    │  (frontend)     │
    └────┬────────────┘
         │ 내부 HTTP
    ┌────▼────────────┐
    │  Strapi 5       │  ← REST API, 비즈니스 로직, NEIS 연동
    │  (backend)      │
    └────┬────────────┘
         │
    ┌────▼────────────┐
    │  PostgreSQL 16  │  ← 사용자·일정·TODO·프로필 저장
    └─────────────────┘

    Strapi ──HTTPS──▶ NEIS Open API (나이스 학교·시간표)
```

**요약:** 사용자는 **Next.js 앱 하나**만 접속합니다. Strapi와 DB는 외부에 직접 노출하지 않고 Docker 내부 네트워크에서 통신합니다.

---

## 4. 기술 스택

### 프론트엔드 (`frontend/`)

| 항목 | 기술 |
|------|------|
| 프레임워크 | **Next.js 14** (App Router) |
| UI | **React 18**, **Tailwind CSS** |
| 캘린더 | **FullCalendar 6** (월/주/일 뷰) |
| 차트 | **Recharts** (공부 통계) |
| 인증 | **NextAuth v4** (JWT 세션, 쿠키) |
| PWA | **@ducanh2912/next-pwa** (홈 화면 설치) |
| 언어 | TypeScript |

### 백엔드 (`backend/`)

| 항목 | 기술 |
|------|------|
| CMS/API | **Strapi 5.3** |
| 언어 | TypeScript |
| 인증 | Strapi `users-permissions` (JWT) |
| DB 드라이버 | PostgreSQL (`pg`) |

### 인프라

| 항목 | 기술 |
|------|------|
| DB | **PostgreSQL 16** |
| 웹서버/TLS | **Caddy 2** |
| 컨테이너 | **Docker Compose** (4서비스) |
| 도메인 | Duck DNS (`rmaker.duckdns.org`) |

---

## 5. 아키텍처 설계

### BFF (Backend for Frontend) 패턴

브라우저는 **Strapi를 직접 호출하지 않습니다.**

```
브라우저  →  /api/* (Next.js)  →  Strapi /api/*
```

| 장점 | 설명 |
|------|------|
| 보안 | Strapi URL·토큰을 서버에서만 사용 |
| 단순한 클라이언트 | 프론트는 동일 도메인 `/api`만 호출 |
| 인증 통합 | NextAuth 세션 → Strapi JWT 변환을 서버에서 처리 |

### Docker Compose 서비스 (4개)

| 서비스 | 역할 | 외부 포트 |
|--------|------|-----------|
| `caddy` | HTTPS, 역방향 프록시 | 80, 443 |
| `frontend` | Next.js 앱 | (내부 3000) |
| `strapi` | API·Admin | 1337 (관리용) |
| `postgres` | 데이터베이스 | (내부만) |

---

## 6. 사용자 역할

### 학생 (`schoolLevel`: 초·중·고)

- 회원가입 시 NEIS로 **학교·학년·반** 검색·등록
- 본인의 스케줄·스터디 플랜·TODO 관리
- 설정에서 **승인된 매니저** 지정 가능

### 매니저 (`schoolLevel`: manager)

| 상태 | 설명 |
|------|------|
| `pending` | 가입 직후 — Admin 승인 대기, 설정 페이지만 이용 |
| `approved` | 승인 완료 — 담당 학생 데이터 조회 가능 |
| `rejected` | 승인 거절 |

- 학생이 자신을 담당 매니저로 지정해야 모니터링 가능
- 담당 학생 선택 후 스케줄·플랜·TODO·통계를 **대리 조회**

### Strapi 역할 (시스템)

| 역할 | 권한 |
|------|------|
| `public` | 회원가입만 |
| `authenticated` | 학생 기본 |
| `manager` | 승인된 매니저 (커스텀 역할) |

---

## 7. 주요 기능

### 7-1. 회원가입·로그인

- 이메일 또는 사용자명 + 비밀번호 로그인
- 회원가입: **학생**(초·중·고) 또는 **매니저** 선택
- 학생: NEIS API로 학교명 검색 → 학년·반 선택
- 매니저: 가입 후 Strapi Admin에서 승인 필요

### 7-2. NEIS 학교 시간표 연동

- [나이스(NEIS) Open API](https://open.neis.go.kr)에서 **공식 학교 시간표** 조회
- 초·중·고 각각 다른 API 엔드포인트 사용
- 휴업일·공휴일 자동 제외
- 캘린더에 **읽기 전용** 이벤트로 표시 (수정 불가)

### 7-3. 스케줄 (개인 일정)

학교 수업 외 **개인 시간 블록** 관리.

| 카테고리 | 의미 |
|----------|------|
| 관리시간 | 학습·자기관리용으로 쓰는 시간 |
| 고정시간 | 매주 반복되는 고정 약속 등 |
| 기타 | 그 외 일정 |

- **반복:** 매주 특정 요일 / 1회성
- **유효 기간:** 시작일~종료일
- **occurrence:** 특정 날짜만 제외·시간/제목 수정 가능
- FullCalendar에서 드래그로 생성·수정

### 7-4. 스터디 플랜 (과목별 학습 계획)

| 과목 예시 | 국어, 영어, 수학, 사회, 과학, 도덕, 기가, 정보, 역사, 한문, 기타 |
|-----------|---------------------------------------------------------------------|

- 과목 + 제목 + 시간대 + 반복 규칙 (스케줄과 동일 구조)
- 캘린더에서 시각적으로 관리
- 특정 날짜 occurrence 수정·제외 지원

### 7-5. TODO (오늘 할 일 · 실행 중심)

**학생의 하루 학습 실행 허브.**

- 선택한 날짜의 스터디 플랜 TODO 목록
- **일과 타임라인:** 학교 시간표 + 스케줄 + 계획/실행을 10분 단위 슬롯으로 시각화
- **실행 기록:** 완료 / 미완료 / 부분 완료, 실제 공부 시간, 성취도(1~10)
- 타이머 또는 직접 입력으로 실행 시간 기록

### 7-6. 공부 통계

- 기간 선택 (주·월 등)
- **과목별** 계획 시간 vs 실행 시간
- **달성률** 추이 (막대·도넛 차트)
- Recharts 기반 시각화

### 7-7. 매니저 기능

| 기능 | 설명 |
|------|------|
| **대시보드** | 담당 학생들의 **당일 TODO 실행률** 요약 |
| **학생별 관리** | 학생 목록 → 학생 선택 → 해당 학생의 스케줄/플랜/TODO/통계 조회 |
| **승인 대기** | 매니저 가입 후 Admin 승인 전 안내 화면 |

- 학생이 설정에서 담당 매니저를 추가해야 연결됨 (복수 지정 가능)
- 매니저는 **담당 학생 데이터만** 조회·수정 가능 (권한 검증)

### 7-8. 내정보 (설정)

- 계정 정보·학교 정보 수정
- 비밀번호 변경
- (학생) 담당 매니저 검색·추가·개별 해제 (복수 가능)
- (매니저) 학교 정보 수정 불가

---

## 8. 화면 구성

### 공개 페이지

| URL | 화면 |
|-----|------|
| `/` | 랜딩 (로그인·회원가입 링크) |
| `/login` | 로그인 |
| `/signup` | 회원가입 |

### 대시보드 (로그인 필요)

**학생 메뉴**

| URL | 메뉴명 |
|-----|--------|
| `/dashboard/todo` | TODO |
| `/dashboard/schedule` | 스케줄 |
| `/dashboard/study-plan` | 스터디 플랜 |
| `/dashboard/study-stats` | 공부 통계 |
| `/dashboard/settings` | 내정보 수정 |

**매니저 메뉴**

| URL | 메뉴명 |
|-----|--------|
| `/dashboard` | 대시보드 (당일 요약) |
| `/dashboard/students` | 학생별 관리 |
| `/dashboard/pending` | 승인 대기 (pending 전용) |
| `/dashboard/settings` | 내정보 수정 |

---

## 9. 데이터 모델

Strapi 콘텐츠 타입 4개 + 사용자 계정.

### User Profile (사용자 프로필)

| 필드 | 설명 |
|------|------|
| `schoolLevel` | elementary / middle / high / manager |
| `managerStatus` | pending / approved / rejected (매니저만) |
| NEIS 학교 코드, 학교명, 학년, 반 | |

### Student Manager Assignment (학생–매니저 담당 관계)

| 필드 | 설명 |
|------|------|
| `student` | 학생 사용자 |
| `manager` | 담당 매니저 사용자 |
| `status` | active / removed |
| `assignedAt` | 지정 시각 |

### User Schedule (개인 일정)

| 필드 | 설명 |
|------|------|
| `title` | 일정 제목 |
| `scheduleCategory` | managed / fixed / other |
| `startTime`, `endTime` | 시간 (HH:mm) |
| `recurrenceType` | weekly / once |
| `daysOfWeek` | 반복 요일 (0=일 ~ 6=토) |
| `validFrom`, `validUntil` | 유효 기간 |
| `excludedDates`, `overrides` | 날짜별 제외·수정 |

### Study Plan Todo (스터디 플랜)

| 필드 | 설명 |
|------|------|
| `subject` | 과목 (국어, 영어, 수학 등) |
| `title` | 계획 제목 |
| 시간·반복 필드 | 스케줄과 동일 구조 |
| `executionRecords` | 날짜별 실행 기록 (상태, 시간, 성취도) |

### 실행 기록 상태

| 상태 | 의미 |
|------|------|
| `completed` | 완료 |
| `partial` | 부분 완료 |
| `incomplete` | 미완료 |

---

## 10. 외부 연동

### NEIS Open API

| API | 용도 |
|-----|------|
| `schoolInfo` | 학교명 검색 |
| `classInfo` | 학년·반 목록 |
| `elsTimetable` | 초등 시간표 |
| `misTimetable` | 중등 시간표 |
| `hisTimetable` | 고등 시간표 |
| `SchoolSchedule` | 학사일정 (휴업일) |

- API 키: `NEIS_KEY` 환경변수 (Strapi에서 호출)
- 회원가입·설정·로그인 후 시간표 조회에 사용
- **시간표 조회 캐시:** Strapi 인메모리 TTL 캐시(기본 12시간, 반·날짜 범위 키) — 상세: [NEIS 메모리 캐시 구현](./NEIS-MEMORY-CACHE-IMPLEMENTATION.md)

---

## 11. 인증·보안

### 로그인 흐름

```
1. 사용자 → Next.js 로그인 폼
2. Next.js → Strapi /api/auth/local (이메일·비밀번호)
3. Strapi → JWT 발급
4. NextAuth → JWT를 세션 쿠키에 저장
5. 이후 API 요청 → Next.js가 Strapi JWT로 대리 호출
```

### 접근 제어

| 계층 | 방식 |
|------|------|
| 대시보드 | NextAuth middleware (`/dashboard/*`) |
| BFF API | NextAuth JWT → Strapi Bearer 토큰 |
| Strapi API | 역할·소유권·매니저-학생 관계 검증 |
| 매니저 대리 조회 | `studentUserId` + 담당 관계 확인 |

### 배포 보안 (PoC)

- HTTPS (Caddy + Let's Encrypt)
- Strapi는 Docker 내부 네트워크만 (앱은 Caddy 경유)
- Strapi Admin: 포트 1337 (관리자 직접 접속)
- `.env`에 시크릿·DB 비밀번호 (git 미포함)

---

## 12. 배포 환경

### 현재 (PoC)

| 항목 | 내용 |
|------|------|
| 호스팅 | 고정 IP PC (또는 Docker 호환 서버) |
| 도메인 | `rmaker.duckdns.org` |
| 배포 | `git pull` → `docker compose up -d --build` |
| 예상 이전 | Hetzner VPS (~€4/월) — [이전 가이드](./HETZNER-VPS-MIGRATION-GUIDE.md) |

### 환경변수 (루트 `.env`)

| 변수 | 용도 |
|------|------|
| `APP_DOMAIN` | Caddy 도메인 |
| `NEXTAUTH_URL` | 로그인 세션 URL (HTTPS) |
| `NEXTAUTH_SECRET` | 세션 암호화 |
| `STRAPI_URL` | Docker 내부 Strapi 주소 |
| `CORS_ORIGIN` | Strapi CORS 허용 origin |
| Strapi 시크릿 5종 | JWT·Admin 등 |
| `DATABASE_PASSWORD` | PostgreSQL |
| `NEIS_KEY` | NEIS API 키 |
| `NEIS_CACHE_ENABLED` | NEIS 시간표 인메모리 캐시 on/off (기본 `true`) |
| `NEIS_CACHE_TTL_HOURS` | 캐시 TTL 시간 (기본 `12`) |
| `NEIS_CACHE_MAX_ENTRIES` | 캐시 최대 엔트리 수 (기본 `2000`) |
| `VAPID_PUBLIC_KEY` | Web Push 공개 키 (frontend `NEXT_PUBLIC_VAPID_PUBLIC_KEY`와 동일 값) |
| `VAPID_PRIVATE_KEY` | Web Push 비공개 키 (backend 전용) |
| `VAPID_SUBJECT` | VAPID subject (`mailto:` 또는 `https://` URL) |

---

## 13. PWA (모바일 앱처럼 쓰기)

| 항목 | 상태 |
|------|------|
| 홈 화면 추가 | ✅ Android Chrome, iOS Safari |
| standalone 실행 | ✅ (주소창 없는 앱 형태) |
| Web App Manifest | ✅ |
| Service Worker | ✅ (정적 에셋 캐시, API는 Network Only, push 핸들러 포함) |
| 푸시 알람 (학습 TODO) | ✅ (서버 Web Push + SW 억제 정책) |
| 오프라인 완전 지원 | ❌ (향후 과제) |

- 학습 TODO `startTime` 정각에 「[과목] 제목 — 학습할 시간입니다」 알림
- 설정 → **학습 알림** 토글로 전역 ON/OFF 및 Push 구독
- 상세 설계: [PUSH-NOTIFICATION-DESIGN.md](./PUSH-NOTIFICATION-DESIGN.md)

- HTTPS 필수 (`https://rmaker.duckdns.org`)
- iOS: Safari 「홈 화면에 추가」 수동 안내 배너 제공

---

## 14. 프로젝트 디렉터리 구조

```
routine-maker/
├── frontend/                 # Next.js 앱 (UI + BFF API)
│   ├── src/app/              # 페이지·API 라우트
│   ├── src/components/       # UI 컴포넌트 (캘린더, 통계, 매니저 등)
│   ├── src/lib/              # 도메인 로직 (일정, TODO, 통계, 인증)
│   ├── public/               # 아이콘, manifest (PWA)
│   ├── Dockerfile
│   └── next.config.mjs       # standalone + PWA
│
├── backend/                  # Strapi 5 API
│   ├── src/api/              # 콘텐츠 타입·컨트롤러·라우트
│   │   ├── user-profile/     # 프로필·회원가입·시간표·매니저
│   │   ├── user-schedule/    # 개인 일정
│   │   ├── study-plan-todo/  # 스터디 플랜 TODO
│   │   ├── notification/     # 푸시 알림 큐
│   │   └── push-subscription/ # Web Push 구독
│   ├── src/services/         # NEIS, 반복 확장, web-push, 알림 dispatch
│   ├── config/               # DB, CORS, 미들웨어
│   └── Dockerfile
│
├── docker-compose.yml        # postgres + strapi + frontend + caddy
├── Caddyfile                 # HTTPS 리버스 프록시
├── .env.example              # 배포 환경변수 템플릿
│
└── docs/                     # 문서
    ├── PROJECT-OVERVIEW.md   # ← 이 문서
    ├── PWA-IMPLEMENTATION.md
    ├── CLOUD-DEPLOYMENT-REVIEW.md
    └── HETZNER-VPS-MIGRATION-GUIDE.md
```

---

## 15. 현재 단계와 범위

### 포함 (PoC)

- 웹 + PWA (홈 화면 설치)
- 학생·매니저 역할
- NEIS 시간표 연동
- 스케줄·스터디 플랜·TODO·통계
- 매니저 모니터링
- Docker 자체 호스팅
- **학습 TODO 푸시 알람** (Web Push, Study Session 억제)

### 미포함 (향후)

- 오프라인 완전 지원
- 앱스토어 배포 (iOS/Android 네이티브)
- 부모 스크린타임 연동
- 대규모 자동 스케일링

---

## 부록: API 한눈에 보기

### Next.js BFF (`/api/*`) — 17개 라우트

| 분류 | 경로 |
|------|------|
| 인증 | `/api/auth/*`, `/api/register` |
| 프로필 | `/api/profile/me`, `/api/profile/me/managers`, `/api/profile/managers/search`, `/api/profile/manager/students`, `/api/profile/change-password`, `/api/profile/notifications` |
| 푸시 | `/api/push/subscribe`, `/api/push/unsubscribe` |
| 일정 | `/api/user-schedules`, `/api/user-schedules/[id]`, `.../occurrences/[date]` |
| 스터디 플랜 | `/api/study-plan-todos`, `.../[id]`, `.../occurrences/[date]`, `.../executions/[date]` |
| 시간표 | `/api/timetable` |
| NEIS | `/api/neis/schools`, `/api/neis/classes` |

### Strapi 커스텀 API (대표)

| 경로 | 용도 |
|------|------|
| `POST /api/user-profiles/register` | 회원가입 |
| `GET /api/user-profiles/timetable` | NEIS 시간표 |
| `GET /api/user-profiles/manager/students` | 매니저 담당 학생 |
| `GET/POST /api/user-profiles/me/managers` | 학생 담당 매니저 목록·추가 |
| `DELETE /api/user-profiles/me/managers/:managerUserId` | 학생 담당 매니저 개별 해제 |
| `GET /api/neis/schools` | 학교 검색 |
| `POST /api/push-subscriptions/subscribe` | Web Push 구독 등록 |
| `PUT /api/user-profiles/me/notifications` | 알림 전역 ON/OFF |

---

## 관련 문서

- [NEIS 메모리 캐시 구현](./NEIS-MEMORY-CACHE-IMPLEMENTATION.md)
- [PWA 구현 가이드](./PWA-IMPLEMENTATION.md)
- [학습 TODO 푸시 알람 설계](./PUSH-NOTIFICATION-DESIGN.md)
- [클라우드 배포 검토](./CLOUD-DEPLOYMENT-REVIEW.md)
- [Hetzner VPS 이전 가이드](./HETZNER-VPS-MIGRATION-GUIDE.md)
