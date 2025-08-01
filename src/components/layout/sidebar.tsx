
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Users,
  Landmark,
  HandCoins,
  UserPlus,
  UserCog,
  FileText,
  Download,
  ChevronDown,
  Briefcase,
  Building,
} from 'lucide-react';
import React, { useState } from 'react';


const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'User Management', icon: UserCog },
  {
    label: 'Business',
    icon: Building,
    subItems: [
      { href: '/business/create', label: 'Create Business', icon: Briefcase },
    ],
  },
  {
    label: 'Customers',
    icon: Users,
    subItems: [
      { href: '/customers', label: 'All Customers', icon: Users },
      { href: '/customers/register', label: 'Register Customer', icon: UserPlus },
    ],
  },
  {
    label: 'Loans',
    icon: Landmark,
    subItems: [
        { href: '/loans', label: 'All Loans', icon: Landmark },
        { href: '/loans/applications', label: 'Applications', icon: FileText },
        { href: '/loans/apply', label: 'New Application', icon: HandCoins },
        { href: '/loans/emi-collection', label: 'EMI Collection', icon: Download },
    ]
  }
];

const agentNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Customers',
    icon: Users,
    subItems: [
      { href: '/customers', label: 'All Customers', icon: Users },
      { href: '/customers/register', label: 'Register Customer', icon: UserPlus },
    ],
  },
   {
    label: 'Loans',
    icon: Landmark,
    subItems: [
        { href: '/loans', label: 'All Loans', icon: Landmark },
        { href: '/loans/emi-collection', label: 'EMI Collection', icon: Download },
    ]
  }
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
  const { role, selectedBusiness } = useAuth();
  const pathname = usePathname();
  const navItems = role ? navItemsMap[role] || [] : [];
  
  const isNavItemActive = (item) => {
    if (item.subItems) {
      return item.subItems.some(sub => pathname.startsWith(sub.href));
    }
    // Exact match for dashboard and users
    if (item.href === '/dashboard' || item.href === '/users') {
        return pathname === item.href;
    }
    // Starts with for others to handle sub-pages like /loans/[id]
    return pathname.startsWith(item.href);
  };
  
  const [openSections, setOpenSections] = useState(() => {
     const activeSections = {};
     navItems.forEach(item => {
        if(item.subItems && isNavItemActive(item)) {
            activeSections[item.label] = true;
        }
     });
     return activeSections;
  });

  const toggleSection = (label) => {
    setOpenSections(prev => ({...prev, [label]: !prev[label]}));
  }

  return (
    <aside className="hidden w-64 flex-col border-r bg-card sm:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="">{selectedBusiness?.name || 'FinanceFlow'}</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid items-start px-4 text-sm font-medium">
          {navItems.map((item, index) =>
            item.subItems ? (
              <Collapsible
                key={index}
                open={openSections[item.label] ?? false}
                onOpenChange={() => toggleSection(item.label)}
                className="grid gap-1"
              >
                <CollapsibleTrigger
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    isNavItemActive(item) && 'text-primary bg-muted'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", openSections[item.label] && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-4 grid gap-1 border-l-2 border-muted pl-5">
                  {item.subItems.map((subItem, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subItem.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                        pathname === subItem.href &&
                          'text-primary bg-muted'
                      )}
                    >
                      <subItem.icon className="h-4 w-4" />
                      {subItem.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  isNavItemActive(item) && 'bg-muted text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </aside>
  );
}
