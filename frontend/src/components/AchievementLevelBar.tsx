import PercentRateBar from '@/components/PercentRateBar';

interface AchievementLevelBarProps {
  rate: number | null;
  className?: string;
}

export default function AchievementLevelBar({ rate, className }: AchievementLevelBarProps) {
  return (
    <PercentRateBar rate={rate} ariaLabelPrefix="성취도" className={className} />
  );
}
