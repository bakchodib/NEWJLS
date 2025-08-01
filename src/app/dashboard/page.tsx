
'use client';

import { useAuth } from '@/contexts/auth-context';
import { getCustomers, getLoans, exportBusinessData, importBusinessData } from '@/lib/storage';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { Customer, Loan, EMI, Business } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Landmark, DollarSign, AlertCircle, CheckCircle, Hourglass, Import, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const AdminDashboard = ({ stats, onExport, onImport }: { stats: any, onExport: () => void, onImport: () => void }) => (
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
        <CardTitle className="text-sm font-medium">Actions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild><Link href="/customers/register">Register New Customer</Link></Button>
        <Button asChild variant="secondary"><Link href="/loans/apply">New Loan Application</Link></Button>
      </CardContent>
    </Card>
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Import/Export Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
            <Button variant="outline" onClick={onExport}><Import className="mr-2 h-4 w-4"/>Export Data</Button>
            <Button variant="outline" onClick={onImport}><Upload className="mr-2 h-4 w-4"/>Import Data</Button>
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
        <Card><CardHeader><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent className="flex flex-col gap-2"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-4 w-3/4"/></CardHeader><CardContent className="flex flex-col gap-2"><Skeleton className="h-10 w-full"/><Skeleton className="h-10 w-full"/></CardContent></Card>
    </div>
)

const ImportDialog = ({ businesses, onImportConfirm, open, onOpenChange }: { businesses: Business[], onImportConfirm: (file: File, targetBusinessId: string) => void, open: boolean, onOpenChange: (open: boolean) => void }) => {
    const [targetBusinessId, setTargetBusinessId] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = () => {
        if(file && targetBusinessId) {
            onImportConfirm(file, targetBusinessId);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import Data</DialogTitle>
                    <DialogDescription>
                        Import customers and loans from a previously exported JSON file. It's recommended to import into a new, empty business to avoid conflicts.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="import-file">Exported JSON File</Label>
                        <Input id="import-file" type="file" accept=".json" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </div>
                    <div>
                        <Label>Target Business</Label>
                        <Select onValueChange={setTargetBusinessId} value={targetBusinessId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a business to import into" />
                            </SelectTrigger>
                            <SelectContent>
                                {businesses.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleImport} disabled={!file || !targetBusinessId}>Start Import</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default function DashboardPage() {
  const { role, loading, selectedBusiness, businesses } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!role || !selectedBusiness?.id) return;
    try {
        setStats(null); // Set to null to show skeleton while fetching
        const [customers, loans] = await Promise.all([
          getCustomers(selectedBusiness.id), 
          getLoans(selectedBusiness.id)
        ]);
        
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
  }, [role, selectedBusiness?.id]);

  useEffect(() => {
    if (!loading && role && selectedBusiness) {
        fetchStats();
    }
  }, [role, loading, selectedBusiness, fetchStats]);

  const handleExport = async () => {
    if (!selectedBusiness) return;
    setIsExporting(true);
    toast({ title: 'Exporting...', description: `Preparing data for ${selectedBusiness.name}` });
    try {
        const data = await exportBusinessData(selectedBusiness.id);
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `${selectedBusiness.name.replace(/\s+/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        toast({ title: 'Export Successful', description: 'Your data has been downloaded.' });
    } catch (error) {
        toast({ title: 'Export Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setIsExporting(false);
    }
  };

  const handleImport = async (file: File, targetBusinessId: string) => {
    setIsImporting(true);
    setIsImportDialogOpen(false);
    toast({ title: 'Importing...', description: 'Please wait while data is being imported.' });
    try {
        const fileContent = await file.text();
        const data = JSON.parse(fileContent);
        await importBusinessData(data, targetBusinessId);
        toast({ title: 'Import Successful!', description: 'Data has been imported. Please refresh if you do not see the changes.' });
    } catch (error) {
         toast({ title: 'Import Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setIsImporting(false);
    }
  };

  if (loading || !stats) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to {selectedBusiness?.name || role}!</h1>
        {role === 'admin' && <AdminDashboard stats={stats} onExport={handleExport} onImport={() => setIsImportDialogOpen(true)} />}
        {role === 'agent' && <AgentDashboard stats={stats} />}
        {role === 'customer' && <CustomerDashboard stats={stats} />}
        {role === 'admin' && <ImportDialog businesses={businesses} onImportConfirm={handleImport} open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />}
    </div>
  );
}
