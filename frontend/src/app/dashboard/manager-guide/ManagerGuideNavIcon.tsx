import {
  ManagerGuideNavIcon as ManagerGuideBookIcon,
  OverviewNavIcon,
  StudentsNavIcon,
} from '@/components/DashboardNavIcons';

interface ManagerGuideNavIconProps {
  name: 'students' | 'overview';
  className?: string;
}

export default function ManagerGuideNavIcon({
  name,
  className = 'h-4 w-4 shrink-0',
}: ManagerGuideNavIconProps) {
  if (name === 'students') {
    return <StudentsNavIcon className={className} />;
  }

  return <OverviewNavIcon className={className} />;
}

export { ManagerGuideBookIcon };
