
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getLoans, deleteLoan } from '@/lib/storage';
import type { Loan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Eye, FileText, Trash2, Landmark, Wallet, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { role, selectedBusiness } = useAuth();
  const { toast } = useToast();
  
  const [totalDisbursed, setTotalDisbursed] = useState(0);
  const [netDisbursed, setNetDisbursed] = useState(0);
  const [toBeCollected, setToBeCollected] = useState(0);
  
  const fetchLoans = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
        setIsLoading(true);
        const allLoans = await getLoans(selectedBusiness.id);
        const relevantLoans = allLoans.filter(l => l.status === 'Disbursed' || l.status === 'Closed');

        // In a real app, customer's view would be filtered by their ID.
        // For this simulation, customers see all loans for demo purposes.
        setLoans(relevantLoans);
        
        // Calculate stats only if admin
        if (role === 'admin') {
          const totalDisbursedAmount = relevantLoans.reduce((acc, loan) => acc + loan.amount, 0);

          const netDisbursedAmount = relevantLoans.reduce((acc, loan) => {
              const processingFeeAmount = loan.amount * (loan.processingFee / 100);
              const netAmount = loan.amount - processingFeeAmount;
              return acc + netAmount;
          }, 0);

          const activeLoans = relevantLoans.filter(l => l.status === 'Disbursed');
          const toBeCollectedAmount = activeLoans
              .flatMap(loan => loan.emis)
              .filter(emi => emi.status === 'Pending')
              .reduce((acc, emi) => acc + emi.amount, 0);

          setTotalDisbursed(totalDisbursedAmount);
          setNetDisbursed(netDisbursedAmount);
          setToBeCollected(toBeCollectedAmount);
        }

    } catch (error) {
        toast({ title: "Error", description: "Failed to fetch loans.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [selectedBusiness, role, toast]);

  useEffect(() => {
    if (selectedBusiness) {
        fetchLoans();
    }
  }, [selectedBusiness, fetchLoans]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Disbursed': return <Badge variant="secondary" className="bg-blue-500 text-white">Active</Badge>;
      case 'Closed': return <Badge variant="default" className="bg-green-600">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  const handleDelete = async (loanId: string) => {
    if (!selectedBusiness?.id) return;
    try {
      await deleteLoan(selectedBusiness.id, loanId);
      await fetchLoans();
      toast({ title: 'Loan Deleted', description: 'The loan has been permanently removed.' });
    } catch(error) {
      toast({ title: "Error", description: "Failed to delete loan.", variant: "destructive" });
    }
  }

  const renderSkeleton = () => (
    Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-6 w-16" /></TableCell>
            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
        </TableRow>
    ))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
         <div>
          <h1 className="text-2xl font-bold tracking-tight">{role === 'customer' ? 'My Loans' : 'Disbursed Loans'}</h1>
          <p className="text-muted-foreground">View and manage active and closed loan accounts for {selectedBusiness?.name}.</p>
        </div>
        {role === 'admin' && (
            <div className="flex gap-2">
                 <Button asChild variant="outline">
                    <Link href="/loans/applications">
                        <FileText className="mr-2 h-4 w-4" />
                        View Applications
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/loans/apply">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Application
                    </Link>
                </Button>
            </div>
        )}
      </div>

       {role === 'admin' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalDisbursed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Gross principal amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Disbursed</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{netDisbursed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">After processing fees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">To Be Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{toBeCollected.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From all pending EMIs</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Loan Accounts</CardTitle>
          <CardDescription>A list of all disbursed loan accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Interest Rate</TableHead>
                <TableHead>Tenure</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? renderSkeleton() : loans.length > 0 ? (
                loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.id}</TableCell>
                    <TableCell>{loan.customerName}</TableCell>
                    <TableCell>₹{loan.amount.toLocaleString()}</TableCell>
                    <TableCell>{loan.interestRate}%</TableCell>
                    <TableCell>{loan.tenure} months</TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/loans/${loan.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                            </Link>
                        </Button>
                        {role === 'admin' && (
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4"/>
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the loan and all its associated EMI data.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(loan.id)}>
                                        Continue
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No disbursed loans found for this business.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
