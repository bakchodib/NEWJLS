
'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Shield, Briefcase, ChevronsUpDown, Building, Check, Settings, Sun, Moon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Business } from '@/types';
import Link from 'next/link';
import { useTheme } from 'next-themes';

const getTitleFromPath = (path: string) => {
  if (path.includes('/business/create')) return 'Create New Business';
  if (path.includes('/business/edit')) return 'Edit Business';
  if (path.includes('/business')) return 'Manage Businesses';
  if (path.includes('/customers/register')) return 'Register Customer';
  if (path.includes('/customers/edit')) return 'Edit Customer';
  if (path.includes('/customers')) return 'Customers';
  if (path.includes('/loans/apply')) return 'New Loan Application';
  if (path.includes('/loans/applications')) return 'Loan Applications';
  if (path.includes('/loans/emi-collection')) return 'EMI Collection';
  if (path.includes('/loans/edit')) return 'Edit Loan';
  if (path.startsWith('/loans/')) return 'Loan Details';
  if (path.includes('/loans')) return 'Loans';
  if (path.includes('/dashboard')) return 'Dashboard';
  if (path.includes('/users')) return 'User Management';
  return 'JLS FINACE LTD';
};

const ThemeToggle = () => {
    const { setTheme, theme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}

const BusinessSwitcher = () => {
    const { businesses, selectedBusiness, setSelectedBusiness, role } = useAuth();

    if (businesses.length <= 1 && role !== 'admin') return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between">
                    <Building className="mr-2 h-4 w-4" />
                    {selectedBusiness?.name || "Select Business"}
                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]" align="end">
                <DropdownMenuGroup>
                    {businesses.map((business) => (
                        <DropdownMenuItem
                            key={business.id}
                            onSelect={() => setSelectedBusiness(business)}
                        >
                             <Check className={cn("mr-2 h-4 w-4", selectedBusiness?.id === business.id ? "opacity-100" : "opacity-0")} />
                            {business.name}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
                 {role === 'admin' && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/business">
                                <Settings className="mr-2 h-4 w-4" />
                                Manage Businesses
                            </Link>
                        </DropdownMenuItem>
                    </>
                 )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function Header({children}: {children?: React.ReactNode}) {
  const { user, logout, role } = useAuth();
  const pathname = usePathname();
  const title = getTitleFromPath(pathname);

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-muted-foreground" />;
      case 'agent':
        return <Briefcase className="h-4 w-4 text-muted-foreground" />;
      case 'customer':
        return <User className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getInitials = (name?: string) => {
    if (name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user?.role ? user.role.charAt(0).toUpperCase() : 'U';
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      {children}
      <h1 className="text-xl font-semibold md:text-2xl">{title}</h1>
      <div className="ml-auto flex items-center gap-2">
        <BusinessSwitcher />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://placehold.co/100x100.png`} alt={user?.name || 'User'} />
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                <div className="flex items-center gap-2">
                    {getRoleIcon()}
                    <p className="text-xs leading-none text-muted-foreground capitalize">{user?.role}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
