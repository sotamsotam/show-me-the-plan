import { redirect } from 'next/navigation';
import { GUIDE_DEFAULT_HREF } from './guide-nav-config';

export default function GuidePage() {
  redirect(GUIDE_DEFAULT_HREF);
}
