import PercentRateBar from '@/components/PercentRateBar';

interface ExecutionRateBarProps {
  rate: number | null;
  className?: string;
}

export default function ExecutionRateBar({ rate, className }: ExecutionRateBarProps) {
  return (
    <PercentRateBar rate={rate} ariaLabelPrefix="실행률" className={className} />
  );
}
