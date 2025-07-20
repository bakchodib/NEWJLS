'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/') {
    return <>{children}</>;
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !role) {
      router.replace('/');
    }
  }, [role, loading, router]);

  if (loading || !role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-lg font-semibold">Loading application...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
