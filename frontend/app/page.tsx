import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const token = cookies().get('madrasti_at')?.value;
  redirect(token ? '/notes' : '/login');
}
