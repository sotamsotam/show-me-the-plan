# Show Me The Plan — Cloudflare R2 전체 구성 요약

> **문서 목적:** 2026-07-05 적용한 Cloudflare R2 **이미지 스토리지** + **DB 백업** 작업을 한 페이지에서 요약한다.  
> **적용 상태:** 로컬·프로덕션(VPS) 검증 완료

---

## 전체 구조

```
[showmepl.com — Hetzner VPS]
  Next.js + Strapi + PostgreSQL

[이미지] odap-coach Cloudflare 계정
  R2: show-me-the-plan-media
  CDN: https://plan-media.odap-coach.com  (공개)
  연동: Strapi UPLOAD_S3_* in .env

[DB 백업] 별도 Cloudflare 계정
  R2: show-me-the-plan-db-backups  (비공개)
  경로: db/show-me-the-plan/*.sql.gz
  연동: cron + backup-db-to-r2.sh + /root/.backup-r2.env
```

---

## 1. 이미지 스토리지

| 항목 | 값 |
|------|-----|
| 버킷 | `show-me-the-plan-media` |
| Account ID | `9f3bf73cc934e0af1a4db2587d3b074c` |
| CDN | `https://plan-media.odap-coach.com` |
| VPS `.env` | `UPLOAD_PROVIDER=r2`, `UPLOAD_S3_*`, `NEXT_PUBLIC_UPLOAD_BASE_URL` |
| 상세 문서 | [`R2-IMAGE-STORAGE-SETUP.md`](./R2-IMAGE-STORAGE-SETUP.md) |

**흐름:** `ScheduleAttachmentField` → Strapi Upload → R2 → CDN URL 표시

---

## 2. DB 백업

| 항목 | 값 |
|------|-----|
| 버킷 | `show-me-the-plan-db-backups` |
| Account ID | `af6b2cf17bd79f29d28be56ce8d02efc` |
| Prefix | `db/show-me-the-plan/` |
| Lifecycle | 90일 후 삭제 |
| VPS cron | `0 3 * * *` (KST 새벽 3시) |
| 덤프 크기 (현재) | ~60KB/일 (gzip) |
| 상세 문서 | [`R2-DB-BACKUP-SETUP.md`](./R2-DB-BACKUP-SETUP.md) |
| 로컬 복구 연습 | [`LOCAL-DB-RESTORE-PRACTICE.md`](./LOCAL-DB-RESTORE-PRACTICE.md) |

**흐름:** cron → `pg_dump | gzip` → `aws s3 cp` → R2 (private)

---

## 3. VPS 핵심 경로

| 경로 | 용도 |
|------|------|
| `/opt/show-me-the-plan/.env` | 앱 + **이미지 R2** |
| `/root/.backup-r2.env` | **DB 백업 R2** (분리) |
| `/opt/show-me-the-plan/scripts/backup-db-to-r2.sh` | DB 백업 스크립트 |
| `/root/backups/` | 로컬 덤프 (7일) |
| `/var/log/show-me-the-plan-db-backup.log` | 백업 로그 |

---

## 4. 완료 체크리스트

### 이미지

- [x] R2 + `plan-media.odap-coach.com`
- [x] 로컬·프로덕션 업로드 테스트
- [x] GitHub `NEXT_PUBLIC_UPLOAD_BASE_URL` + frontend 재빌드

### DB 백업

- [x] R2 private 버킷 + Lifecycle 90일
- [x] AWS CLI v2 (Ubuntu 24.04)
- [x] 수동 백업 exit 0
- [x] cron 등록

---

## 5. 관련 파일

| 파일 | 설명 |
|------|------|
| [`backend/config/upload-provider.ts`](../backend/config/upload-provider.ts) | 이미지 R2 provider |
| [`scripts/backup-db-to-r2.sh`](../scripts/backup-db-to-r2.sh) | DB 백업 |
| [`scripts/backup-r2.env.example`](../scripts/backup-r2.env.example) | 백업 자격증명 템플릿 |
