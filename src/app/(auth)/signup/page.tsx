'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}

