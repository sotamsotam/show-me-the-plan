# 포트원 실제 심사 제출 가이드

> **목적:** PG사·카드사 심사 시 제출할 URL, 테스트 계정, 확인 사항을 한곳에 정리합니다.  
> **주의:** 푸터 사업자 정보는 현재 **샘플 값**입니다. 실제 신청 전 PG 신청서와 100% 일치하도록 `.env`를 교체하세요.

## 1. 서비스 URL (심사역 접속용)

| 페이지 | URL | 설명 |
|--------|-----|------|
| 홈 | `https://www.showmepl.com/` | 서비스 소개 |
| 요금 안내 | `https://www.showmepl.com/pricing` | 월 4,900원, 14일 무료 체험, 정기결제 고지 |
| 이용약관 | `https://www.showmepl.com/legal/terms` | |
| 유료서비스 약관 | `https://www.showmepl.com/legal/paid-service` | 자동갱신·해지·환불 |
| 개인정보 처리방침 | `https://www.showmepl.com/legal/privacy` | PG 위탁 포함 |
| 구독 결제 | `https://www.showmepl.com/billing/checkout` | 로그인 필요 (학생) |
| 구독 관리 | `https://www.showmepl.com/dashboard/settings/billing` | 해지 예약 |

## 2. 테스트 계정 (신청서에 기재)

심사 전 아래 계정을 운영 DB에 생성하고, 비밀번호를 안전하게 관리하세요.

| 용도 | 이메일 | 비밀번호 | 상태 |
|------|--------|----------|------|
| 무료 체험 학생 | `review-trial@showmepl.com` | `(심사용으로 설정)` | trialing |
| 구독 결제 테스트 학생 | `review-billing@showmepl.com` | `(심사용으로 설정)` | trialing 또는 expired |

**심사 플로우 (권장):**

1. `review-billing@showmepl.com`으로 로그인
2. 설정 → 구독 · 결제 → 구독 시작
3. `/billing/checkout`에서 유료약관 동의 → 카드 등록 및 결제 (포트원 테스트 카드)
4. 구독 관리에서 해지 예약 UI 확인

## 3. 푸터 사업자 정보 (샘플 → 실제값 교체 필요)

현재 코드 기본값 (`frontend/src/content/legal/meta.ts`):

| 항목 | 샘플 값 |
|------|---------|
| 상호 | 주식회사 쇼미플 |
| 대표 | 홍길동 |
| 사업자등록번호 | 123-45-67890 |
| 통신판매업신고번호 | 제2026-서울강남-00000호 |
| 주소 | 서울특별시 강남구 테헤란로 123, 4층 |
| 고객센터 | 02-1234-5678 · support@showmepl.com |
| 개인정보보호책임자 | 김개인 (대표) |

**운영 env 변수:** `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_REPRESENTATIVE_NAME`, `NEXT_PUBLIC_BUSINESS_REG_NO`, `NEXT_PUBLIC_ECOMMERCE_REG_NO`, `NEXT_PUBLIC_BUSINESS_ADDRESS`, `NEXT_PUBLIC_CONTACT_PHONE`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_PRIVACY_OFFICER_NAME`, `NEXT_PUBLIC_PRIVACY_OFFICER_TITLE`

## 4. 정기결제 고지 확인 포인트

- [ ] 요금 페이지에 월 4,900원(VAT 포함) 명시
- [ ] 결제 화면에 **매월 자동 갱신** 문구
- [ ] 유료서비스 약관 제5조 (자동갱신), 제6조 (해지), 제7조 (환불)
- [ ] 결제 전 유료약관·개인정보 확인 체크박스

## 5. 포트원 연동 (심사 통과 후)

1. 포트원 콘솔 → 전자결제 신청 (정기결제·신용카드)
2. PG 1차 심사 (~1주) → MID 발급
3. 카드사 2차 심사 (~2주)
4. 실연동 채널 추가 → env 실키 교체
5. Webhook URL: `https://www.showmepl.com/api/billing/webhooks/portone`
6. 본인 카드 실결제 → 해지·환불 테스트

## 6. PG사 선택 참고

- 교육 SaaS 구독 서비스 (디지털 콘텐츠 아님)
- 신생 사업자(업력 2년 미만) 시 **나이스페이·토스페이먼츠** 권장

## 7. 관련 문서

- `docs/BILLING-QA-CHECKLIST.md` — E2E 테스트 체크리스트
- `docs/BILLING-PRODUCTION-GO-LIVE.md` — 라이브 전환
- `docs/BILLING-CS-MANUAL.md` — 환불 CS 매뉴얼
