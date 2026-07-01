import { redirect } from 'next/navigation';

export default function PreferencesPage() {
  redirect('/dashboard/preferences/subject-tags');
}
