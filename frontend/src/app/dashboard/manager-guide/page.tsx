import { redirect } from 'next/navigation';
import { MANAGER_GUIDE_DEFAULT_HREF } from './manager-guide-nav-config';

export default function ManagerGuidePage() {
  redirect(MANAGER_GUIDE_DEFAULT_HREF);
}
