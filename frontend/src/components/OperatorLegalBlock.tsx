import { OPERATOR_INFO } from '@/content/legal/meta';

type OperatorLegalBlockProps = {
  className?: string;
  tone?: 'light' | 'dark' | 'marketing';
};

export default function OperatorLegalBlock({
  className = '',
  tone = 'light',
}: OperatorLegalBlockProps) {
  const textClass =
    tone === 'marketing'
      ? 'text-white/55'
      : tone === 'dark'
        ? 'text-gray-400'
        : 'text-gray-500 dark:text-gray-400';

  const lines = [
    `상호: ${OPERATOR_INFO.operatorName}`,
    `대표: ${OPERATOR_INFO.representativeName}`,
    `사업자등록번호: ${OPERATOR_INFO.businessRegistrationNumber}`,
    `통신판매업신고번호: ${OPERATOR_INFO.ecommerceRegistrationNumber}`,
    `주소: ${OPERATOR_INFO.businessAddress}`,
    `고객센터: ${OPERATOR_INFO.contactPhone} · ${OPERATOR_INFO.contactEmail}`,
    `개인정보보호책임자: ${OPERATOR_INFO.privacyOfficerName} (${OPERATOR_INFO.privacyOfficerTitle})`,
  ];

  return (
    <div className={`space-y-1 text-xs leading-relaxed ${textClass} ${className}`}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
