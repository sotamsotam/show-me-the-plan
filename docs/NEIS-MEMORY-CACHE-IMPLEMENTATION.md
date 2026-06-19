# NEIS Strapi 메모리 캐시 구현 작업 문서

> **목적:** NEIS Open API 일일 한도(10,000건) 내에서 운영하기 위해, Strapi 백엔드에 **인메모리 TTL 캐시(12시간)** 를 도입해 시간표 조회 시 외부 API 호출을 최소화한다.  
> **범위:** 백엔드(Strapi) 중심. Redis·프론트엔드 캐시는 이번 작업에 포함하지 않는다.  
> **관련 코드:** `backend/src/services/neis.ts`, `backend/src/api/user-profile/controllers/user-profile.ts`

---

## 배경 요약

| 항목 | 현재 | 목표 |
|------|------|------|
| 시간표 조회 경로 | 프론트 → `/api/timetable` → Strapi `timetable` → `getSchoolTimetable()` → NEIS **최소 2회**/요청* | 캐시 hit 시 NEIS 0회 |
| 캐시 | 없음 | Strapi 프로세스 메모리 Map + TTL **12시간** |
| NEIS 일일 한도 | 캐시 없이 DAU 1000명 시 **한도 근접 위험** | 여유 확보 (목표: 일 2,000건 이하) |
| 예상 메모리 | — | 고유 반×날짜범위 기준 **~5~30 MB** |

### 캐시 대상 / 비대상

- **대상:** `getSchoolTimetable()` 결과 (시간표 API + 학사일정 휴업일 필터링까지 포함한 최종 `TimetableEntry[]`)
- **비대상 (이번 작업):** `searchSchools()`, `getClassInfo()` — 가입·설정 시에만 호출, 빈도 낮음

### 캐시 키 설계 (핵심)

동일 반 학생은 시간표가 같으므로 **사용자 ID가 아닌 학교·학년·반·날짜 범위**로 키를 만든다.

```
{schoolLevel}:{atptOfcdcScCode}:{sdSchulCode}:{grade}:{className}:{fromDate}:{toDate}:{ay}:{sem}
```

- `ay`, `sem`은 `getAcademicYearAndSemester(fromDate)` 결과를 포함 (학기 경계 오조회 방지)
- 프론트가 주간/월간 등 **서로 다른 `start`/`end`** 를내면 **별도 캐시 키**가 된다 (현재 앱 동작 유지)

\* miss 시 NEIS 호출: 시간표 API 1회 + `getSchoolOffDates()`(`fetchNeisAll`) 1회 이상. 학사일정 페이지네이션이 있으면 2회를 넘을 수 있으나, **캐시에는 최종 `TimetableEntry[]`만 저장**하므로 별도 학사일정 캐시는 불필요.

### 시간표 API 호출처 (캐시 hit 시 공유)

| 프론트 컴포넌트 | 경로 | 비고 |
|----------------|------|------|
| `ScheduleCalendar.tsx` | `/api/timetable` | 주간·일간 뷰, `datesSet`마다 `start`/`end` 전달 |
| `StudyPlanCalendar.tsx` | `/api/timetable` | 동일 |
| `StudyPlanTodoPage.tsx` | `/api/timetable` | 동일 |

동일 `start`/`end`·동일 반 프로필이면 위 화면 전환 시 **hit** 가능 (문서 Phase 5 수동 테스트 시나리오).

---

## 코드베이스 검토 결과 (2026-06)

> 구현 착수 전 코드·인프라 대조 검토 요약. **Phase 1~6은 즉시 착수 가능**으로 판단.

| 항목 | 결과 |
|------|------|
| 기술적 실현 가능성 | **가능** — 캐시 삽입 지점이 `getSchoolTimetable()` 단일 함수 |
| 코드베이스 적합성 | **높음** — `getAcademicYearAndSemester`, `TimetableEntry`, 컨트롤러 경로가 문서와 일치 |
| 인프라 전제 | **충족** — `docker-compose.yml` Strapi 1인스턴스, `NEIS_KEY` env 이미 존재 |
| API·프론트 변경 | Phase 1~6에서 **불필요** (응답 형식 동일) |
| 롤백 | `NEIS_CACHE_ENABLED=false`로 즉시 기존 동작 복귀 |
| 예상 개발량 | Phase 1~4 약 **반나절~1일** (테스트 러너 추가 시 +0.5일) |

