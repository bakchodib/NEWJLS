'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, Users, Landmark, HandCoins, UserPlus, Briefcase, UserCog, FileText, Download } from 'lucide-react';

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

export function Sidebar() {
  const { role } = useAuth();
  const pathname = usePathname();
  const navItems = role ? navItemsMap[role] || [] : [];

  const isNavItemActive = (itemHref: string) => {
    if (itemHref === '/dashboard' || itemHref === '/') {
      return pathname === itemHref;
    }
    return pathname.startsWith(itemHref);
  }

  return (
    <aside className="hidden w-16 flex-col border-r bg-card sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 py-4">
          <Link href="/dashboard" className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base">
            <Briefcase className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">FinanceFlow</span>
          </Link>
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                    isNavItemActive(item.href) && 'bg-accent text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
