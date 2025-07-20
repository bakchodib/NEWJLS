
'use client';

import { useAuth } from '@/contexts/auth-context';
import { getCustomers, getLoans } from '@/lib/storage';
import { useEffect, useState, useCallback } from 'react';
import type { Customer, Loan, EMI } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Landmark, DollarSign, AlertCircle, CheckCircle, Hourglass } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { usePathname, useSearchParams } from 'next/navigation';

const AdminDashboard = ({ stats }: { stats: any }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.totalCustomers}</div>
        <Link href="/customers" className="text-xs text-muted-foreground underline">View all customers</Link>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
        <Landmark className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.totalLoans}</div>
        <p className="text-xs text-muted-foreground">
          Net Disbursed: ₹{stats.netDisbursed.toLocaleString()}
        </p>
         <Link href="/loans" className="text-xs text-muted-foreground underline">View all loans</Link>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Overdue EMIs</CardTitle>
        <AlertCircle className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.overdueEmis}</div>
        <p className="text-xs text-muted-foreground">Action required</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild><Link href="/customers/register">Register New Customer</Link></Button>
        <Button asChild variant="secondary"><Link href="/loans/apply">New Loan Application</Link></Button>
      </CardContent>
    </Card>
  </div>
);

const AgentDashboard = ({ stats }: { stats: any }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Your Assigned Customers</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.totalCustomers}</div>
        <p className="text-xs text-muted-foreground">All registered customers</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Upcoming EMI Collections</CardTitle>
        <Hourglass className="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.upcomingEmis}</div>
        <p className="text-xs text-muted-foreground">In the next 7 days</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Overdue EMIs</CardTitle>
        <AlertCircle className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.overdueEmis}</div>
        <p className="text-xs text-muted-foreground">Follow up required</p>
      </CardContent>
    </Card>
  </div>
);

const CustomerDashboard = ({ stats }: { stats: any }) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
        <Landmark className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.activeLoans}</div>
        <Link href="/loans" className="text-xs text-muted-foreground underline">View my loans</Link>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">₹{stats.totalOutstanding.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">Across all loans</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Next EMI Due</CardTitle>
        <Hourglass className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.nextEmiDate}</div>
        <p className="text-xs text-muted-foreground">Amount: ₹{stats.nextEmiAmount.toLocaleString()}</p>
      </CardContent>
    </Card>
  </div>
);

const DashboardSkeleton = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent><Skeleton className="h-8 w-1/2"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent><Skeleton className="h-8 w-1/2"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent><Skeleton className="h-8 w-1/2"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent className="flex flex-col gap-2"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent></Card>
    </div>
)


export default function DashboardPage() {
  const { role, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);

  // By using pathname, this effect will re-run on navigation to this page.
  const pathname = usePathname();
  const searchParams = useSearchParams(); // Also watch for query param changes

  const fetchStats = useCallback(async () => {
    if (!role) return;
    try {
        setStats(null); // Set to null to show skeleton while fetching
        const [customers, loans] = await Promise.all([getCustomers(), getLoans()]);
        
        const now = new Date();
        
        let dashboardStats = {};

        if (role === 'admin' || role === 'agent') {
            const today = new Date();
            const nextWeek = new Date();
            nextWeek.setDate(today.getDate() + 7);
            const disbursedLoans = loans.filter(l => l.status === 'Disbursed' || l.status === 'Closed');
            
            const allPendingEmis = disbursedLoans.flatMap(loan => loan.emis.filter(emi => emi.status === 'Pending'));

            const netDisbursed = disbursedLoans.reduce((acc, loan) => {
                const processingFeeAmount = loan.amount * (loan.processingFee / 100);
                const netAmount = loan.amount - processingFeeAmount;
                return acc + netAmount;
            }, 0);

            dashboardStats = {
                totalCustomers: customers.length,
                totalLoans: disbursedLoans.length,
                netDisbursed: netDisbursed,
                overdueEmis: allPendingEmis.filter(emi => new Date(emi.dueDate) < now && emi.status === 'Pending').length,
                upcomingEmis: allPendingEmis.filter(emi => new Date(emi.dueDate) >= today && new Date(emi.dueDate) <= nextWeek).length
            };
        } else if (role === 'customer') {
            // In a real app, you'd filter by customer ID. Here we just show all loans for simplicity.
            const customerLoans = loans;
            const activeLoans = customerLoans.filter(l => l.emis.some(e => e.status === 'Pending'));
            const outstandingEmis = activeLoans.flatMap(l => l.emis).filter(e => e.status === 'Pending');
            const nextEmi = outstandingEmis.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
            
            dashboardStats = {
                activeLoans: activeLoans.length,
                totalOutstanding: outstandingEmis.reduce((acc, emi) => acc + emi.amount, 0),
                nextEmiDate: nextEmi ? format(new Date(nextEmi.dueDate), 'dd-MM-yyyy') : 'N/A',
                nextEmiAmount: nextEmi ? nextEmi.amount : 0,
            };
        }
        
        setStats(dashboardStats);
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
    }
  }, [role]);

  useEffect(() => {
    if (!loading && role) {
        fetchStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, loading, pathname, searchParams]); // fetchStats is now stable due to useCallback


  if (!stats) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {role}!</h1>
        {role === 'admin' && <AdminDashboard stats={stats} />}
        {role === 'agent' && <AgentDashboard stats={stats} />}
        {role === 'customer' && <CustomerDashboard stats={stats} />}
    </div>
  );
}