---

## 작업 체크리스트

### Phase 0 — 사전 확인

- [ ] NEIS API 키가 개발·스테이징·운영 환경에 각각 설정되어 있는지 확인 (`NEIS_KEY`)
- [ ] 현재 일일 NEIS 호출량 기준선이 없다면, 구현 **전** 하루치 Strapi 로그 또는 NEIS 대시보드로 대략적 호출 수 파악
- [ ] Strapi 인스턴스가 **단일 프로세스(1대 VPS)** 인지 확인 (메모리 캐시는 인스턴스 간 공유되지 않음)
- [ ] 향후 Strapi **수평 확장** 계획이 있는지 확인 — 있으면 Phase 1~6 배포 후 Redis 등 공유 캐시 검토 일정 잡기

---

### Phase 1 — 캐시 모듈 추가

**신규 파일:** `backend/src/services/neis-cache.ts` (또는 `neis.ts` 내부 private 모듈 — 팀 convention에 맞게 선택)

- [ ] `TimetableCacheEntry` 타입 정의 (`data: TimetableEntry[]`, `expiresAt: number`)
- [ ] 프로세스 단위 `Map<string, TimetableCacheEntry>` 생성
- [ ] `buildTimetableCacheKey(params)` 함수 구현
  - 입력: `getSchoolTimetable` 파라미터 + `ay`/`sem`
  - 출력: 위 키 설계 문자열
- [ ] `getTimetableCacheTtlMs()` — 환경변수 `NEIS_CACHE_TTL_HOURS` (기본값 `12`) 파싱
- [ ] `isNeisCacheEnabled()` — `NEIS_CACHE_ENABLED` (기본값 `true`, `false` 시 캐시 우회)
- [ ] `getCachedTimetable(key)` — 만료 항목은 조회 시 삭제 후 `null` 반환
- [ ] `setCachedTimetable(key, data, ttlMs)` — 저장
- [ ] `pruneTimetableCache(maxEntries)` — `NEIS_CACHE_MAX_ENTRIES` (기본값 `2000`) 초과 시 만료된 항목 우선 삭제, 그래도 초과 시 **가장 빨리 만료되는 항목**부터 제거
- [ ] (선택) `getTimetableCacheStats()` — hit/miss/entryCount 노출용

---

### Phase 2 — `getSchoolTimetable`에 캐시 적용

**수정 파일:** `backend/src/services/neis.ts`

- [ ] 기존 NEIS 호출·파싱 로직을 `fetchSchoolTimetableFromNeis(params)` 같은 **내부 함수**로 분리
- [ ] `getSchoolTimetable()` 진입 시:
  1. 캐시 비활성화면 → NEIS 직접 호출 (기존과 동일)
  2. 캐시 키 생성 → hit이면 즉시 반환
  3. miss이면 NEIS 호출 → 결과를 캐시에 저장 → 반환
- [ ] **빈 배열(`INFO-200`)도 캐시**할지 결정
  - 권장: **캐시함** (동일 반·기간에 대한 반복 NEIS 호출 방지)
  - 단, TTL은 동일(12h) 유지
- [ ] `getSchoolOffDates()`는 `getSchoolTimetable` 내부에서만 호출되므로 **별도 캐시 불필요** (시간표 캐시에 포함됨)

---

### Phase 3 — 환경 변수·문서화

- [ ] `backend/.env.example`에 항목 추가:

  ```env
  # NEIS timetable in-memory cache
  NEIS_CACHE_ENABLED=true
  NEIS_CACHE_TTL_HOURS=12
  NEIS_CACHE_MAX_ENTRIES=2000
  ```

- [ ] 루트 `.env.example` / `docker-compose.yml`의 `strapi` 서비스 `environment`에 동일 변수 전달 (운영에서 TTL 조정 가능하도록)
- [ ] `docs/PROJECT-OVERVIEW.md`에 캐시 구조 한 줄 요약 및 이 문서 링크 추가

---

### Phase 4 — 로깅·관측 (권장)

**수정 파일:** `backend/src/services/neis.ts` 또는 `neis-cache.ts`

- [ ] 캐시 **hit / miss** 시 Strapi 로거로 debug 또는 info 로그 (키 전체 대신 `sdSchulCode`, `grade`, `className`, `fromDate`, `toDate`만)
- [ ] miss 후 NEIS 호출 완료 시 소요 시간(ms) 로그
- [ ] (선택) 하루 단위 hit rate 집계는 초기에는 로그 grep으로 충분; 필요 시 나중에 메트릭 추가

