# Show Me The Plan — 클라우드 배포 검토 (2026-06)

> **문서 목적:** 고정 IP PC(self-hosted)에서 클라우드로 이전할 때, **비용 대비 효율**이 좋은 구성을 조사·비교한다.  
> **작성 기준일:** 2026-06-11  
> **대상 프로젝트:** `routine-maker` (Next.js 14 + Strapi 5 + PostgreSQL + Caddy + PWA)

---

## 목차

1. [현재 아키텍처 요약](#1-현재-아키텍처-요약)
2. [클라우드 이전 시 요구사항](#2-클라우드-이전-시-요구사항)
3. [후보 아키텍처 4가지](#3-후보-아키텍처-4가지)
4. [비용 비교표](#4-비용-비교표)
5. [시나리오별 추천](#5-시나리오별-추천)
6. [마이그레이션 난이도](#6-마이그레이션-난이도)
7. [국내·해외·지연 관점](#7-국내해외지연-관점)
8. [최종 권장안](#8-최종-권장안)
9. [이전 체크리스트](#9-이전-체크리스트)

---

## 1. 현재 아키텍처 요약

```
Internet → Caddy (:443) → Next.js (:3000)
                              ↓ (Docker 내부)
                           Strapi (:1337) → PostgreSQL (:5432)
```

| 구성 | 기술 |
|------|------|
| 프론트 | Next.js 14 (standalone), NextAuth, PWA |
| 백엔드 | Strapi 5 (Node 20) |
| DB | PostgreSQL 16 |
| 프록시/TLS | Caddy (Let's Encrypt) |
| 배포 | Docker Compose (4 서비스) |
| 도메인 | Duck DNS (`rmaker.duckdns.org`) |

**클라우드 이전의 핵심 이점:** 전기·PC 가동·공유기 포트포워딩·IP 변경 부담 제거, 백업·가용성 개선.

---

## 2. 클라우드 이전 시 요구사항

| 항목 | 필요 이유 |
|------|-----------|
| **HTTPS + 도메인** | PWA 설치, NextAuth 세션 |
| **최소 4 GB RAM** | Strapi 빌드·실행 + Next.js + Postgres 동시 구동 |
| **영속 볼륨** | PostgreSQL 데이터, Strapi `uploads/` |
| **Docker 지원** (권장) | 현재 `docker-compose.yml` 재사용 |
| **아웃바운드 HTTPS** | NEIS Open API (Strapi → 외부) |
| **백업** | DB + 업로드 파일 |

---

## 3. 후보 아키텍처 4가지

### A. 단일 VPS + Docker Compose (현재와 동일) ⭐ 가성비 1위

```
[ VPS 1대 ]
  docker compose up
  ├── caddy
  ├── frontend
  ├── strapi
  └── postgres
```

| 장점 | 단점 |
|------|------|
| **코드·설정 변경 거의 없음** | VPS 직접 관리(패치, 방화벽) |
| 월 **€4~$24** 수준 | 단일 장애점(SPOF) |
| 고정 IP PC와 동일 운영 | Auto-scaling 없음 |

**적합:** 실증(PoC) ~ 소규모 운영(동시 사용자 수십~수백 명)

---

### B. 단일 VPS + Coolify (셀프호스팅 PaaS)

```
[ VPS 1대 ]
  Coolify (관리 UI)
  ├── Git push → 자동 배포
  ├── frontend / strapi / postgres
  └── Caddy 또는 Traefik (Coolify 내장)
```

| 장점 | 단점 |
|------|------|
| Git push 배포 (배포 PC SSH 불필요) | Coolify 학습·설치 1~2시간 |
| VPS 1대로 A안과 비슷한 비용 | Coolify 자체 리소스 ~500MB RAM |
| SSL·도메인 UI 관리 | |

**적합:** VPS는 쓰되 **배포 자동화**를 원할 때

---

### C. PaaS 분리 (Railway / Render / Fly.io)

```
[Railway 또는 Fly.io]
  ├── frontend (Docker)
  ├── strapi (Docker)
  └── postgres (managed 또는 컨테이너)
```

| 장점 | 단점 |
|------|------|
| 인프라 관리 최소 | **usage 기반 과금** → Strapi always-on 시 비쌀 수 있음 |
| Git 연동 배포 | Docker Compose 그대로는 **플랫폼별 분리** 필요 |
| managed DB 옵션 | egress·볼륨 추가 비용 |

**적합:** VPS 관리 싫고, 월 **$15~40** 감수 가능할 때

---

### D. 프론트/백 분리 (Vercel + Strapi 호스팅 + Managed DB)

```
Vercel (Next.js)  →  Strapi (Railway/Fly/VPS)  →  Neon/Supabase (Postgres)
```

| 장점 | 단점 |
|------|------|
| Next.js 배포·CDN 최적 | **구성 복잡**, env·CORS·URL 3곳 관리 |
| 프론트 글로벌 CDN | Strapi Admin URL 별도 |
| | Vercel + Strapi + DB **합산 $30~50+/월** |

**적합:** 트래픽 급증·글로벌 CDN이 필요할 때. **현 단계 PoC에는 과투자.**

---

## 4. 비용 비교표

> 2026년 6월 기준 공개 요금. 환율·VAT·리전에 따라 변동. **실제 견적은 각 콘솔에서 확인.**

### 단일 VPS (Docker Compose — 현재 구조 그대로)

| 제공자 | 스펙 (대략) | 월 비용 | 비고 |
|--------|-------------|---------|------|
| **[Hetzner CX23](https://www.hetzner.com/cloud)** | 2 vCPU, 4 GB, 40 GB NVMe | **~€3.99** (~₩6,000) | 가성비 최상, EU 리전 |
| **[Oracle Cloud Always Free](https://www.oracle.com/cloud/free/)** | ARM 4 OCPU, 24 GB, 200 GB | **$0** | ARM64, 용량 부족 시 생성 어려움 |
| **[Vultr](https://www.vultr.com/pricing/)** | 2 vCPU, 4 GB | **~$24/월** | 싱가포르/도쿄 리전 |
| **[AWS Lightsail](https://aws.amazon.com/lightsail/pricing/)** | 2 vCPU, 4 GB, 80 GB | **$24/월** | IPv6-only 시 $20 |
| **[DigitalOcean](https://www.digitalocean.com/pricing/droplets)** | 2 vCPU, 4 GB | **~$24/월** | UI 단순 |

**Show Me The Plan 권장 최소 스펙:** 2 vCPU / **4 GB RAM** / 40 GB+ SSD

---

### PaaS (분리 배포)

| 제공자 | 소규모 always-on (frontend+strapi+DB) | 비고 |
|--------|----------------------------------------|------|
| **[Railway](https://railway.app/pricing)** | **$15~35/월** | Hobby $5 + usage, Git 배포 편함 |
| **[Render](https://render.com/pricing)** | **$14~33/월** | Free tier cold start, Starter $7/서비스 |
| **[Fly.io](https://fly.io/docs/about/pricing/)** | **$10~25/월** | always-on VM 기준, CLI/Dockerfile |

---

### Managed DB만 분리 (VPS + 외부 Postgres)

| 제공자 | Free tier | Paid 시작 | Strapi 연동 |
|--------|-----------|-----------|-------------|
| **[Neon](https://neon.com/pricing)** | 0.5 GB, scale-to-zero | ~$19/월 | ✅ `DATABASE_URL` |
| **[Supabase](https://supabase.com/pricing)** | 500 MB, 7일 idle pause | $25/월 | ✅ Postgres만 사용 가능 |

> Strapi는 **항상 DB 연결**이 필요하므로 Neon free tier의 cold start(수백 ms)는 소규모 PoC에만 적합.

---

### 국내 클라우드 (참고)

| 제공자 | 특징 | 월 비용 (대략) |
|--------|------|----------------|
| **Naver Cloud Platform (NCP)** | 국내 리전, 한글 지원 | Micro ~₩20,000~ |
| **KT Cloud / 카페24 VPS** | 국내 지연 최소 | ₩15,000~40,000 |

> 해외 VPS(싱가포르/도쿄)도 한국 사용자 기준 **체감 지연 50~100ms** 수준으로 PoC에 충분한 경우가 많음.

---

## 5. 시나리오별 추천

### 🥇 PoC / 실증 / 사용자 ~100명 — **A안: Hetzner VPS + Docker Compose**

```
월 ~€4~7 (약 ₩6,000~10,000)
```

| 항목 | 선택 |
|------|------|
| VPS | Hetzner CX23 (4 GB) 또는 Oracle Free ARM (비용 $0) |
| 배포 | 현재 `docker-compose.yml` 그대로 |
| 도메인 | Duck DNS 또는 Cloudflare DNS |
| TLS | Caddy (현재와 동일) |
| 변경량 | **최소** — `.env` URL만 수정 |

**이유:** 고정 IP PC와 **100% 동일 구조**, 마이그레이션 1~2시간, 월 비용 최저.

---

### 🥈 배포 자동화까지 — **B안: Hetzner + Coolify**

```
월 ~€4~7 + Coolify(오픈소스, 무료)
```

Git push → 자동 빌드·배포. 배포 PC SSH·수동 `docker compose` 제거.

---

### 🥉 VPS 관리 기피 — **C안: Railway**

```
월 ~$15~25
```

| 서비스 | Railway |
|--------|---------|
| frontend | Docker 또는 Nixpacks |
| strapi | Docker |
| postgres | Railway Plugin |

Docker Compose를 **서비스 3개로 분리**하는 설정 작업 필요 (1~2일).

---

### ❌ 현 단계 비추천 — D안: Vercel + 분리

- NextAuth + BFF + Strapi 내부 URL 구조 변경
- CORS·`NEXTAUTH_URL`·`STRAPI_URL` 재설계
- 월 $30+ , PoC 대비 복잡도 높음

---

## 6. 마이그레이션 난이도

| 방안 | 작업량 | 코드 변경 | 예상 시간 |
|------|--------|-----------|-----------|
| **A VPS + Compose** | `.env`, DNS, 방화벽 | 없음 | **2~4시간** |
| **B VPS + Coolify** | Coolify 설치 + 앱 등록 | 없음 | **반나절** |
| **C Railway/Render** | compose → 서비스 분리 | env만 | **1~2일** |
| **D Vercel 분리** | URL·CORS·배포 파이프라인 | 중간 | **2~3일** |

### A안 이전 순서 (권장)

```
1. VPS 생성 (Ubuntu 24.04, Docker 설치)
2. git clone + .env 작성
3. docker compose up -d --build
4. Duck DNS IP → VPS 공인 IP 변경
5. Caddy HTTPS 확인
6. PostgreSQL 백업 cron 설정
7. (선택) 고정 IP PC 종료
```

---

## 7. 국내·해외·지연 관점

| 요소 | 영향 |
|------|------|
| **NEIS API** | Strapi 서버 → NEIS. VPS 위치(국내/해외) 모두 HTTPS outbound만 되면 OK |
| **PWA 사용자** | 한국 사용자 → **도쿄/싱가포르/서울** 리전 권장 |
| **Strapi Admin** | 관리자만 사용, 지연 민감도 낮음 |
| **Duck DNS** | 클라우드 VPS IP로 A레코드만 변경 |

**Hetzner(독일/핀란드)** 는 한국 RTT ~250ms로 PoC에는 가능하나, 체감을 중시하면 **Vultr Tokyo / Lightsail Seoul(있을 경우) / NCP** 검토.

---

## 8. 최종 권장안

### 단계 1 — 지금 (PoC)

| 항목 | 권장 |
|------|------|
| **클라우드** | [Hetzner Cloud CX23](https://www.hetzner.com/cloud) (4 GB) |
| **구성** | 현재 Docker Compose **그대로** |
| **월 비용** | **~€4 (~₩6,000)** |
| **대안 (무료)** | Oracle Cloud ARM Always Free (생성 가능할 때) |

### 단계 2 — 사용자 증가 / 배포 자동화

| 항목 | 권장 |
|------|------|
| **클라우드** | Hetzner CX33 (8 GB, ~€6.5) 또는 Railway |
| **구성** | Coolify 도입 또는 Railway 3서비스 |
| **월 비용** | **€7~25** |

### 단계 3 — 상용 서비스

| 항목 | 권장 |
|------|------|
| **DB** | Managed Postgres (Neon / RDS) 분리 |
| **앱** | VPS 2대 또는 K8s (과한 경우 많음) |
| **CDN** | Cloudflare (무료) |
| **백업** | 일일 DB dump + uploads S3/R2 |

---

## 9. 이전 체크리스트

### 클라우드 VPS (A안) 이전 시

- [ ] VPS 4 GB RAM 이상
- [ ] Docker + Docker Compose 설치
- [ ] `git clone` + 루트 `.env` 작성
- [ ] `APP_DOMAIN`, `NEXTAUTH_URL`, `CORS_ORIGIN` → 새 도메인
- [ ] Duck DNS / Cloudflare → VPS IP
- [ ] `docker compose up -d --build`
- [ ] `https://도메인` + PWA manifest/sw.js 200 확인
- [ ] PostgreSQL `pg_dump` cron (일 1회)
- [ ] Strapi `uploads` 볼륨 백업

### 비용 절감 팁

1. **단일 VPS**에 전부 올리기 (분리는 트래픽 증가 후)
2. **Cloudflare** 무료 DNS + 프록시 (DDoS·캐시)
3. **Oracle Free**는 $0이지만 ARM·용량 이슈 — PoC 실험용
4. **Reserved/연간 결제** VPS는 10~20% 할인 (트래픽 안정 후)

---

## 요약 한 줄

> **가성비 최우선:** Hetzner CX23(4GB) + **지금과 같은 Docker Compose** (~€4/월)  
> **관리 부담 최소:** Railway 3서비스 (~$15~25/월)  
> **완전 무료 실험:** Oracle Cloud ARM Always Free ($0, 제약 있음)  
> **PoC 단계에서 Vercel 분리는 비추** — 복잡도 대비 이득 적음

---

## 참고 링크

- [Hetzner Cloud Pricing](https://www.hetzner.com/cloud)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [AWS Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/)
- [Railway Pricing](https://railway.app/pricing)
- [Render Pricing](https://render.com/pricing)
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
- [Neon Pricing](https://neon.com/pricing)
- [Coolify (Self-hosted PaaS)](https://coolify.io/)
