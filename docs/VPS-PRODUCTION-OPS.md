# Show Me The Plan — VPS 프로덕션 운영 가이드

> **목적:** Hetzner VPS + GHCR + Cloudflare 배포 후 **자주 쓰는 운영 절차**를 한곳에 정리  
> **대상:** `docker-compose.prod.yml` 기반 pull-only 배포  
> **예시 도메인:** `showmepl.com`  
> **작성 기준:** 2026-06-28

**관련 문서**

- [`HETZNER-VPS-MIGRATION-GUIDE.md`](./HETZNER-VPS-MIGRATION-GUIDE.md) — 최초 이전·설치
- [`PRODUCTION-LAUNCH-GUIDE.md`](./PRODUCTION-LAUNCH-GUIDE.md) — 런칭 전체 로드맵
- [`OPS-OPERATOR-SETUP.md`](./OPS-OPERATOR-SETUP.md) — `/ops` 운영자 계정

---

## 1. 배포 구조 요약

```
사용자 → Cloudflare (DNS/CDN) → Hetzner VPS (Caddy :443)
                                      ├─ frontend:3000  (GHCR 이미지)
                                      ├─ strapi:1337    (GHCR 이미지, 외부 미개방)
                                      └─ postgres       (내부만)
```

| 항목 | 값 예시 |
|------|---------|
| VPS 경로 | `/opt/show-me-the-plan` |
| Compose 파일 | `docker-compose.prod.yml` |
| 환경 변수 | **루트** `.env` (Git 커밋 금지) |
| Frontend 이미지 | `ghcr.io/<github-user>/show-me-the-plan-frontend:latest` |
| Strapi 이미지 | `ghcr.io/<github-user>/show-me-the-plan-strapi:latest` |
| 공개 URL | `https://showmepl.com` |
| Strapi Admin | **공개 URL 없음** — SSH 터널로만 접속 |

---

## 2. Strapi Admin 접속 (SSH 터널)

Strapi Admin(1337)은 **인터넷에 포트를 열지 않습니다.**  
로컬 PC → SSH 터널 → Docker 내부 Strapi 로 접속합니다.

### 2-1. 방법 A — 컨테이너 IP로 터널 (설정 변경 없이 바로 가능)

#### Step 1 — VPS에서 Strapi 컨테이너 IP 확인

VPS SSH:

```bash
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' show-me-the-plan-strapi-1
```

출력 예: `172.18.0.3` (컨테이너 재생성 시 **바뀔 수 있음**)

#### Step 2 — 로컬 PC (Git Bash)에서 SSH 터널

> ⚠️ **`ssh`** 입니다. `sh` 가 아닙니다.  
> ⚠️ **로컬 PC**에서 실행합니다. VPS SSH 창 안에서 실행하지 않습니다.

```bash
ssh -L 1337:<STRAPI_CONTAINER_IP>:1337 root@<VPS_IP>
```

예:

```bash
ssh -L 1337:172.18.0.3:1337 root@204.168.245.213
```

- 로그인 후 **이 터미널 창을 닫지 마세요** (터널 유지)
- `channel ... Connection refused` 가 없어야 정상

#### Step 3 — 로컬 브라우저

```
http://localhost:1337/admin
```

- **`https` 아님**
- **`showmepl.com/admin` 아님** — Caddy에 Admin 경로 없음

---

### 2-2. 방법 B — VPS localhost:1337 바인딩 (권장, IP 변경 없음)

컨테이너 IP가 바뀔 때마다 터널 주소를 바꾸기 귀찮으면, Strapi를 **VPS localhost에만** 노출합니다.

#### VPS — `docker-compose.prod.yml` 수정

`strapi:` 서비스에 추가:

```yaml
  strapi:
    image: ${SMP_STRAPI_IMAGE:?SMP_STRAPI_IMAGE is required}
    ports:
      - "127.0.0.1:1337:1337"
    restart: unless-stopped
    # ... 나머지 동일
```

적용:

```bash
cd /opt/show-me-the-plan
docker compose -f docker-compose.prod.yml up -d
```

#### 로컬 PC — SSH 터널

```bash
ssh -L 1337:localhost:1337 root@<VPS_IP>
```

브라우저: `http://localhost:1337/admin`

`127.0.0.1`만 바인딩하므로 **외부 인터넷에서는 1337 접속 불가** (보안 유지).

---

### 2-3. 자주 하는 실수

