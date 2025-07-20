
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Landmark, LayoutDashboard, Users, UserCog, UserPlus, FileText, HandCoins, Download, Briefcase } from 'lucide-react';
import Link from 'next/link';

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'User Management', icon: UserCog },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/customers/register', label: 'Register Customer', icon: UserPlus },
  { href: '/loans', label: 'Loans', icon: Landmark },
  { href: '/loans/applications', label: 'Applications', icon: FileText },
  { href: '/loans/apply', label: 'New Application', icon: HandCoins },
  { href: '/loans/emi-collection', label: 'EMI Collection', icon: Download },
];

const agentNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/customers/register', label: 'Register Customer', icon: UserPlus },
  { href: '/loans', label: 'Loans', icon: Landmark },
  { href: '/loans/emi-collection', label: 'EMI Collection', icon: Download },
];

const customerNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/loans', label: 'My Loans', icon: Landmark },
];

const navItemsMap = {
  admin: adminNavItems,
  agent: agentNavItems,
  customer: customerNavItems,
};


export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !role && pathname !== '/') {
      router.replace('/');
    }
  }, [role, loading, router, pathname]);

  if (pathname === '/') {
    return <>{children}</>;
  }

  if (loading || !role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-lg font-semibold">Loading application...</div>
      </div>
    );
  }

  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const navItems = role ? navItemsMap[role] || [] : [];


  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header>
           <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="flex flex-col">
                   <nav className="grid gap-2 text-lg font-medium">
                        <Link
                        href="#"
                        className="flex items-center gap-2 text-lg font-semibold mb-4"
                        >
                            <Briefcase className="h-6 w-6" />
                            <span>JLS FINACE LTD</span>
                        </Link>
                        {navItems.map((item, index) => (
                             <Link
                                key={index}
                                href={item.href}
                                onClick={() => setIsSheetOpen(false)}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.startsWith(item.href) && 'text-primary bg-muted'}`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        ))}
                   </nav>
                </SheetContent>
            </Sheet>
        </Header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
