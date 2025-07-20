'use client';

import { useAuth } from '@/contexts/auth-context';
import { getCustomers, getLoans } from '@/lib/storage';
import { useEffect, useState } from 'react';
import type { Customer, Loan, EMI } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Landmark, DollarSign, AlertCircle, CheckCircle, Hourglass } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
          Total Disbursed: ${stats.totalDisbursed.toLocaleString()}
        </p>
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
        <Button asChild variant="secondary"><Link href="/loans/disburse">Disburse New Loan</Link></Button>
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
        <div className="text-2xl font-bold">${stats.totalOutstanding.toLocaleString()}</div>
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
        <p className="text-xs text-muted-foreground">Amount: ${stats.nextEmiAmount.toLocaleString()}</p>
      </CardContent>
    </Card>
  </div>
);


export default function DashboardPage() {
  const { role } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const customers = getCustomers();
    const loans = getLoans();
    const allEmis = loans.flatMap(l => l.emis);
    const now = new Date();
    
    let dashboardStats = {};

    if (role === 'admin' || role === 'agent') {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        dashboardStats = {
            totalCustomers: customers.length,
            totalLoans: loans.length,
            totalDisbursed: loans.reduce((acc, loan) => acc + loan.amount, 0),
            overdueEmis: allEmis.filter(emi => emi.status === 'Pending' && new Date(emi.dueDate) < now).length,
            upcomingEmis: allEmis.filter(emi => emi.status === 'Pending' && new Date(emi.dueDate) >= today && new Date(emi.dueDate) <= nextWeek).length
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
            nextEmiDate: nextEmi ? new Date(nextEmi.dueDate).toLocaleDateString() : 'N/A',
            nextEmiAmount: nextEmi ? nextEmi.amount : 0,
        };
    }
    
    setStats(dashboardStats);
  }, [role]);

  if (!stats) return <div>Loading dashboard...</div>;

  return (
    <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {role}!</h1>
        {role === 'admin' && <AdminDashboard stats={stats} />}
        {role === 'agent' && <AgentDashboard stats={stats} />}
        {role === 'customer' && <CustomerDashboard stats={stats} />}
    </div>
  );
}