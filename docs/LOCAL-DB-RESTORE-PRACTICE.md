# Show Me The Plan — 로컬 DB 복구 연습 (R2 백업 덮어쓰기)

> **문서 목적:** 사고 대비 — Cloudflare R2의 프로덕션 DB 백업으로 **로컬 PostgreSQL을 통째로 덮어쓰는** 연습 절차를 정리한다.  
> **작성·검증일:** 2026-07-06  
> **적용 환경:** Windows + Git Bash + PostgreSQL 18 (로컬) + `npm run develop` / `npm run dev`

**한 줄 요약**

> R2에서 `.sql.gz` 다운로드 → 로컬 `showmetheplan` DROP/CREATE → `gunzip | psql` 복원 → Strapi·Frontend 기동 → 프로덕션 데이터 확인.

**관련:** 자동 백업·VPS 복구 — [`R2-DB-BACKUP-SETUP.md`](./R2-DB-BACKUP-SETUP.md)

---

## 목차

1. [전제](#1-전제)
2. [준비물](#2-준비물)
3. [작업 순서](#3-작업-순서)
4. [트러블슈팅](#4-트러블슈팅)
5. [주의사항](#5-주의사항)

---

## 1. 전제

| 항목 | 로컬 | 프로덕션 백업 |
|------|------|---------------|
| DB 종류 | PostgreSQL | PostgreSQL (`pg_dump`) |
| DB 이름 | `showmetheplan` | `strapi` (덤프 출처) |
| DB 사용자 | `routine` | `strapi` (덤프에 롤 이름 포함) |
| Strapi | `backend/.env` → `DATABASE_CLIENT=postgres` | VPS Docker |

- **SQLite 아님** — 로컬도 PostgreSQL 사용.
- 복원 시 **로컬 `showmetheplan` 데이터는 전부 삭제**됨 (덮어쓰기 연습).
- **프로덕션 R2·VPS DB는 건드리지 않음.**

---

## 2. 준비물

- [ ] Cloudflare **백업 계정** 로그인 (버킷 `show-me-the-plan-db-backups`)
- [ ] 백업 파일 — 예: `db_show-me-the-plan_strapi-20260706-030001.sql.gz`
- [ ] PostgreSQL 18 설치 (`psql` — `C:\Program Files\PostgreSQL\18\bin`)
- [ ] `backend/.env`의 `DATABASE_PASSWORD` 확인
- [ ] Strapi·Frontend **종료** 상태

### R2에서 파일 받기 (브라우저)

AWS CLI 없이 **대시보드 Download**로 충분하다.

1. R2 → `show-me-the-plan-db-backups`
2. `db/show-me-the-plan/` → 최신 `strapi-....sql.gz`
3. **Download** — 예: `D:\db_show-me-the-plan_strapi-20260706-030001.sql.gz`

---

## 3. 작업 순서

### Step 0 — Strapi·Frontend 끄기

`npm run develop` / `npm run dev` 실행 중이면 **Ctrl+C**.

---

### Step 1 — Git Bash: PostgreSQL 도구·비밀번호

```bash
export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"
export PGPASSWORD=<backend/.env 의 DATABASE_PASSWORD>
```

> 새 Git Bash 창을 열면 PATH를 다시 설정해야 한다.

확인:

```bash
psql --version
```

---

### Step 2 — 프로덕션 롤 `strapi` 만들기 (최초 1회)

백업 SQL이 **소유자 `strapi`** 를 참조한다. 로컬에 없으면 복원 중단된다.

```bash
psql -h 127.0.0.1 -U routine -d postgres -c "CREATE ROLE strapi WITH LOGIN SUPERUSER PASSWORD '<DATABASE_PASSWORD>';"
```

`role "strapi" already exists` → 무시하고 진행.

---

### Step 3 — 로컬 DB 삭제 후 빈 DB 생성

```bash
psql -h 127.0.0.1 -U routine -d postgres -c "DROP DATABASE IF EXISTS showmetheplan;"
psql -h 127.0.0.1 -U routine -d postgres -c "CREATE DATABASE showmetheplan OWNER routine;"
```

| 명령 | 의미 |
|------|------|
| `DROP DATABASE` | 로컬 `showmetheplan` **통째로 삭제** |
| `CREATE DATABASE` | 같은 이름으로 **빈 DB** 생성 |

---

### Step 4 — 백업 복원 (덮어쓰기)

파일 경로를 실제 위치에 맞게 수정:

```bash
gunzip -c /d/db_show-me-the-plan_strapi-20260706-030001.sql.gz | \
  psql -h 127.0.0.1 -U routine -d showmetheplan -v ON_ERROR_STOP=1
```

- 에러 없이 프롬프트 복귀 → 성공.
- `SET`, `CREATE TABLE`, `COPY` … 출력은 정상.

---

### Step 5 — Strapi 실행

**터미널 1:**

```bash
cd /d/show-me-the-plan/backend
npm run develop
```

`Server started` 확인. `backend/.env` DB 설정 변경 **불필요** (`showmetheplan` / `routine` 유지).

---

### Step 6 — Frontend 실행

**터미널 2:**

```bash
cd /d/show-me-the-plan/frontend
npm run dev
```

---

### Step 7 — 확인

브라우저 `http://localhost:3000`:

- [ ] 프로덕션 계정으로 **로그인**
- [ ] 일정·TODO·프로필 등 **프로덕션 데이터** 표시
- [ ] (해당 시) 첨부 이미지 — `plan-media.odap-coach.com` URL

---

## 4. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `psql: command not found` | PATH 미설정 | `export PATH="/c/Program Files/PostgreSQL/18/bin:$PATH"` |
| `role "strapi" does not exist` | 프로덕션 DB 사용자 미생성 | [Step 2](#step-2--프로덕션-롤-strapi-만들기-최초-1회) 후 DB DROP/CREATE → 재복원 |
| 복원 중간에 멈춤 | `ON_ERROR_STOP=1` + 위 오류 | Step 3부터 **다시** |
| 로그인 실패 | 다른 시크릿·계정 | 프로덕션에 있는 계정·비밀번호 사용; DB 데이터는 복원됨 |
| 이미지 404 | R2/CDN | `backend/.env` `UPLOAD_S3_*` / `NEXT_PUBLIC_UPLOAD_BASE_URL` 확인 |

---

## 5. 주의사항

1. **로컬 데이터 삭제** — Step 3 이후 기존 `showmetheplan` 개발 데이터는 없어짐.
2. **연습 전 로컬 백업 (선택):**
   ```bash
   pg_dump -h 127.0.0.1 -U routine -d showmetheplan | gzip > restore-practice/local-backup.sql.gz
   ```
3. **백업 파일·`restore-practice/`** — git 커밋 금지 (프로덕션 데이터 포함).
4. **VPS 복구**는 이 문서가 아니라 [`R2-DB-BACKUP-SETUP.md` §11](./R2-DB-BACKUP-SETUP.md#11-복구-절차).

---

## 체크리스트 (한 번에)

```
☐ Strapi/Frontend 종료
☐ export PATH + PGPASSWORD
☐ CREATE ROLE strapi (최초 1회)
☐ DROP DATABASE showmetheplan
☐ CREATE DATABASE showmetheplan
☐ gunzip | psql 복원
☐ npm run develop + npm run dev
☐ localhost 로그인·데이터 확인
```

---

## 관련 문서

| 문서 | 설명 |
|------|------|
| [`R2-DB-BACKUP-SETUP.md`](./R2-DB-BACKUP-SETUP.md) | R2 자동 백업·VPS 복구 |
| [`R2-CLOUDFLARE-SETUP-SUMMARY.md`](./R2-CLOUDFLARE-SETUP-SUMMARY.md) | 이미지 R2 + DB 백업 개요 |
| [`R2-IMAGE-STORAGE-SETUP.md`](./R2-IMAGE-STORAGE-SETUP.md) | 이미지 CDN |