| 실수 | 결과 | 올바른 방법 |
|------|------|-------------|
| `sh -L ...` | `invalid option` | **`ssh -L ...`** |
| VPS 안에서 `ssh -L ...` | 터널 의미 없음 | **로컬 PC** Git Bash |
| `ssh -L 1337:localhost:1337` (포트 매핑 없을 때) | `Connection refused` | 컨테이너 IP 사용 또는 **방법 B** |
| `scp`를 VPS에서 실행 | `No such file` | **로컬 → VPS** 방향으로 scp |
| `https://localhost:1337/admin` | SSL 오류 | **`http://`** |
| 터널 SSH 창 닫음 | 브라우저 연결 끊김 | 터널 세션 **유지** |

---

### 2-4. Admin 접속 안 될 때

VPS에서:

```bash
cd /opt/show-me-the-plan
docker compose -f docker-compose.prod.yml ps strapi
docker compose -f docker-compose.prod.yml logs --tail=30 strapi
```

- Strapi가 **Up** 이 아니면 로그 확인
- 컨테이너 IP 재확인 후 터널 명령 갱신

---

## 3. `.env` 업로드 (로컬 → VPS)

프로덕션 `.env`는 **프로젝트 루트** `/.env` (VPS: `/opt/show-me-the-plan/.env`).

로컬 PC (Git Bash):

```bash
scp /d/show-me-the-plan/.env root@<VPS_IP>:/opt/show-me-the-plan/.env
```

생성:

```bash
cd /d/show-me-the-plan
node scripts/generate-production-env.mjs --domain showmepl.com --out .env
# REPLACE_* 수동 입력 + SMP_*_IMAGE 확인
```

---

## 4. GHCR 이미지 배포 / 업데이트

GitHub Actions가 `main` push 시 GHCR에 이미지를 올립니다. VPS는 **빌드하지 않고 pull**만 합니다.

### 최초 / 업데이트 (VPS)

```bash
docker login ghcr.io -u <GITHUB_USERNAME>
# Password: GitHub PAT (read:packages)

cd /opt/show-me-the-plan
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

4개 **Up**: `postgres`, `strapi`, `frontend`, `caddy`

### 로그

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 caddy
docker compose -f docker-compose.prod.yml logs --tail=50 strapi
docker compose -f docker-compose.prod.yml logs --tail=50 frontend
```

---

## 5. Cloudflare — www → apex 리다이렉트

`showmepl.com`은 되는데 `www.showmepl.com`에서 **525 SSL** 이 나오면:

- origin(Caddy)에 `www` 인증서/설정 없음 + Cloudflare Proxied 조합이 흔한 원인

### DNS (필수)

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `<VPS_IP>` | Proxied 권장 |
| A | `www` | `<VPS_IP>` | **`@`와 동일** |

`www`가 **Proxied(주황)** 가 아니면 Redirect Rule이 적용되지 않을 수 있음.

### Redirect Rule

- **When:** `(http.host eq "www.showmepl.com")`
- **Then (Dynamic):** `concat("https://showmepl.com", http.request.uri.path)`
- **Status:** 301
- **Preserve query string:** ON

### SSL/TLS

- **Encryption mode:** **Full (strict)**

---

## 6. Strapi Admin vs 앱 `/ops`

| | Strapi Admin | 앱 Operator |
|--|--------------|-------------|
| URL | `http://localhost:1337/admin` (터널) | `https://showmepl.com/ops` |
| 용도 | CMS·DB·플러그인 설정 | CS·구독·매니저 승인 |
| 설정 | Admin UI에서 계정 생성 | [`OPS-OPERATOR-SETUP.md`](./OPS-OPERATOR-SETUP.md) |

---

## 7. 빠른 치트시트

```bash
# --- 로컬 PC ---
# Strapi Admin (컨테이너 IP 방식)
ssh -L 1337:<CONTAINER_IP>:1337 root@<VPS_IP>
# 브라우저: http://localhost:1337/admin

# .env 업로드
scp /d/show-me-the-plan/.env root@<VPS_IP>:/opt/show-me-the-plan/.env

# --- VPS ---
cd /opt/show-me-the-plan
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' show-me-the-plan-strapi-1
```

---

## 8. 다음 단계 (런칭 후)

- [ ] Strapi Admin 계정 생성
- [ ] Operator 계정 — [`OPS-OPERATOR-SETUP.md`](./OPS-OPERATOR-SETUP.md)
- [ ] Brevo 메일·NEIS·결제 QA — [`PRODUCTION-LAUNCH-GUIDE.md`](./PRODUCTION-LAUNCH-GUIDE.md)
- [ ] PortOne live + webhook — [`BILLING-PRODUCTION-GO-LIVE.md`](./BILLING-PRODUCTION-GO-LIVE.md)
- [ ] 백업 cron — [`HETZNER-VPS-MIGRATION-GUIDE.md`](./HETZNER-VPS-MIGRATION-GUIDE.md) Phase 8
