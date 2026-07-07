# Show Me The Plan — Cloudflare R2 DB 백업 설정 가이드

> **문서 목적:** Hetzner VPS PostgreSQL을 **별도 Cloudflare 계정 R2**에 매일 자동 백업하는 작업을 정리한다.  
> **작성·적용일:** 2026-07-05  
> **적용 상태:** Cloudflare · VPS · 수동 백업 · cron — **검증 완료**

**한 줄 요약**

> 매일 `pg_dump` → `.sql.gz` → private R2 버킷 업로드. 이미지 R2(`plan-media.odap-coach.com`)와 **계정·버킷·자격증명 완전 분리**. Public CDN **없음**.

**관련:** 이미지 스토리지 — [`R2-IMAGE-STORAGE-SETUP.md`](./R2-IMAGE-STORAGE-SETUP.md)

---

## 목차

1. [배경·범위](#1-배경범위)
2. [아키텍처](#2-아키텍처)
3. [이미지 R2 vs DB 백업 R2](#3-이미지-r2-vs-db-백업-r2)
4. [Cloudflare 설정](#4-cloudflare-설정)
5. [VPS — AWS CLI v2 설치](#5-vps--aws-cli-v2-설치)
6. [VPS — 자격증명](#6-vps--자격증명)
7. [VPS — 백업 스크립트](#7-vps--백업-스크립트)
8. [수동 테스트 (검증 결과)](#8-수동-테스트-검증-결과)
9. [cron 자동화](#9-cron-자동화)
10. [용량·비용 추정](#10-용량비용-추정)
11. [복구 절차](#11-복구-절차)
    - [11-1. 복구 전 알아둘 것](#11-1-복구-전-알아둘-것)
    - [11-2. 연습 — 덤프만 확인 (DB 변경 없음)](#11-2-연습--덤프만-확인-db-변경-없음)
    - [11-3. 로컬 백업 파일에서 복구](#11-3-로컬-백업-파일에서-복구)
    - [11-4. R2에서 다운로드 후 복구 (권장 절차)](#11-4-r2에서-다운로드-후-복구-권장-절차)
    - [11-5. 복구 후 검증](#11-5-복구-후-검증)
    - [11-6. 새 VPS로 이전할 때](#11-6-새-vps로-이전할-때)
12. [트러블슈팅](#12-트러블슈팅)
13. [완료 체크리스트](#13-완료-체크리스트)

---

## 1. 배경·범위

### 무엇을 백업하는가

- **PostgreSQL** (`docker-compose.prod.yml` → `postgres` 서비스)
- DB 이름·사용자: `strapi` / `strapi` (기본)
- **이미지 바이너리는 포함되지 않음** — 첨부 파일은 이미지 R2, DB에는 URL·메타만

### 무엇과 분리하는가

| | 이미지 R2 | DB 백업 R2 |
|---|-----------|------------|
| Cloudflare 계정 | odap-coach (이미지) | **별도 백업 계정** |
| Strapi 연동 | `UPLOAD_S3_*` in `.env` | **없음** (cron + shell) |
| Public URL | `plan-media.odap-coach.com` | **없음** |
| VPS 도구 | Strapi 컨테이너 내장 SDK | **AWS CLI v2** (호스트) |

### 서브도메인 불필요

DB 백업은 브라우저 URL로 접근하지 않음 → R2 **Custom domain 연결 안 함**.

---

## 2. 아키텍처

```
[cron 매일 03:00 KST]
    ↓
VPS /opt/show-me-the-plan/scripts/backup-db-to-r2.sh
    ↓ docker compose exec postgres pg_dump | gzip
/root/backups/strapi-YYYYMMDD-HHMMSS.sql.gz  (로컬 7일 보관)
    ↓ aws s3 cp (--endpoint-url R2)
Cloudflare R2 (private)
  버킷: show-me-the-plan-db-backups
  경로: db/show-me-the-plan/strapi-....sql.gz
    ↓ Lifecycle 90일
자동 삭제
```

---

## 3. 이미지 R2 vs DB 백업 R2

| 항목 | 이미지 | DB 백업 |
|------|--------|---------|
| 버킷 | `show-me-the-plan-media` | `show-me-the-plan-db-backups` |
| Account ID | `9f3bf73cc934e0af1a4db2587d3b074c` | `af6b2cf17bd79f29d28be56ce8d02efc` |
| VPS env | `/opt/show-me-the-plan/.env` | `/root/.backup-r2.env` |
| 공개 접근 | CDN | **비공개** |

---

## 4. Cloudflare 설정

### 4-1. R2 버킷

| 항목 | 값 |
|------|-----|
| 버킷 이름 | `show-me-the-plan-db-backups` |
| Location | Asia-Pacific (APAC) |
| Account ID | `af6b2cf17bd79f29d28be56ce8d02efc` |
| S3 API | `https://af6b2cf17bd79f29d28be56ce8d02efc.r2.cloudflarestorage.com` |

### 4-2. API 토큰

| 항목 | 설정 |
|------|------|
| Token name | `show-me-the-plan-db-backup` (예) |
| Permissions | **Object Read & Write** |
| Bucket scope | **Specific** → `show-me-the-plan-db-backups` |
| TTL | Forever |
| IP Filter (선택) | Include: `204.168.245.213` (Hetzner VPS) |

### 4-3. Public access — 사용 안 함

- Custom Domains: **없음**
- Public Development URL: **Disabled**

### 4-4. Object Lifecycle Rules

Cloudflare UI: 버킷 **Settings** → **Object Lifecycle Rules** (「Lifecycle rules」가 아님)

| Rule name | Prefix | Action | Status |
|-----------|--------|--------|--------|
| `expire-db-backups_90d` | `db/show-me-the-plan/` | Delete objects after **90** days | Enabled |
| `Default Multipart Abort Rule` | — | Abort incomplete uploads 7 days | Enabled (기본 유지) |

---

## 5. VPS — AWS CLI v2 설치

### 환경

| 항목 | 값 |
|------|-----|
| VPS | Hetzner `ubuntu-4gb-hel1-2` |
| SSH | `ssh root@204.168.245.213` |
| OS | Ubuntu 24.04 (Noble) |
| 프로젝트 | `/opt/show-me-the-plan` |

### Ubuntu 24.04 주의

```bash
apt install -y awscli   # ❌ 실패 — noble에 패키지 없음
```

**공식 AWS CLI v2 설치:**

```bash
cd /tmp
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
apt install -y unzip
unzip -q awscliv2.zip
./aws/install
aws --version
# aws-cli/2.35.15 ...
rm -rf /tmp/aws /tmp/awscliv2.zip
```

---

## 6. VPS — 자격증명

앱 `.env`와 **분리** — `/root/.backup-r2.env`

```bash
nano /root/.backup-r2.env
```

```env
BACKUP_R2_ACCESS_KEY_ID=<백업 R2 Access Key>
BACKUP_R2_SECRET_ACCESS_KEY=<백업 R2 Secret Key>
BACKUP_R2_BUCKET=show-me-the-plan-db-backups
BACKUP_R2_ENDPOINT=https://af6b2cf17bd79f29d28be56ce8d02efc.r2.cloudflarestorage.com
BACKUP_R2_PREFIX=db/show-me-the-plan
```

```bash
chmod 600 /root/.backup-r2.env
```

템플릿: [`scripts/backup-r2.env.example`](../scripts/backup-r2.env.example)

**nano 팁:** 빈 파일이면 정상. `Ctrl+O` → `Enter` → `Ctrl+X` → `Y` → `Enter`

**대안 (nano 어려울 때):**

```bash
cat > /root/.backup-r2.env << 'EOF'
BACKUP_R2_ACCESS_KEY_ID=...
BACKUP_R2_SECRET_ACCESS_KEY=...
BACKUP_R2_BUCKET=show-me-the-plan-db-backups
BACKUP_R2_ENDPOINT=https://af6b2cf17bd79f29d28be56ce8d02efc.r2.cloudflarestorage.com
BACKUP_R2_PREFIX=db/show-me-the-plan
EOF
chmod 600 /root/.backup-r2.env
```

---

## 7. VPS — 백업 스크립트

레포: [`scripts/backup-db-to-r2.sh`](../scripts/backup-db-to-r2.sh)

### 방법 A — git pull (레포에 push된 경우)

```bash
cd /opt/show-me-the-plan
git pull
chmod 700 scripts/backup-db-to-r2.sh
mkdir -p /root/backups
```

### 방법 B — VPS에 직접 생성 (git pull 전)

`git pull` 후 `scripts/backup-db-to-r2.sh`가 없으면 **exit 127** 발생.

```bash
mkdir -p /opt/show-me-the-plan/scripts /root/backups
# 레포 scripts/backup-db-to-r2.sh 내용을 cat > ... << 'EOF' 로 생성
chmod 700 /opt/show-me-the-plan/scripts/backup-db-to-r2.sh
```

---

## 8. 수동 테스트 (검증 결과)

```bash
bash /opt/show-me-the-plan/scripts/backup-db-to-r2.sh
echo $?
tail -30 /var/log/show-me-the-plan-db-backup.log
ls -lh /root/backups/
```

**2026-07-05 프로덕션 검증:**

```text
exit code: 0
local dump: /root/backups/strapi-20260705-190455.sql.gz (60K)
uploaded: s3://show-me-the-plan-db-backups/db/show-me-the-plan/strapi-20260705-190455.sql.gz
소요: ~3초
VPS timezone: +09:00 (KST)
```

Cloudflare R2 → Objects → `db/show-me-the-plan/strapi-20260705-190455.sql.gz` 확인.

---

## 9. cron 자동화

```bash
crontab -e
```

1. `Choose 1-4` → **`1`** (nano) — cron 줄을 여기 입력하면 안 됨
2. 파일 맨 아래 `# m h dom mon dow command` **다음 줄**에 추가:

```cron
0 3 * * * /opt/show-me-the-plan/scripts/backup-db-to-r2.sh
```

3. `Ctrl+O` → `Enter` → `Ctrl+X` → `Y` → `Enter`

**nano 없이 등록:**

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/show-me-the-plan/scripts/backup-db-to-r2.sh") | crontab -
crontab -l
```

VPS가 KST(`+09:00`)이면 `0 3 * * *` = **매일 새벽 3시 한국 시간**.

### cron 확인 (다음날)

```bash
tail -5 /var/log/show-me-the-plan-db-backup.log
ls -lh /root/backups/
```

---

## 10. 용량·비용 추정

현재 DB 덤프: **약 60KB/일** (gzip).

| 보관 | 대략 용량 (현재 규모) |
|------|----------------------|
| 90일 R2 | ~5.4 MB |
| 1000명·보통 사용 가정 | 90일 **~1.5–3 GB** |

R2 저장 비용은 이 규모에서 **월 수 cents 수준**.

---

## 11. 복구 절차

> **주의:** 아래 「전체 복구」는 **현재 PostgreSQL `strapi` DB를 덮어씁니다.**  
> 복구 직전에 **현재 DB 스냅샷**을 한 번 더 백업하거나, 최소한 [§11-2 연습](#11-2-연습--덤프만-확인-db-변경-없음)으로 덤프 파일을 확인한 뒤 진행하세요.

### 11-1. 복구 전 알아둘 것

| 항목 | 설명 |
|------|------|
| **복구 대상** | PostgreSQL DB `strapi` (Strapi·Next.js BFF가 쓰는 데이터) |
| **복구 파일** | `strapi-YYYYMMDD-HHMMSS.sql.gz` (`pg_dump` + gzip) |
| **이미지 파일** | DB 복구와 **별개** — 첨부 사진은 **이미지 R2** (`plan-media.odap-coach.com`)에 있음. DB에는 URL만 저장 |
| **실행 위치** | **VPS SSH** (`ssh root@204.168.245.213`). R2 IP Filter 사용 시 VPS에서만 다운로드 가능 |
| **필요 도구** | AWS CLI v2, `/root/.backup-r2.env`, `docker compose -f docker-compose.prod.yml` |

**복구가 필요한 경우 예:**

- VPS 디스크·DB 손상
- 실수로 데이터 대량 삭제
- 새 VPS로 서버 이전
- 장애 후 특정 시점(백업 당일)으로 되돌리기

---

### 11-2. 연습 — 덤프만 확인 (DB 변경 없음)

운영 DB를 **건드리지 않고** 백업 파일이 정상인지만 확인합니다. **분기 1회 권장.**

#### R2에서 최신 목록 보기

```bash
source /root/.backup-r2.env
export AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET_ACCESS_KEY"

aws s3 ls "s3://${BACKUP_R2_BUCKET}/${BACKUP_R2_PREFIX}/" \
  --endpoint-url "$BACKUP_R2_ENDPOINT"
```

#### 다운로드 + 내용 확인 (복원 안 함)

```bash
# 파일명은 ls 결과에서 가장 최근 것으로 교체
RESTORE_FILE=strapi-20260705-190455.sql.gz

aws s3 cp "s3://${BACKUP_R2_BUCKET}/${BACKUP_R2_PREFIX}/${RESTORE_FILE}" /tmp/ \
  --endpoint-url "$BACKUP_R2_ENDPOINT"

gunzip -c "/tmp/${RESTORE_FILE}" | head -30
```

`PostgreSQL`, `CREATE TABLE`, `COPY` 등이 보이면 덤프 정상.

```bash
rm -f "/tmp/${RESTORE_FILE}"
```

---

### 11-3. 로컬 백업 파일에서 복구

VPS `/root/backups/`에 **7일 이내** 파일이 남아 있으면 R2 다운로드 없이 복구 가능.

```bash
ls -lht /root/backups/
# 가장 위 strapi-....sql.gz 선택
LOCAL_FILE=/root/backups/strapi-20260705-190455.sql.gz
```

이후 [§11-4 Step 3~5](#11-4-r2에서-다운로드-후-복구-권장-절차)와 동일 (`aws s3 cp` 단계 생략).

---

### 11-4. R2에서 다운로드 후 복구 (권장 절차)

Git Bash → VPS:

```bash
ssh root@204.168.245.213
cd /opt/show-me-the-plan
```

#### Step 1 — (권장) 복구 직전 백업 1회

```bash
bash /opt/show-me-the-plan/scripts/backup-db-to-r2.sh
```

#### Step 2 — 앱 일시 중지 (DB 쓰기 방지)

Strapi·frontend만 멈춤. postgres는 유지.

```bash
docker compose -f docker-compose.prod.yml stop strapi frontend
```

#### Step 3 — R2에서 덤프 다운로드

```bash
source /root/.backup-r2.env
export AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET_ACCESS_KEY"

aws s3 ls "s3://${BACKUP_R2_BUCKET}/${BACKUP_R2_PREFIX}/" \
  --endpoint-url "$BACKUP_R2_ENDPOINT"

# 복구할 시점 파일명 지정
RESTORE_FILE=strapi-20260705-190455.sql.gz

aws s3 cp "s3://${BACKUP_R2_BUCKET}/${BACKUP_R2_PREFIX}/${RESTORE_FILE}" /tmp/restore.sql.gz \
  --endpoint-url "$BACKUP_R2_ENDPOINT"

ls -lh /tmp/restore.sql.gz
```

#### Step 4 — 기존 DB 비우기 (깨끗한 복구)

`psql`로 기존 DB 위에 덤프를 넣으면 충돌·중복이 날 수 있어 **drop & create** 권장.

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U strapi -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'strapi' AND pid <> pg_backend_pid();"

docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U strapi -d postgres -c "DROP DATABASE IF EXISTS strapi;"

docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U strapi -d postgres -c "CREATE DATABASE strapi OWNER strapi;"
```

#### Step 5 — 덤프 복원

```bash
gunzip -c /tmp/restore.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U strapi -d strapi -v ON_ERROR_STOP=1
```

에러 없이 끝나면 성공. `-v ON_ERROR_STOP=1`은 SQL 오류 시 즉시 중단.

#### Step 6 — 서비스 재기동

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

#### Step 7 — 임시 파일 삭제

```bash
rm -f /tmp/restore.sql.gz
```

---

### 11-5. 복구 후 검증

| # | 확인 | 방법 |
|---|------|------|
| 1 | 컨테이너 Up | `docker compose -f docker-compose.prod.yml ps` |
| 2 | Strapi 기동 | `docker compose -f docker-compose.prod.yml logs strapi --tail 30` |
| 3 | 웹 로그인 | `https://showmepl.com` — 기존 계정 로그인 |
| 4 | 데이터 | 일정·TODO·프로필 존재 |
| 5 | 이미지 | 종일 일정 첨부 — `plan-media.odap-coach.com` URL로 표시 (이미지 R2는 DB와 별도) |
| 6 | DB 크기 | `docker compose -f docker-compose.prod.yml exec postgres psql -U strapi -d strapi -c "SELECT pg_size_pretty(pg_database_size('strapi'));"` |

복구 시점 **이후**에만 생긴 데이터(가입·결제·일정)는 **되돌아오지 않습니다.**

---

### 11-6. 새 VPS로 이전할 때

1. 새 VPS에 Docker·프로젝트·`.env` 배포 ([`PRODUCTION-LAUNCH-GUIDE.md`](./PRODUCTION-LAUNCH-GUIDE.md))
2. `docker compose -f docker-compose.prod.yml up -d postgres` — **빈 DB** 상태
3. [§11-4](#11-4-r2에서-다운로드-후-복구-권장-절차) Step 3~5로 R2 덤프 복원
4. Strapi·frontend·caddy 기동
5. DNS를 새 VPS IP로 전환

이미지는 **이미지 R2**에 그대로 있으므로, DB만 복원하면 첨부 URL은 유지됩니다 (같은 `UPLOAD_S3_BASE_URL` 설정 전제).

---

### 복구 요약 명령 (숙련 후)

```bash
cd /opt/show-me-the-plan
docker compose -f docker-compose.prod.yml stop strapi frontend

source /root/.backup-r2.env
export AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET_ACCESS_KEY"

RESTORE_FILE=strapi-YYYYMMDD-HHMMSS.sql.gz
aws s3 cp "s3://${BACKUP_R2_BUCKET}/${BACKUP_R2_PREFIX}/${RESTORE_FILE}" /tmp/restore.sql.gz \
  --endpoint-url "$BACKUP_R2_ENDPOINT"

docker compose -f docker-compose.prod.yml exec -T postgres psql -U strapi -d postgres \
  -c "DROP DATABASE IF EXISTS strapi;"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U strapi -d postgres \
  -c "CREATE DATABASE strapi OWNER strapi;"

gunzip -c /tmp/restore.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U strapi -d strapi -v ON_ERROR_STOP=1

docker compose -f docker-compose.prod.yml up -d
rm -f /tmp/restore.sql.gz
```

### 로컬 복구 연습 (Windows)

사고 대비 **로컬 PostgreSQL 덮어쓰기** 연습: [`LOCAL-DB-RESTORE-PRACTICE.md`](./LOCAL-DB-RESTORE-PRACTICE.md)

---

## 12. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| exit **127** | 스크립트 파일 없음 | `ls scripts/backup-db-to-r2.sh` → VPS에 생성 |
| `apt install awscli` 실패 | Ubuntu 24.04 | [§5 AWS CLI v2 공식 설치](#5-vps--aws-cli-v2-설치) |
| 로그 파일 없음 | 스크립트 미실행 | `bash .../backup-db-to-r2.sh` 재실행 |
| `Access Denied` | 토큰·버킷·IP Filter | scope·Include IP `204.168.245.213` |
| crontab 편집기 선택 | `Choose 1-4`에 cron 입력 | **`1`** 입력 후 nano에서 cron 줄 추가 |
| Lifecycle UI 못 찾음 | 메뉴명 다름 | **Object Lifecycle Rules** (Settings 탭) |

---

## 13. 완료 체크리스트

### Cloudflare

- [x] R2 버킷 `show-me-the-plan-db-backups`
- [x] API 토큰 (Object R/W, 버킷 scoped)
- [x] (선택) IP Filter `204.168.245.213`
- [x] Lifecycle `expire-db-backups_90d` (90일 삭제)
- [x] Public access **비활성**

### VPS

- [x] AWS CLI v2 (`/usr/local/bin/aws`)
- [x] `/root/.backup-r2.env` (chmod 600)
- [x] `scripts/backup-db-to-r2.sh` (chmod 700)
- [x] 수동 백업 성공 (60K, exit 0)
- [x] cron `0 3 * * *` 등록

---

## 관련 문서·파일

| 경로 | 설명 |
|------|------|
| [`R2-IMAGE-STORAGE-SETUP.md`](./R2-IMAGE-STORAGE-SETUP.md) | 이미지 R2 + CDN |
| [`scripts/backup-db-to-r2.sh`](../scripts/backup-db-to-r2.sh) | 백업 스크립트 |
| [`scripts/backup-r2.env.example`](../scripts/backup-r2.env.example) | 자격증명 템플릿 |
| [`LOCAL-DB-RESTORE-PRACTICE.md`](./LOCAL-DB-RESTORE-PRACTICE.md) | 로컬 DB 덮어쓰기 복구 연습 (Windows) |
| [`PRODUCTION-LAUNCH-GUIDE.md`](./PRODUCTION-LAUNCH-GUIDE.md) Phase 16 | pg_dump 개요 |
