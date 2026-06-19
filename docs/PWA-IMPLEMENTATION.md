# Show Me The Plan — PWA 구현 검토 및 작업 가이드

> **문서 목적:** 모바일 앱 전략 검토 결과를 정리하고, 알람(푸시) 제외 PWA를 **바로 구현할 수 있는 수준**의 작업 가이드를 제공한다.  
> **작성 기준일:** 2026-06-09  
> **대상 프로젝트:** `frontend/` (Next.js 14 App Router)  
> **1차 범위:** 설치 가능한 PWA (홈 화면 추가, standalone 실행)  
> **1차 범위 제외:** 푸시 알람, 오프라인 완전 지원, 앱스토어 배포

---

## 목차

1. [의사결정 요약](#1-의사결정-요약)
2. [프로젝트 현황](#2-프로젝트-현황)
3. [모바일 앱 전략 비교 (검토 기록)](#3-모바일-앱-전략-비교-검토-기록)
4. [PWA 설치 방식 (사용자 관점)](#4-pwa-설치-방식-사용자-관점)
5. [부모 통제(스크린 타임) 관련 제약](#5-부모-통제스크린-타임-관련-제약)
6. [푸시 알람 (향후 과제, 이번 범위 제외)](#6-푸시-알람-향후-과제-이번-범위-제외)
7. [현재 프로젝트 PWA 구현 가능성](#7-현재-프로젝트-pwa-구현-가능성)
8. [구현 작업 계획](#8-구현-작업-계획)
9. [파일별 변경 상세](#9-파일별-변경-상세)
10. [Service Worker 캐시 전략](#10-service-worker-캐시-전략)
11. [환경 변수 및 배포](#11-환경-변수-및-배포)
12. [테스트 체크리스트](#12-테스트-체크리스트)
13. [알려진 제약 및 리스크](#13-알려진-제약-및-리스크)
14. [향후 로드맵](#14-향후-로드맵)

---

## 1. 의사결정 요약

| 항목 | 결정 |
|------|------|
| 앱 형태 | **PWA** (웹뷰 래핑·React Native 전환 아님) |
| 목적 | **실증(PoC)** — 앱스토어 배포·상용 서비스 아님 |
| 1차 기능 | 홈 화면 설치 + standalone(전체 화면) 실행 |
| 1차 제외 | 푸시 알람, 오프라인, 부모 통제 연동 |
| 예상 작업량 | 소~중 (반나절~1일) |
| 구조 변경 | **없음** (프론트 설정·에셋 추가만) |

---

## 2. 프로젝트 현황

### 2.1 기술 스택

| 구분 | 내용 |
|------|------|
| 프론트엔드 | Next.js **14.2.5**, React 18, Tailwind CSS |
| 인증 | NextAuth v4 (Credentials → Strapi JWT), JWT 세션, 쿠키 기반 |
| 백엔드 | Strapi 5 (`STRAPI_URL` 경유) |
| 아키텍처 | Next.js **API Routes(BFF)** → Strapi |
| UI | FullCalendar, Recharts, 폼·타임라인 중심 |
| 모바일 UI | 반응형·모바일 네비·캘린더 모바일 툴바 **이미 구현** |

### 2.2 관련 디렉터리

```
rutine-maker/
├── frontend/          ← PWA 작업 대상
│   ├── next.config.mjs
│   ├── public/        ← 아이콘·manifest (현재 거의 비어 있음)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── middleware.ts      ← /dashboard 보호
│       │   └── api/               ← 13개 BFF 라우트
│       └── components/
└── backend/           ← Strapi (PWA 직접 변경 없음)
```

### 2.3 API Routes 목록 (캐시 제외 대상)

| 경로 | 용도 |
|------|------|
| `/api/auth/[...nextauth]` | NextAuth |
| `/api/register` | 회원가입 |
| `/api/profile/me` | 프로필 |
| `/api/user-schedules` | 사용자 일정 CRUD |
| `/api/user-schedules/[id]` | 일정 단건 |
| `/api/user-schedules/[id]/occurrences/[date]` | 일정 occurrence |
| `/api/study-plan-todos` | 스터디 플랜 TODO |
| `/api/study-plan-todos/[id]` | TODO 단건 |
| `/api/study-plan-todos/[id]/occurrences/[date]` | TODO occurrence |
| `/api/study-plan-todos/[id]/executions/[date]` | TODO 실행 기록 |
| `/api/timetable` | 시간표 |
| `/api/neis/schools` | NEIS 학교 검색 |
| `/api/neis/classes` | NEIS 학급 검색 |

### 2.4 PWA 관련 현재 상태

| 항목 | 상태 |
|------|------|
| `manifest.json` / Web App Manifest | ❌ 없음 |
| Service Worker | ❌ 없음 |
| PWA 아이콘 (192, 512, apple-touch) | ❌ 없음 (`vercel.svg`, `next.svg`만 존재) |
| `theme-color`, iOS 메타 | ❌ 없음 |
| PWA npm 패키지 | ❌ 없음 |
| HTTPS 배포 | 실증 환경에 따라 별도 준비 필요 |

---

## 3. 모바일 앱 전략 비교 (검토 기록)

실증 단계에서 PWA를 선택한 근거와, 향후 참고용 비교표이다.

### 3.1 선택지 비교

| 방식 | 장점 | 단점 | Show Me The Plan 적합도 |
|------|------|------|------------------------|
| **PWA** | 기존 코드 100% 재사용, 빠른 실증, 스토어 불필요 | iOS 제약, 오프라인·푸시 약함, 부모 통제 불안정 | **★★★★★ (PoC)** |
| **Capacitor (하이브리드)** | 스토어 배포, 네이티브 플러그인 확장 | Next.js는 원격 URL 로드가 현실적, 추가 프로젝트 | ★★★★ (스토어 필요 시) |
| **순수 WebView** | 얇은 래퍼 | Capacitor 대비 이점 적음 | ★★ |
| **TWA (Android)** | Play Store + PWA | Android만 | ★★★ |
| **React Native** | 네이티브 UX·알람·오프라인 | FullCalendar 등 재구현, 대규모 재작성 | ★ (과투자) |

### 3.2 Next.js + 하이브리드 시 참고

- App Router + API Routes + SSR 구조 → **정적 export 불가**, **배포 URL을 WebView로 로드**하는 Capacitor 방식이 현실적
- FullCalendar, Recharts는 **웹/PWA에 최적화** → RN 전환 이유 없음

---

## 4. PWA 설치 방식 (사용자 관점)

개발 완료 후 실증 참여자(학생·부모)에게 안내할 내용이다.

### 4.1 Android (Chrome)

1. HTTPS로 배포된 사이트 접속
2. Chrome이 **「앱 설치」** 또는 **「홈 화면에 추가」** 제안 (조건 충족 시)
3. 또는 주소창 **⊕ 설치** 아이콘, 메뉴(⋮) → **앱 설치**
4. 홈 화면·앱 서랍에 아이콘 생성 → 브라우저 UI 없이 실행

### 4.2 iOS (Safari)

1. Safari에서 사이트 접속 (**Chrome 등 타 브라우저는 홈 화면 추가만으로 PWA 기능 제한적**)
2. 공유 버튼(□↑) → **「홈 화면에 추가」**
3. 이름 확인 후 추가
4. 자동 설치 배너는 거의 없음 → **수동 안내 문구 필요**

### 4.3 PC (Chrome / Edge)

1. 주소창 **설치** 아이콘 또는 메뉴 → **Show Me The Plan 설치**
2. 독립 앱 창으로 실행

### 4.4 설치 가능 조건 (개발자가 충족해야 함)

- **HTTPS** (localhost는 개발 예외)
- **Web App Manifest** (이름, 아이콘, `start_url`, `display`)
- **Service Worker** 등록
- 아이콘 최소 **192×192**, **512×512** PNG

> `npm run dev` 로컬 개발 서버에서는 PWA 설치 테스트가 제한적이다. **`npm run build` → `npm run start` 또는 HTTPS 배포** 후 테스트할 것.

---

## 5. 부모 통제(스크린 타임) 관련 제약

> **이번 PWA 범위에는 구현하지 않지만**, 실증 시나리오(청소년 + 부모 앱 시간 통제) 관련 제약을 문서화한다.

### 5.1 요구 시나리오

- 다른 앱(YouTube, 게임 등)은 시간 제한
- Show Me The Plan만 무제한 사용

### 5.2 PWA의 한계

| 플랫폼 | 가능성 | 비고 |
|--------|--------|------|
| **Android (Family Link)** | △ 부분 가능 | PWA가 **별도 앱 항목**으로 잡히면 「무제한 시간 앱」 지정 가능. Chrome과 묶이면 불가 |
| **iOS (Screen Time)** | ✗ 어려움 | PWA가 Always Allowed에 **독립 앱으로 안 뜨는 경우 많음** |
| **iOS URL 화이트리스트** | △ 차선 | 허용 URL만 추가하는 방식. Safari 정책 우회 여지 있음 |

### 5.3 결론

- PWA만으로 **「다른 앱 차단 + 이 앱만 무제한」** 을 OS 수준에서 안정적으로 보장하기 **어렵다**
- 부모 통제가 **핵심 실증 포인트**가 되면 → Capacitor/네이티브 앱 또는 실기기별 Family Link 목록 확인 필요
- **1차 PWA 실증에서는 부모 통제 연동을 범위外**로 둔다

---

## 6. 푸시 알람 (향후 과제, 이번 범위 제외)

> TODO 등록 시간에 알림을 보내는 기능. **1차 PWA 작업에 포함하지 않는다.**  
> 추후 구현 시 참고용으로 기록한다.

### 6.1 PWA에서의 알람 방식

| 방식 | 가능 | 비고 |
|------|------|------|
| **서버 Web Push** | ✅ | 정각에 서버가 push 전송. **권장 방식** |
| **기기 로컬 예약 알림** | ❌ | Notification Triggers API 개발 중단 |
| **앱 열려 있을 때만 (`setTimeout`)** | △ | 백그라운드·잠금 화면 비실용 |

### 6.2 서버 부담 (참고)

실증·소규모에서는 **부담 작음**.

- 권장 설계: TODO 저장 시 **「다음 1회 알림 시각」만** DB에 저장 → cron이 해당 시각만 조회·전송
- 피할 설계: 매분 전체 사용자·전체 TODO occurrence 전개

예시 (사용자 100명, 5알림/일): 하루 500건 전송 — Show Me The Plan API 트래픽 대비 미미

### 6.3 향후 구현 시 필요 요소

- VAPID 키, `web-push` 라이브러리
- Push 구독 저장 (`/api/push/subscribe`)
- `scheduled_notifications` 테이블 + cron/큐
- iOS: 홈 화면 PWA + 권한 허용 필수

---

## 7. 현재 프로젝트 PWA 구현 가능성

### 7.1 결론: **구현 가능**

아키텍처 변경 없이 `frontend/` 설정·에셋 추가만으로 1차 PWA 달성 가능.

### 7.2 잘 맞는 이유

| 항목 | 판단 |
|------|------|
| Next.js 14 App Router | PWA 플러그인 호환 (`@ducanh2912/next-pwa`) |
| SSR + API Routes | 정적 export 불필요, `next build` + 배포 URL로 PWA 가능 |
| NextAuth 쿠키 세션 | PWA standalone + 동일 도메인에서 동작 |
| FullCalendar / Recharts | 브라우저/PWA 환경 적합 |
| 모바일 UI | 이미 반응형 구현됨 |
| middleware (`/dashboard` 보호) | PWA와 충돌 없음 |

### 7.3 주의 사항 (막히지는 않음)

| 항목 | 대응 |
|------|------|
| 인증 페이지 SW 캐시 | `/dashboard`, `/api` 캐시 제외 또는 Network First |
| 오프라인 | 데이터가 전부 서버 의존 → **1차 미지원 OK** |
| HTTPS | 실증 배포 필수 |
| `NEXTAUTH_URL` | 배포 도메인과 일치 필수 |
| iOS | `apple-touch-icon`, 수동 홈 화면 추가 안내 |

---

## 8. 구현 작업 계획

### 8.1 작업 체크리스트

```
Phase 1 — 패키지 및 기본 설정
[ ] @ducanh2912/next-pwa 설치
[ ] next.config.mjs PWA 래핑 설정
[ ] dev 환경에서 SW 비활성 확인 (disable: process.env.NODE_ENV === 'development')

Phase 2 — 에셋
[ ] public/icons/icon-192x192.png 생성
[ ] public/icons/icon-512x512.png 생성
[ ] public/icons/apple-touch-icon.png (180×180) 생성
[ ] (선택) public/icons/maskable-icon-512x512.png — Android adaptive

Phase 3 — Manifest 및 메타
[ ] manifest 설정 (플러그인 또는 public/manifest.webmanifest)
[ ] layout.tsx metadata 확장 (manifest, themeColor, appleWebApp)
[ ] (선택) iOS 홈 화면 추가 안내 컴포넌트

Phase 4 — 캐시 정책
[ ] /api/* 캐시 제외
[ ] /dashboard/* 네비게이션 Network First 또는 제외
[ ] 정적 에셋(_next/static)만 적극 캐시

Phase 5 — 배포 및 테스트
[ ] HTTPS 배포
[ ] NEXTAUTH_URL 프로덕션 값 설정
[ ] Android Chrome 설치 테스트
[ ] iOS Safari 홈 화면 추가 테스트
[ ] 로그인 → 대시보드 → 캘린더/TODO 동작 확인
[ ] 로그아웃 후 세션·캐시 이상 없는지 확인
```

### 8.2 권장 패키지

**`@ducanh2912/next-pwa`** — `next-pwa` 후속, Next.js 14 App Router 지원.

```bash
cd frontend
npm install @ducanh2912/next-pwa
```

> 대안: `serwist` (더 세밀한 SW 제어 필요 시). 1차 실증은 `@ducanh2912/next-pwa`로 충분.

### 8.3 예상 소요

| 단계 | 시간 |
|------|------|
| 패키지·config·manifest·아이콘 | 1~2시간 |
| 캐시 정책 조정 | 1~2시간 |
| HTTPS 배포·실기기 테스트 | 2~4시간 (환경에 따라) |
| **합계** | **반나절~1일** |

---

## 9. 파일별 변경 상세

### 9.1 신규 파일

```
frontend/
├── public/
│   └── icons/
│       ├── icon-192x192.png
│       ├── icon-512x512.png
│       └── apple-touch-icon.png
└── (선택) src/components/PwaInstallHint.tsx   ← iOS 안내 배너
```

### 9.2 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `frontend/package.json` | `@ducanh2912/next-pwa` 의존성 추가 |
| `frontend/next.config.mjs` | PWA 플러그인 래핑, manifest·캐시 옵션 |
| `frontend/src/app/layout.tsx` | `metadata` 확장 (manifest, themeColor, appleWebApp) |
| `frontend/.env.example` | (선택) 프로덕션 URL 주석 추가 |

### 9.3 `next.config.mjs` 초안

```javascript
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: false,       // 인증 페이지 프리캐시 방지
  aggressiveFrontEndNavCaching: false,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/_next\/static\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static',
          expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
        },
      },
      {
        urlPattern: /^https?:\/\/.*\/api\/.*/i,
        handler: 'NetworkOnly',
      },
    ],
    navigateFallback: undefined,     // 오프라인 fallback 페이지 미사용 (1차)
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
```

> 패키지 major 버전에 따라 import 경로·옵션명이 다를 수 있다. 설치 후 공식 README와 대조할 것.

### 9.4 Manifest 초안

플러그인 `manifest` 옵션 또는 `public/manifest.webmanifest`:

```json
{
  "name": "Show Me The Plan",
  "short_name": "Show Plan",
  "description": "계획을 플레이하는 순간, 공부는 퀘스트가 된다.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#2563eb",
  "lang": "ko",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 9.5 `layout.tsx` metadata 초안

```typescript
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Show Me The Plan',
  description: '계획을 플레이하는 순간, 공부는 퀘스트가 된다.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Show Me The Plan',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
```

### 9.6 (선택) iOS 설치 안내 컴포넌트 개요

- `userAgent`로 iOS Safari 감지
- `display-mode: standalone` 미적용 시에만 배너 표시
- 문구: 「Safari 공유 버튼 → 홈 화면에 추가」
- `localStorage`로 N일간 숨김

---

## 10. Service Worker 캐시 전략

### 10.1 원칙 (실증 1차)

| 리소스 | 전략 | 이유 |
|--------|------|------|
| `/_next/static/*` | Cache First | JS/CSS 번들, 설치성·로딩 개선 |
| `/api/*` | **Network Only** | 인증·실시간 데이터, stale 방지 |
| `/dashboard/*` HTML | **캐시 안 함** 또는 Network First | 로그인 상태·개인 데이터 오염 방지 |
| 이미지·폰트 | Stale While Revalidate (선택) | 성능 보조 |

### 10.2 절대 하지 말 것

- `/api/auth/*` 응답 캐시
- 로그인 후 `/dashboard` HTML을 Cache First로 장기 보관
- 오프라인 fallback으로 빈 대시보드 표시 (데이터 없어 혼란)

### 10.3 오프라인 정책 (1차)

- **오프라인 완전 지원 안 함**
- 네트워크 없을 때: 브라우저 기본 오류 또는 간단한 「인터넷 연결을 확인하세요」 페이지 (선택)
- 일정·TODO 데이터는 Strapi 경유 API 의존 → 오프라인 캐시 없이는 의미 없음

---

## 11. 환경 변수 및 배포

### 11.1 환경 변수

```env
# .env.production (또는 배포 플랫폼 환경 변수)
NEXTAUTH_URL=https://your-pwa-domain.example.com
NEXTAUTH_SECRET=<openssl rand -base64 32 로 생성>
STRAPI_URL=https://your-strapi-backend.example.com
```

| 변수 | PWA 관련 주의 |
|------|---------------|
| `NEXTAUTH_URL` | **반드시** PWA 접속 도메인과 동일 (프로토콜·호스트 포함) |
| `NEXTAUTH_SECRET` | 프로덕션 전용 시크릿 |
| `STRAPI_URL` | Next.js **서버**가 접근 가능한 URL (클라이언트 직접 호출 아님) |

### 11.2 배포 요건

| 항목 | 필수 |
|------|------|
| HTTPS | ✅ |
| `next build` + `next start` (또는 Vercel 등) | ✅ |
| Strapi 백엔드 가용 | ✅ |
| CORS / Strapi URL | Next 서버 → Strapi 통신만 확인 |

### 11.3 로컬 PWA 테스트 방법

1. `cd frontend && npm run build && npm run start`
2. HTTPS 터널 사용 (예: ngrok, Cloudflare Tunnel) — **휴대폰 실기기 테스트 시**
3. Chrome DevTools → Application → Manifest / Service Workers 확인

---

## 12. 테스트 체크리스트

### 12.1 개발자 도구 (PC Chrome)

- [ ] Application → Manifest: 이름·아이콘·`display: standalone` 표시
- [ ] Service Worker: registered, activated
- [ ] Lighthouse PWA 항목 (참고용, 100점 필수 아님)
- [ ] Install 프롬프트 또는 주소창 설치 아이콘

### 12.2 Android (Chrome)

- [ ] HTTPS URL 접속
- [ ] 앱 설치 / 홈 화면 추가
- [ ] standalone 실행 (주소창 없음)
- [ ] 회원가입 → 로그인 → 대시보드
- [ ] 스케줄 캘린더 열기·일정 생성
- [ ] 스터디 플랜 / TODO / 통계 페이지 이동
- [ ] 로그아웃 → 재로그인
- [ ] 앱 종료 후 재실행 시 세션 유지

### 12.3 iOS (Safari)

- [ ] Safari에서 HTTPS 접속
- [ ] 홈 화면에 추가
- [ ] 아이콘·이름 확인
- [ ] standalone(또는 유사) 실행
- [ ] 로그인·대시보드·캘린더 동작
- [ ] FullCalendar 터치·스크롤 UX 확인

### 12.4 회귀·보안

- [ ] 비로그인 시 `/dashboard` 접근 → 로그인 리다이렉트
- [ ] 다른 계정 로그인 시 이전 사용자 데이터 안 보임
- [ ] SW 업데이트 후(`skipWaiting`) 정상 동작

---

## 13. 알려진 제약 및 리스크

| 항목 | 내용 | 대응 |
|------|------|------|
| iOS 자동 설치 배너 없음 | 수동 「홈 화면에 추가」 | 안내 UI·문서 제공 |
| iOS PWA 기능 | 푸시·백그라운드 제한 (1차 범위外) | — |
| FullCalendar 모바일 터치 | WebView/PWA에서 가끔 어색 | 실기기 UX 확인 |
| SW 캐시 오설정 | stale 페이지·세션 이슈 | `/api`, `/dashboard` 캐시 제외 |
| `npm run dev` | SW 비활성 | build 후 테스트 |
| 부모 통제 | PWA로 안정적 화이트리스트 불가 | 실증 범위外, 문서화만 |
| 앱스토어 | PWA만으로 스토어 배포 불가 | PoC에는 불필요 |

---

## 14. 향후 로드맵

| 단계 | 내용 | 트리거 |
|------|------|--------|
| **1차 (현재)** | PWA 설치 + standalone | 실증 시작 |
| 2차 | iOS 설치 안내 UI, 아이콘·스플래시 polish | 사용자 피드백 |
| 3차 | 서버 Web Push (TODO 시간 알람) | 알람이 핵심 요구가 될 때 |
| 4차 | Capacitor 래핑 (스토어·로컬 알림) | 스토어 배포·부모 통제·알람 신뢰도 필요 시 |
| 5차 | 오프라인 읽기 전용 캐시 | 네트워크 불안정 환경 대응 필요 시 |

---

## 부록 A — 작업 시작 명령어

```bash
cd frontend

# 1. 패키지 설치
npm install @ducanh2912/next-pwa

# 2. 아이콘 준비 후 config·layout 수정 (본 문서 §9 참고)

# 3. 빌드·로컬 프로덕션 모드 실행
npm run build
npm run start

# 4. (실기기) HTTPS 터널 예시
# npx ngrok http 3000
```

## 부록 B — 참고 링크

- [Next.js Metadata — manifest](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [@ducanh2912/next-pwa (npm)](https://www.npmjs.com/package/@ducanh2912/next-pwa)
- [web.dev — PWA](https://web.dev/explore/progressive-web-apps)
- [Apple — Web Push in Web Apps (iOS 16.4+)](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
- [Google Family Link — 앱 시간 제한](https://support.google.com/families/answer/15957417)

---

## 문서 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-06-09 | 초안 작성 — 앱 전략 검토, PWA 실증 범위, 구현 가이드 통합 |
