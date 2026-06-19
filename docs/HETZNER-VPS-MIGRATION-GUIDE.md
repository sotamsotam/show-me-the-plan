# Show Me The Plan — Hetzner VPS 이전 가이드 (TodoList)

> **문서 목적:** 고정 IP PC(self-hosted)에서 **Hetzner Cloud VPS**로 Show Me The Plan를 이전할 때 필요한 절차·작업을 단계별 TodoList로 정리한다.  
> **작성 기준일:** 2026-06-11  
> **대상 프로젝트:** `routine-maker`  
> **권장 스펙:** Hetzner **CX23** (2 vCPU, 4 GB RAM, 40 GB NVMe, ~€3.99/월)  
> **배포 방식:** 현재와 동일 — **Docker Compose + Caddy**

---

## 목차

1. [전체 흐름](#1-전체-흐름)
2. [Phase 0 — 사전 준비](#phase-0--사전-준비)
3. [Phase 1 — Hetzner 계정·서버 생성](#phase-1--hetzner-계정서버-생성)
4. [Phase 2 — VPS 초기 설정](#phase-2--vps-초기-설정)
5. [Phase 3 — Docker 설치](#phase-3--docker-설치)
6. [Phase 4 — 프로젝트 배포](#phase-4--프로젝트-배포)
7. [Phase 5 — DNS·HTTPS 전환](#phase-5--dnshttps-전환)
8. [Phase 6 — 데이터 이전 (선택)](#phase-6--데이터-이전-선택)
9. [Phase 7 — 검증·PWA 테스트](#phase-7--검증pwa-테스트)
10. [Phase 8 — 백업·보안](#phase-8--백업보안)
11. [Phase 9 — 구 PC 종료·운영 전환](#phase-9--구-pc-종료운영-전환)
12. [Phase 10 — 이후 업데이트 루틴](#phase-10--이후-업데이트-루틴)
13. [트러블슈팅](#트러블슈팅)
14. [`.env` 프로덕션 예시](#env-프로덕션-예시)

---

## 1. 전체 흐름

```
Phase 0  사전 준비 (계정, 도메인, 시크릿 백업)
    ↓
Phase 1  Hetzner VPS 생성
    ↓
Phase 2  SSH·방화벽·시스템 업데이트
    ↓
Phase 3  Docker + Compose 설치
    ↓
Phase 4  git clone + .env + docker compose up
    ↓
Phase 5  Duck DNS → Hetzner IP 변경 → HTTPS 확인
    ↓
Phase 6  (선택) 기존 PC DB·uploads 이전
    ↓
Phase 7  앱·PWA·로그인 검증
    ↓
Phase 8  백업 cron + 보안 강화
    ↓
Phase 9  구 PC 서비스 중단
```

**예상 소요:** 최초 이전 **반나절~1일** (데이터 이전 포함 시 +2~4시간)

---

## Phase 0 — 사전 준비

> 고정 IP PC에서 운영 중인 설정·데이터를 정리하는 단계

### 0-1. 현재 환경 백업

- [ ] 배포 PC 루트 `.env` 내용을 **안전한 곳에 백업** (비밀번호 관리자 등)
- [ ] `NEXTAUTH_SECRET`, Strapi `APP_KEYS`, `JWT_SECRET` 등 **기존 값 유지** 목록 확인
- [ ] `NEIS_KEY` 값 확인
- [ ] GitHub 저장소 접근 가능 (private → PAT 또는 SSH)

### 0-2. 기존 데이터 백업 (데이터 이전할 경우)

- [ ] PostgreSQL 덤프
  ```bash
  docker compose exec postgres pg_dump -U strapi strapi > backup.sql
  ```
- [ ] Strapi 업로드 파일 백업
  ```bash
  docker compose cp strapi:/opt/app/public/uploads ./uploads-backup
  ```
- [ ] 백업 파일을 개발 PC 또는 클라우드 스토리지에 보관

### 0-3. 도메인·DNS 계획

- [ ] 도메인 결정: **Duck DNS 유지** (`rmaker.duckdns.org`) 또는 자체 도메인
- [ ] Duck DNS 계정 로그인 확인
- [ ] (선택) Cloudflare DNS로 전환 계획

### 0-4. 결제·계정

- [ ] Hetzner Cloud 계정 생성: https://www.hetzner.com/cloud
- [ ] 결제 수단 등록 (신용카드 / PayPal)
- [ ] (EU 개인) VAT 처리 방식 확인

---

## Phase 1 — Hetzner 계정·서버 생성

### 1-1. 프로젝트 생성

- [ ] Hetzner Cloud Console → **New Project** 생성 (예: `routine-maker`)

### 1-2. 서버 생성 (CX23 권장)

- [ ] **Add Server** 클릭
- [ ] **Location:** Falkenstein (fsn1) 또는 Helsinki (hel1) — EU 최저가
  - 한국 사용자 체감 지연 중시 시: **Singapore** 리전은 요금 +40~67% ([Hetzner 요금](https://www.hetzner.com/cloud))
- [ ] **Image:** Ubuntu **24.04** LTS
- [ ] **Type:** **CX23** (2 vCPU, 4 GB RAM, 40 GB NVMe, ~€3.99/월)
  - Strapi 빌드 시 메모리 부족하면 **CX33** (8 GB, ~€6.49/월)로 시작
- [ ] **Networking:** IPv4 + IPv6 (IPv4 필수 — Let's Encrypt·일반 접속)
- [ ] **SSH key** 등록 (아래 1-3 참고)
- [ ] **Server name:** `routine-maker-prod`
- [ ] 서버 생성 완료 → **공인 IPv4 주소** 기록 (예: `95.xxx.xxx.xxx`)

### 1-3. SSH 키 생성 (로컬 PC에서, 없을 경우)

```bash
ssh-keygen -t ed25519 -C "hetzner-routine-maker"
```

- [ ] 공개키 복사: `cat ~/.ssh/id_ed25519.pub`
- [ ] Hetzner Console → **Security → SSH Keys** → 키 등록
- [ ] 로컬에서 접속 테스트:
  ```bash
  ssh root@<HETZNER_IP>
  ```

### 1-4. 방화벽 (Hetzner Cloud Firewall — 권장)

- [ ] Console → **Firewalls → Create Firewall**
- [ ] Inbound 규칙:
  | 포트 | 프로토콜 | 소스 | 용도 |
  |------|----------|------|------|
  | 22 | TCP | 내 IP만 (또는 0.0.0.0/0) | SSH |
  | 80 | TCP | 0.0.0.0/0, ::/0 | HTTP (Let's Encrypt) |
  | 443 | TCP | 0.0.0.0/0, ::/0 | HTTPS |
- [ ] Outbound: All (기본)
- [ ] 생성한 서버에 Firewall **적용**

> Strapi Admin(1337)은 **외부 개방 불필요**. SSH 터널로 접근 (Phase 8 참고).

---

## Phase 2 — VPS 초기 설정

SSH 접속 후 서버에서 실행:

```bash
ssh root@<HETZNER_IP>
```

### 2-1. 시스템 업데이트

- [ ] 패키지 업데이트
  ```bash
  apt update && apt upgrade -y
  ```
- [ ] 타임존 설정 (한국)
  ```bash
  timedatectl set-timezone Asia/Seoul
  ```

### 2-2. (권장) 일반 사용자 생성

- [ ] 배포 전용 사용자 생성
  ```bash
  adduser deploy
  usermod -aG sudo deploy
  rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
  ```
- [ ] 이후 `deploy` 사용자로 작업 (root 직접 사용 지양)

### 2-3. (선택) swap 추가 — 4 GB RAM 서버 권장

Strapi Docker **빌드** 시 메모리 부족 방지:

- [ ] 2 GB swap 생성
  ```bash
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```

### 2-4. 호스트 방화벽 (UFW)

- [ ] UFW 설치·설정
  ```bash
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw enable
  ufw status
  ```

---

## Phase 3 — Docker 설치

### 3-1. Docker Engine + Compose

- [ ] 공식 스크립트로 설치
  ```bash
  curl -fsSL https://get.docker.com | sh
  ```
- [ ] deploy 사용자를 docker 그룹에 추가
  ```bash
  usermod -aG docker deploy
  ```
- [ ] 재로그인 후 확인
  ```bash
  docker --version
  docker compose version
  ```

### 3-2. Docker 자동 시작

- [ ] 부팅 시 Docker 기동 확인
  ```bash
  systemctl enable docker
  systemctl status docker
  ```

---

## Phase 4 — 프로젝트 배포

### 4-1. 저장소 clone

```bash
sudo -u deploy -i
cd ~
git clone https://github.com/sotamsotam/routine-maker.git
cd routine-maker
```

- [ ] private 저장소: PAT 또는 SSH clone
- [ ] `git log -1` → 최신 커밋(PWA 포함) 확인

### 4-2. `.env` 생성

- [ ] `.env.example` 복사
  ```bash
  cp .env.example .env
  nano .env
  ```
- [ ] **기존 배포 PC `.env` 값**을 그대로 복사 (시크릿 유지)
- [ ] 아래 항목은 Hetzner용으로 수정 (Phase 5에서 도메인 확정 후 최종 확인)
  ```env
  APP_DOMAIN=rmaker.duckdns.org
  NEXTAUTH_URL=https://rmaker.duckdns.org
  CORS_ORIGIN=https://rmaker.duckdns.org
  ```

### 4-3. 최초 빌드·기동

- [ ] 빌드 (Strapi 최초 빌드 10~15분 소요 가능)
  ```bash
  docker compose up -d --build
  ```
- [ ] 컨테이너 상태 확인
  ```bash
  docker compose ps
  ```
- [ ] 4개 서비스 모두 `Up` 확인: `postgres`, `strapi`, `frontend`, `caddy`
- [ ] 로그 확인
  ```bash
  docker compose logs -f
  # Ctrl+C로 종료
  ```

### 4-4. Strapi Admin 최초 설정 (새 DB일 경우)

- [ ] SSH 터널로 Admin 접속 (로컬 PC에서)
  ```bash
  ssh -L 1337:localhost:1337 deploy@<HETZNER_IP>
  ```
- [ ] 브라우저: `http://localhost:1337/admin`
- [ ] 관리자 계정 생성
- [ ] (기존 DB 이전 시 이 단계 생략)

---

## Phase 5 — DNS·HTTPS 전환

### 5-1. Duck DNS IP 변경

- [ ] https://www.duckdns.org 로그인
- [ ] `rmaker` 도메인 → **Current IP**를 Hetzner VPS IPv4로 변경
- [ ] **update ip** 클릭
- [ ] DNS 전파 확인 (1~5분)
  ```bash
  nslookup rmaker.duckdns.org
  # → Hetzner IP와 일치해야 함
  ```

### 5-2. `.env` 최종 확인

- [ ] `APP_DOMAIN=rmaker.duckdns.org` (https 없이)
- [ ] `NEXTAUTH_URL=https://rmaker.duckdns.org` (https, 끝에 `/` 없음)
- [ ] `CORS_ORIGIN=https://rmaker.duckdns.org`
- [ ] 변경 시 재시작
  ```bash
  docker compose up -d
  docker compose up -d --build frontend  # NEXTAUTH_URL 변경 시 frontend 재빌드
  ```

### 5-3. HTTPS·Caddy 확인

- [ ] Caddy 로그에서 인증서 발급 확인
  ```bash
  docker compose logs caddy
  ```
- [ ] 브라우저: `https://rmaker.duckdns.org` 접속
- [ ] 자물쇠(HTTPS) 정상 표시

### 5-4. 공유기 포트포워딩 해제 (구 PC)

- [ ] 고정 IP PC 공유기에서 80/443 포트포워딩 **제거** (DNS 전환 후)

---

## Phase 6 — 데이터 이전 (선택)

> 기존 고정 IP PC에 **사용자·일정 데이터**가 있을 때만 수행

### 6-1. PostgreSQL 복원

- [ ] `backup.sql`을 Hetzner 서버로 전송
  ```bash
  scp backup.sql deploy@<HETZNER_IP>:~/
  ```
- [ ] 서버에서 복원
  ```bash
  cd ~/routine-maker
  docker compose exec -T postgres psql -U strapi -d strapi < ~/backup.sql
  ```
- [ ] Strapi 재시작
  ```bash
  docker compose restart strapi
  ```

### 6-2. Strapi uploads 이전

- [ ] 업로드 파일 전송
  ```bash
  scp -r uploads-backup/* deploy@<HETZNER_IP>:~/
  docker compose cp ~/uploads-backup/. strapi:/opt/app/public/uploads/
  ```

### 6-3. 복원 검증

- [ ] 기존 계정으로 로그인 가능
- [ ] 일정·TODO 데이터 존재 확인

---

## Phase 7 — 검증·PWA 테스트

### 7-1. 웹 기능

- [ ] `https://rmaker.duckdns.org` — 메인 페이지
- [ ] 회원가입 (NEIS 학교 검색)
- [ ] 로그인 / 로그아웃
- [ ] 대시보드·캘린더·TODO·통계
- [ ] 매니저 기능 (해당 역할)

### 7-2. PWA

- [ ] `https://rmaker.duckdns.org/manifest.webmanifest` → 200
- [ ] `https://rmaker.duckdns.org/sw.js` → 200
- [ ] `https://rmaker.duckdns.org/icons/icon-192x192.png` → 200
- [ ] Android Chrome: 홈 화면 추가 → 아이콘·standalone 확인
- [ ] iOS Safari: 홈 화면에 추가 → standalone 확인

### 7-3. 성능·리소스

- [ ] 서버 메모리 확인
  ```bash
  free -h
  docker stats --no-stream
  ```
- [ ] 4 GB RAM에서 CPU/RAM 여유 확인 (Strapi+Next+PG 합계 ~2~3 GB)

---

## Phase 8 — 백업·보안

### 8-1. PostgreSQL 자동 백업

- [ ] 백업 스크립트 생성
  ```bash
  mkdir -p ~/backups
  nano ~/backup-db.sh
  ```
  ```bash
  #!/bin/bash
  cd ~/routine-maker
  FILE=~/backups/strapi-$(date +%Y%m%d-%H%M).sql
  docker compose exec -T postgres pg_dump -U strapi strapi > "$FILE"
  find ~/backups -name "strapi-*.sql" -mtime +7 -delete
  ```
- [ ] 실행 권한
  ```bash
  chmod +x ~/backup-db.sh
  ```
- [ ] cron 등록 (매일 새벽 3시)
  ```bash
  crontab -e
  # 0 3 * * * /home/deploy/backup-db.sh
  ```

### 8-2. Strapi uploads 백업 (선택)

- [ ] 주 1회 uploads 볼륨 tarball
  ```bash
  docker compose exec strapi tar czf - /opt/app/public/uploads > ~/backups/uploads-$(date +%Y%m%d).tar.gz
  ```

### 8-3. 보안 강화

- [ ] SSH 비밀번호 로그인 비활성 (키만 허용)
  ```bash
  # /etc/ssh/sshd_config
  PasswordAuthentication no
  systemctl restart sshd
  ```
- [ ] Strapi Admin: **1337 외부 미개방** 유지, SSH 터널만 사용
  ```bash
  # 로컬 PC에서
  ssh -L 1337:localhost:1337 deploy@<HETZNER_IP>
  # → http://localhost:1337/admin
  ```
- [ ] `.env` 권한 제한
  ```bash
  chmod 600 .env
  ```
- [ ] (선택) fail2ban 설치

### 8-4. 모니터링 (선택)

- [ ] UptimeRobot 등 무료 uptime 체크: `https://rmaker.duckdns.org`
- [ ] Hetzner Console → 알림(이메일) 설정

---

## Phase 9 — 구 PC 종료·운영 전환

- [ ] Hetzner에서 **24시간 이상** 안정 운영 확인
- [ ] 고정 IP PC `docker compose down` (서비스 중단)
- [ ] Duck DNS가 Hetzner IP를 가리키는지 재확인
- [ ] (선택) 구 PC Docker 볼륨 보관 또는 삭제
- [ ] 팀/사용자에게 URL 변경 안내 (동일 도메인이면 안내 불필요)

---

## Phase 10 — 이후 업데이트 루틴

### 코드 업데이트 (개발 PC → Hetzner)

**개발 PC:**
```bash
git add .
git commit -m "..."
git push
```

**Hetzner VPS:**
```bash
cd ~/routine-maker
git pull
docker compose up -d --build frontend   # frontend만 변경 시
# docker compose up -d --build          # backend도 변경 시
```

### 정기 점검 (월 1회)

- [ ] `apt update && apt upgrade -y`
- [ ] `docker compose pull` (postgres, caddy 이미지)
- [ ] 백업 파일 존재 확인 (`ls ~/backups/`)
- [ ] 디스크 사용량 (`df -h`)
- [ ] Hetzner 청구서 확인

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `docker compose build` 메모리 부족 | 4 GB RAM 한계 | swap 추가(Phase 2-3) 또는 CX33 업그레이드 |
| HTTPS 인증서 실패 | DNS가 Hetzner IP 아님 / 80 포트 차단 | Duck DNS IP 확인, 방화벽 80/443 개방 |
| 로그인 안 됨 | `NEXTAUTH_URL` 불일치 | `.env` URL 확인 후 frontend 재빌드 |
| PWA 아이콘 안 보임 | manifest/sw 404 | `git pull` + `docker compose build --no-cache frontend` |
| Strapi 빌드 10분+ | 정상 (최초 1회) | 기다리거나 CX33으로 업그레이드 |
| 한국에서 느림 | EU 리전 RTT ~250ms | Singapore 리전 또는 Cloudflare CDN 검토 |

---

## `.env` 프로덕션 예시

```env
# ── App (Caddy + Next.js) ──────────────────────────────────────
APP_DOMAIN=rmaker.duckdns.org
NEXTAUTH_URL=https://rmaker.duckdns.org
NEXTAUTH_SECRET=<기존-값-유지>
CORS_ORIGIN=https://rmaker.duckdns.org

# ── Strapi secrets (기존 값 유지) ─────────────────────────────
APP_KEYS=<key1>,<key2>
API_TOKEN_SALT=<기존-값>
ADMIN_JWT_SECRET=<기존-값>
TRANSFER_TOKEN_SALT=<기존-값>
JWT_SECRET=<기존-값>

# ── PostgreSQL ───────────────────────────────────────────────────
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=<기존-값>

# ── External APIs ──────────────────────────────────────────────
NEIS_KEY=<기존-값>
```

---

## 비용 요약

| 항목 | 월 비용 |
|------|---------|
| Hetzner CX23 (4 GB, EU) | ~€3.99 |
| IPv4 | 포함 |
| Duck DNS | 무료 |
| Let's Encrypt (Caddy) | 무료 |
| **합계** | **~€4 (~₩6,000)** |

---

## 관련 문서

- [CLOUD-DEPLOYMENT-REVIEW.md](./CLOUD-DEPLOYMENT-REVIEW.md) — 클라우드 옵션 비교
- [PWA-IMPLEMENTATION.md](./PWA-IMPLEMENTATION.md) — PWA 구현 가이드
- [Hetzner Cloud Docs](https://docs.hetzner.com/cloud/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

---

## 한 줄 요약

> Hetzner CX23 생성 → Docker 설치 → `git clone` + `.env` → `docker compose up -d --build` → Duck DNS IP 변경 → HTTPS·PWA 확인 → 백업 cron 설정