**운영 확인용 grep 예시 (배포 후):**

```bash
# miss 건수 대략 확인
docker compose logs strapi --since 24h | grep -c "neis timetable cache miss"
```

---

### Phase 5 — 테스트

> **현재 상태:** `backend/package.json`에 `test` 스크립트·vitest/jest 등 **테스트 러너가 없음** (`backend/src` 아래 `.test.ts` 없음). 아래 중 **하나**를 Phase 5 시작 시 선택한다.
>
> | 옵션 | 내용 |
> |------|------|
> | A (권장) | vitest 등 러너 추가 후 `neis-cache.test.ts` 작성 |
> | B | 단위 테스트 생략, **수동 통합 테스트 체크리스트만** 전항 완료 (DoD에 명시됨) |

**신규 파일 (옵션 A):** `backend/src/services/neis-cache.test.ts`

- [ ] 동일 키 두 번 조회 시 두 번째는 NEIS 미호출 (mock `fetch` 사용)
- [ ] TTL 만료 후 재조회 시 NEIS 재호출
- [ ] `NEIS_CACHE_ENABLED=false` 시 매번 NEIS 호출
- [ ] 서로 다른 `fromDate`/`toDate` → 서로 다른 캐시 키
- [ ] `NEIS_CACHE_MAX_ENTRIES` 초과 시 prune 동작
- [ ] 빈 배열 응답 캐시 동작 (캐시하기로 결정한 경우)

**수동 통합 테스트:**

- [ ] 스케줄 페이지 진입 → Strapi 로그 miss 1회
- [ ] 같은 주에서 스케줄 ↔ 스터디플랜 전환 → hit (NEIS 추가 호출 없음)
- [ ] 12시간 경과 또는 TTL을 테스트용 1분으로 낮춘 뒤 재접속 → miss 1회
- [ ] 다른 반 학생(또는 테스트 계정)으로 동일 기간 조회 → 별도 키 miss 1회 후, 세 번째 동일 반 사용자는 hit

---

### Phase 6 — 배포·검증

- [ ] 로컬 Docker Compose로 Strapi 재빌드·기동
- [ ] 스테이징(또는 운영) 배포
- [ ] 배포 후 24시간 NEIS 호출 수가 **구현 전 대비 감소**하는지 확인
- [ ] Strapi 컨테이너 메모리 사용량 전후 비교 (`docker stats`) — 유의미한 증가 없는지 확인
- [ ] 문제 시 롤백: `NEIS_CACHE_ENABLED=false`만으로 즉시 기존 동작 복귀 가능한지 확인

---

## 선택 작업 (Phase 7 — 호출 추가 절감, 별도 검토)

현재 프론트는 **주간 뷰(~7일)**·**월간 뷰**마다 다른 `start`/`end`를 보내 캐시 키가 늘어난다. NEIS에 2주치가 등록되어 있다는 전제를 활용하려면 아래를 **추가 검토**한다.

- [ ] **in-flight promise dedup:** 동일 캐시 키 miss 동시 요청 시 NEIS 1회만 호출하고 결과 공유 (thundering herd 완화)
- [ ] **날짜 범위 정규화:** `user-profile.timetable` 컨트롤러 또는 `getSchoolTimetable` 진입 전에 요청 범위를 `오늘 ~ 오늘+14일` 등으로 확장·정규화한 뒤, 응답은 클라이언트가 요청한 `start`/`end`로 **슬라이스**해 반환
  - 효과: 주 이동·월 조회 시 캐시 키 수 감소 → NEIS 호출 추가 절감
  - 주의: 한 번에 가져오는 데이터량·NEIS 응답 크기 증가, 구현 복잡도 상승
- [ ] **프론트엔드 중복 요청 완화:** React Query/SWR 등으로 페이지 간 `/api/timetable` 공유 (백엔드 캐시와 별개 레이어)

> **권장 순서:** Phase 1~6(백엔드 12h 캐시)만 먼저 배포 → NEIS 호출 수 측정 후 Phase 7 필요 여부 결정

---

## 구현 시 주의사항

