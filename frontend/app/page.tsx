'use client';

import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    const token = window.localStorage.getItem('access_token');
    window.location.href = token ? '/notes' : '/login';
  }, []);

  return null;
}
