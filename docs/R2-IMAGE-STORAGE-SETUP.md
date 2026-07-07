# Show Me The Plan — Cloudflare R2 이미지 스토리지 설정 가이드

> **문서 목적:** 일정 첨부 이미지 저장소를 VPS 로컬 디스크에서 **Cloudflare R2**로 전환한 작업을 정리한다.  
> **작성 기준일:** 2026-07-05  
> **적용 상태:** 로컬·프로덕션(VPS) 검증 완료

**한 줄 요약**

> 앱(`showmepl.com`)과 별도 Cloudflare 계정·도메인(`plan-media.odap-coach.com`)의 R2 버킷에 Strapi Upload 플러그인으로 이미지를 저장하고, CDN URL로 브라우저에 표시한다. **앱 코드 변경 없이 환경 변수만** 설정한다.

---

## 목차

1. [배경·범위](#1-배경범위)
2. [아키텍처](#2-아키텍처)
3. [Cloudflare R2 설정](#3-cloudflare-r2-설정)
4. [환경 변수](#4-환경-변수)
5. [로컬 개발 환경 테스트](#5-로컬-개발-환경-테스트)
6. [Hetzner VPS 프로덕션 적용](#6-hetzner-vps-프로덕션-적용)
7. [검증 체크리스트](#7-검증-체크리스트)
8. [트러블슈팅](#8-트러블슈팅)
9. [롤백](#9-롤백)
10. [관련 문서·코드](#10-관련-문서코드)

---

## 1. 배경·범위

### 무엇을 저장하는가

- **유일한 이미지 업로드 UI:** `ScheduleAttachmentField` (종일 일정 첨부, 최대 5장·장당 5MB)
- **업로드 경로:** Frontend → Next.js BFF → Strapi `uploadAttachment` → Strapi Upload 플러그인 → 저장소

### 무엇을 바꾸지 않았는가

- Frontend / Backend 업로드 API 코드
- DB 백업 — 별도 Cloudflare 계정 R2 (**완료**, [`R2-DB-BACKUP-SETUP.md`](./R2-DB-BACKUP-SETUP.md))
- Caddy `/uploads` 프록시 (R2 URL은 CDN으로 직접 접근, 프록시 불필요)

### 인프라 분리

| 구분 | 도메인/계정 |
|------|-------------|
| 앱 (Next.js + Strapi API) | `showmepl.com` — Hetzner VPS |
| 이미지 CDN + R2 | `odap-coach.com` — 별도 Cloudflare 계정 |
| 이미지 공개 URL | `https://plan-media.odap-coach.com` |

앱 도메인과 이미지 CDN 도메인이 **달라도 문제 없음** (`<img src>` cross-origin).

---

## 2. 아키텍처

```
[브라우저] ScheduleAttachmentField
    ↓ POST /api/user-schedules/attachments/upload
[Next.js BFF :3000]
    ↓ JWT
[Strapi :1337] uploadScheduleAttachmentFile()
    ↓ strapi.plugin('upload').upload()
[Cloudflare R2] 버킷 show-me-the-plan-media
    ↓ 공개 URL
[CDN] plan-media.odap-coach.com
```

### 프로젝트 내 관련 코드 (변경 불필요)

| 파일 | 역할 |
|------|------|
| `backend/config/upload-provider.ts` | `UPLOAD_PROVIDER=r2` → `@strapi/provider-upload-aws-s3` 설정 |
| `backend/config/plugins.ts` | Upload 플러그인 config 주입 |
| `backend/config/middlewares.ts` | CDN origin CSP 자동 허용 |
| `backend/src/services/schedule-attachment.ts` | Strapi Upload API 호출 |
| `frontend/src/lib/schedule-attachment.ts` | `resolveScheduleAttachmentUrl()` — CDN base URL 해석 |

---

## 3. Cloudflare R2 설정

### 3-1. 버킷

- **Cloudflare 계정:** 이미지 전용 (앱·DB 백업과 분리)
- **버킷 이름:** `show-me-the-plan-media`
- **Account ID:** `9f3bf73cc934e0af1a4db2587d3b074c`
- **S3 API Endpoint:** `https://9f3bf73cc934e0af1a4db2587d3b074c.r2.cloudflarestorage.com`

### 3-2. API 토큰

| 항목 | 값 |
|------|-----|
| Token name | `show-me-the-plan` |
| Permissions | **Object Read & Write** |
| Bucket scope | **Apply to specific buckets only** → `show-me-the-plan-media` |
| TTL | Forever (또는 운영 정책에 따라 기한 설정) |

발급 후 저장:

- `UPLOAD_S3_ACCESS_KEY_ID`
- `UPLOAD_S3_SECRET_ACCESS_KEY`

> **Admin Read & Write**는 버킷 생성/삭제까지 가능해 권한이 과함. **Object Read only**는 Strapi 업로드·삭제에 부적합.

### 3-3. Custom domain (공개 CDN)

| 항목 | 값 |
|------|-----|
| R2 Custom domain | `plan-media.odap-coach.com` |
| DNS (Cloudflare) | R2 타입 레코드 — 자동 연결 (기존 `assets.odap-coach.com`, `church-media.odap-coach.com`과 동일 패턴) |
| Public access | Custom domain **Active** + HTTPS |

서브도메인을 프로젝트별로 분리한 이유:

- `odap-coach.com` 루트 → Vercel (A 레코드)
- `assets.odap-coach.com` → 다른 R2 버킷
- `plan-media.odap-coach.com` → **Show Me The Plan 전용**

---

## 4. 환경 변수

### Strapi (R2 업로드·삭제)

```env
UPLOAD_PROVIDER=r2

UPLOAD_S3_ACCESS_KEY_ID=<R2 Access Key ID>
UPLOAD_S3_SECRET_ACCESS_KEY=<R2 Secret Access Key>
UPLOAD_S3_BUCKET=show-me-the-plan-media
UPLOAD_S3_REGION=auto
UPLOAD_S3_ENDPOINT=https://9f3bf73cc934e0af1a4db2587d3b074c.r2.cloudflarestorage.com
UPLOAD_S3_BASE_URL=https://plan-media.odap-coach.com

# R2는 ACL 미지원 — 설정하지 않음
# UPLOAD_S3_ACL=
# UPLOAD_S3_ROOT_PATH=        # 선택: 버킷 내 prefix
# UPLOAD_S3_FORCE_PATH_STYLE=false
```

### Frontend (이미지 URL 해석 — 빌드 시 번들)

```env
NEXT_PUBLIC_UPLOAD_BASE_URL=https://plan-media.odap-coach.com
```

| 변수 | 로컬 | VPS 프로덕션 |
|------|------|--------------|
| Strapi R2 | `backend/.env` | `/opt/show-me-the-plan/.env` |
| Frontend CDN | `frontend/.env.local` | GitHub Actions Variable + frontend 이미지 재빌드 |

> `UPLOAD_S3_BASE_URL`과 `NEXT_PUBLIC_UPLOAD_BASE_URL`은 **동일한 CDN URL**을 사용한다.

---

## 5. 로컬 개발 환경 테스트

### 5-1. 설정

1. `backend/.env` — 위 Strapi R2 변수 추가 (`UPLOAD_PROVIDER=local` → `r2`로 교체)
2. `frontend/.env.local` — `NEXT_PUBLIC_UPLOAD_BASE_URL=https://plan-media.odap-coach.com`

### 5-2. dev 서버 재시작

```bash
# 터미널 1
cd backend && npm run develop

# 터미널 2
cd frontend && npm run dev
```

Strapi upload provider 설정은 **hot reload 되지 않음** → 반드시 Strapi 재시작.

### 5-3. 테스트

1. `http://localhost:3000` 로그인
2. **종일 일정** → 첨부 이미지 업로드 (종일이 아니면 첨부 불가)
3. URL이 `https://plan-media.odap-coach.com/...` 인지 확인
4. Cloudflare R2 버킷 Objects에 파일 생성 확인

### 5-4. 주의

- 로컬 테스트도 **실제 R2 버킷**에 파일이 올라감 (로컬 SQLite DB와 R2는 별개)
- 테스트 파일은 R2 대시보드에서 수동 삭제 가능

---

## 6. Hetzner VPS 프로덕션 적용

### 6-1. 서버 정보

| 항목 | 값 |
|------|-----|
| VPS | Hetzner (예: `ubuntu-4gb-hel1-2`) |
| SSH | `ssh root@204.168.245.213` |
| 프로젝트 경로 | `/opt/show-me-the-plan` |
| Compose | `docker-compose.prod.yml` (GHCR 이미지 pull) |

### 6-2. `.env` 수정 (Git Bash)

```bash
ssh root@204.168.245.213
cd /opt/show-me-the-plan
cp .env .env.backup-$(date +%Y%m%d)
nano .env
```

파일 **맨 아래**에 R2 블록 추가 (기존 `UPLOAD_PROVIDER=local`이 있으면 **교체**, 중복 금지).

저장: `Ctrl+O` → `Enter` → `Ctrl+X`

```bash
grep UPLOAD .env
grep NEXT_PUBLIC_UPLOAD .env
chmod 600 .env
```

### 6-3. Strapi 재시작

```bash
docker compose -f docker-compose.prod.yml up -d strapi
docker compose -f docker-compose.prod.yml exec strapi printenv UPLOAD_PROVIDER UPLOAD_S3_BASE_URL
docker compose -f docker-compose.prod.yml logs strapi --tail 30
```

기대: `r2`, `https://plan-media.odap-coach.com`

### 6-4. Frontend 재빌드 (필수)

`NEXT_PUBLIC_*`는 Docker 이미지 **빌드 시** 주입된다.

1. GitHub → **Settings → Secrets and variables → Actions → Variables**
   - `NEXT_PUBLIC_UPLOAD_BASE_URL` = `https://plan-media.odap-coach.com`
2. **Actions → Publish Docker images → Run workflow**
3. VPS:

```bash
docker compose -f docker-compose.prod.yml pull frontend
docker compose -f docker-compose.prod.yml up -d frontend
docker compose -f docker-compose.prod.yml ps
```

### 6-5. 프로덕션 테스트

1. `https://showmepl.com` 로그인
2. 종일 일정 → 이미지 업로드
3. `plan-media.odap-coach.com` URL로 표시 확인

---

## 7. 검증 체크리스트

### Cloudflare

- [x] R2 버킷 `show-me-the-plan-media` 생성
- [x] API 토큰 (Object Read & Write, 버킷 scoped)
- [x] Custom domain `plan-media.odap-coach.com` Active

### 로컬

- [x] `backend/.env` R2 설정
- [x] `frontend/.env.local` CDN URL
- [x] 종일 일정 첨부 업로드 성공

### VPS

- [x] `/opt/show-me-the-plan/.env` R2 설정
- [x] Strapi 재시작 · env 확인
- [x] GitHub Variable + frontend 이미지 재빌드
- [x] `showmepl.com` 업로드·표시 성공

---

## 8. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| Strapi 기동 실패 | `UPLOAD_S3_*` 누락 | `.env` 필수 3종: bucket, access key, secret |
| 업로드 400/500 | R2 토큰·버킷명 오류 | 토큰 scope·버킷명 재확인, Strapi 로그 |
| 업로드 OK, 화면 404 | Frontend CDN URL 미반영 | `NEXT_PUBLIC_UPLOAD_BASE_URL` + **frontend 재빌드** |
| URL이 `/uploads/...` | `UPLOAD_PROVIDER=local` 잔존 | `.env`에서 `r2`로 교체, Strapi 재시작 |
| URL이 localhost | 프로덕션 frontend 미재빌드 | GitHub workflow + `pull frontend` |
| CDN 403/404 | Custom domain 미연결 | R2 Public access · DNS Active 확인 |
| `UPLOAD_PROVIDER` 중복 | `.env`에 두 번 정의 | `grep UPLOAD .env`로 하나만 남기기 |

---

## 9. 롤백

로컬 디스크 업로드로 되돌리려면:

```env
UPLOAD_PROVIDER=local
```

R2 관련 `UPLOAD_S3_*` 주석 처리 후:

```bash
docker compose -f docker-compose.prod.yml up -d strapi
```

> 기존 R2 URL로 저장된 일정 첨부는 롤백 후 표시되지 않을 수 있음. 로컬 `public/uploads/` 마이그레이션이 필요하면 별도 작업.

---

## 10. 관련 문서·코드

| 문서/파일 | 설명 |
|-----------|------|
| [PRODUCTION-LAUNCH-GUIDE.md](./PRODUCTION-LAUNCH-GUIDE.md) Phase 10 | R2 개요 (본 문서가 실전 상세판) |
| [R2-DB-BACKUP-SETUP.md](./R2-DB-BACKUP-SETUP.md) | DB 백업 R2 (별도 계정·cron) |
| [LOCAL-DB-RESTORE-PRACTICE.md](./LOCAL-DB-RESTORE-PRACTICE.md) | 로컬 DB 덮어쓰기 복구 연습 |
| [R2-CLOUDFLARE-SETUP-SUMMARY.md](./R2-CLOUDFLARE-SETUP-SUMMARY.md) | 이미지 + DB 백업 한눈에 |
| [`.env.example`](../.env.example) | Upload 변수 템플릿 |
| [`backend/config/upload-provider.ts`](../backend/config/upload-provider.ts) | R2/S3 provider 설정 |
| [`.github/workflows/publish-images.yml`](../.github/workflows/publish-images.yml) | Frontend 빌드 args |

### 추후 작업 (본 문서 범위 외)

- DB 백업 → 별도 Cloudflare 계정 R2 — **완료:** [`R2-DB-BACKUP-SETUP.md`](./R2-DB-BACKUP-SETUP.md)
- 기존 VPS 로컬 `/uploads/` → R2 마이그레이션 (필요 시)