1. **학기·학년도:** 키에 `ay`/`sem` 포함 필수. 2월·3월 경계에서 잘못된 학기 조회 방지.
2. **Strapi 재시작:** 메모리 캐시는 초기화된다. 재배포 직후 miss가 일시적으로 늘어나 NEIS 호출 spike 가능 — **기능 장애 아님**, TTL 채워지면 정상화.
3. **데이터 신선도:** 당일 NEIS 수정 사항은 최대 12시간 늦게 반영될 수 있음. 학교 시간표 특성상 허용 범위로 간주.
4. **다중 Strapi 인스턴스:** 수평 확장 시 인스턴스마다 캐시가 달라지고 NEIS 호출이 늘어남. 그때 Redis 검토.
5. **프로필 변경:** 사용자가 학교·반을 바꿔도 캐시 키가 바뀌므로 별도 무효화 로직은 필수 아님. 다만 **이전 반** 캐시는 TTL까지 메모리에 남음 (용량 미미).
6. **날짜 범위별 캐시 키 분산:** 주간·월간·주 이동마다 `fromDate`/`toDate`가 달라지면 **별도 키**가 생긴다. Phase 1~6만으로도 절감 효과는 크지만, 예상 호출 수는 Phase 7 없이 **보수적으로** 잡는다 (아래 예상 효과 표 참고).
7. **동시 요청(thundering herd):** 동일 키 miss가 동시에 여러 건 들어오면 NEIS를 중복 호출할 수 있다. 초기 구현에서는 허용하고, 배포 후 spike가 문제면 **in-flight promise dedup**(같은 키 진행 중 요청 공유)을 Phase 7 또는 후속 작업으로 추가.
8. **`getSchoolOffDates` 실패:** 기존 코드는 `.catch(() => new Set())`로 학사일정 실패 시 휴업일 없이 시간표만 반환한다. 캐시 적용 후에도 **동일 동작 유지** — 실패 결과도 그대로 캐시됨.

---

## 완료 기준 (Definition of Done)

- [ ] `getSchoolTimetable` 경로에 12시간 TTL 메모리 캐시 적용 완료
- [ ] 환경 변수로 캐시 on/off·TTL·최대 엔트리 수 조정 가능
- [ ] 단위 테스트 통과 (또는 프로젝트에 테스트 인프라가 없으면 수동 테스트 체크리스트 전항 완료)
- [ ] 운영 환경에서 24시간 NEIS 호출 수가 구현 전 추정치(캐시 없음 ~8,000~10,000/일 @ DAU 1000) 대비 **현저히 감소**
- [ ] `NEIS_CACHE_ENABLED=false` 롤백 경로 검증 완료

---

## 예상 효과 (참고, DAU 1,000명 · 반 ~80개 가정)

| 지표 | 캐시 없음 | 12h 메모리 캐시 (Phase 1~6) | Phase 7 추가 시 |
|------|-----------|------------------------------|-----------------|
| NEIS 호출/일 | ~8,000~10,000 | **~500~2,000** (보수적) | ~500~1,500 (낙관적) |
| Strapi 추가 RAM | 0 | ~5~15 MB | 동일 |
| 일일 한도 10,000 대비 | 위험 | 여유 | 여유 |

- Phase 1~6만 적용 시, 주·월 뷰·주 이동으로 **날짜 범위 키가 분산**되므로 상한은 ~2,000건까지 열어 두고, 배포 후 24h 실측으로 조정한다.
- Phase 7(날짜 범위 정규화)은 **실측 후** 한도가 여전히 빠듯할 때 검토.

---

## 관련 파일 목록

| 파일 | 작업 |
|------|------|
| `backend/src/services/neis-cache.ts` | **신규** — 캐시 Map, 키, TTL, prune |
| `backend/src/services/neis.ts` | **수정** — `getSchoolTimetable` 캐시 래핑 |
| `backend/src/api/user-profile/controllers/user-profile.ts` | 변경 없음 (또는 Phase 7 시 날짜 정규화) |
| `backend/.env.example` | **수정** — 캐시 env 추가 |
| `docker-compose.yml` | **수정** — strapi env 전달 |
| `backend/src/services/neis-cache.test.ts` | **신규 (옵션 A)** — 단위 테스트 |
| `docs/PROJECT-OVERVIEW.md` | **수정** — 아키텍처 한 줄 반영 |

---

*작성 기준: 코드베이스 검토 및 NEIS 호출·캐시 전략 논의 내용 (2026-06)*  
*보완: 코드·인프라 대조 검토 반영 (2026-06)*
