
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getLoans, updateLoan, disburseLoan, deleteLoan } from '@/lib/storage';
import type { Loan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeCheck, XCircle, Hourglass, ChevronsRight, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getDaysInMonth, getYear, getMonth, getDate, setYear, setMonth, setDate, format } from 'date-fns';

export default function LoanApplicationsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { role, loading, selectedBusiness } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [disburseLoanId, setDisburseLoanId] = useState<string | null>(null);
  const [disbursalDate, setDisbursalDate] = useState<Date>(new Date());

  const fetchLoans = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      setIsLoading(true);
      const allLoans = await getLoans(selectedBusiness.id);
      setLoans(allLoans);
    } catch(error) {
      toast({ title: 'Error', description: 'Failed to fetch loan applications.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness, toast]);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else if(role === 'admin' && selectedBusiness) {
      fetchLoans();
    }
  }, [role, loading, router, toast, selectedBusiness, fetchLoans]);
  
  const updateLoanStatus = async (loanId: string, status: 'Approved' | 'Rejected') => {
    const loanToUpdate = loans.find(l => l.id === loanId);
    if (loanToUpdate) {
      const updatedLoan = { ...loanToUpdate, status };
      try {
        await updateLoan(updatedLoan);
        await fetchLoans();
        toast({ title: `Loan ${status}`, description: `The loan application ${loanId} has been ${status.toLowerCase()}.` });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update loan status.', variant: 'destructive' });
      }
    }
  };

  const handleDisburseConfirm = async () => {
    if (!disburseLoanId || !disbursalDate || !selectedBusiness?.id) {
        toast({ title: 'Error', description: 'Loan ID, business, or disbursal date is missing.', variant: 'destructive' });
        return;
    }
    try {
        await disburseLoan(disburseLoanId, disbursalDate);
        await fetchLoans();
        toast({ title: 'Loan Disbursed', description: `Loan ${disburseLoanId} has been disbursed and EMI schedule generated.` });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to disburse loan.', variant: 'destructive' });
    } finally {
        setDisburseLoanId(null);
        setDisbursalDate(new Date());
    }
  }

  const handleDelete = async (loanId: string) => {
    if (!selectedBusiness?.id) return;
    try {
        await deleteLoan(selectedBusiness.id, loanId);
        await fetchLoans();
        toast({ title: 'Loan Deleted', description: 'The loan has been permanently removed.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete loan.', variant: 'destructive' });
    }
  }

  const filteredLoans = useMemo(() => ({
    pending: loans.filter(l => l.status === 'Pending'),
    approved: loans.filter(l => l.status === 'Approved'),
    rejected: loans.filter(l => l.status === 'Rejected'),
  }), [loans]);


  if (loading || role !== 'admin' || !selectedBusiness) {
    return <div>Loading...</div>;
  }
  
  const DateSelector = () => {
      const currentYear = getYear(new Date());
      const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
      const months = Array.from({ length: 12 }, (_, i) => ({ value: i, name: format(new Date(2000, i), 'MMMM')}));
      const daysInSelectedMonth = getDaysInMonth(disbursalDate);
      const days = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

      return (
        <div className="flex justify-center gap-4">
            <Select value={String(getDate(disbursalDate))} onValueChange={(day) => setDisbursalDate(d => setDate(d, parseInt(day)))}>
                <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>
                    {days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={String(getMonth(disbursalDate))} onValueChange={(month) => setDisbursalDate(d => setMonth(d, parseInt(month)))}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={String(getYear(disbursalDate))} onValueChange={(year) => setDisbursalDate(d => setYear(d, parseInt(year)))}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      );
  }

  const LoanTable = ({ loans, type }: { loans: Loan[], type: 'Pending' | 'Approved' | 'Rejected' }) => (
     <Table>
        <TableHeader>
            <TableRow>
            <TableHead>Loan ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Tenure</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : loans.length > 0 ? (
            loans.map((loan) => (
                <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.id}</TableCell>
                <TableCell>{loan.customerName}</TableCell>
                <TableCell>₹{loan.amount.toLocaleString()}</TableCell>
                <TableCell>{loan.tenure} months</TableCell>
                <TableCell><Badge variant={loan.status === 'Pending' ? 'secondary' : loan.status === 'Approved' ? 'default' : 'destructive'}>{loan.status}</Badge></TableCell>
                <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                        {type === 'Pending' && (
                            <>
                                <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white" onClick={() => updateLoanStatus(loan.id, 'Approved')}><BadgeCheck className="mr-2"/>Approve</Button>
                                <Button size="sm" variant="destructive" onClick={() => updateLoanStatus(loan.id, 'Rejected')}><XCircle className="mr-2"/>Reject</Button>
                            </>
                        )}
                        {type === 'Approved' && (
                             <Button size="sm" onClick={() => setDisburseLoanId(loan.id)}><ChevronsRight className="mr-2"/>Disburse</Button>
                        )}
                         {type === 'Rejected' && (
                             <span className="text-xs text-muted-foreground">No actions available</span>
                        )}
                        {(type === 'Pending' || type === 'Approved') && (
                             <Button asChild variant="outline" size="sm">
                                <Link href={`/loans/edit/${loan.id}`}>
                                    <Pencil className="mr-2 h-4 w-4"/>
                                    Edit
                                </Link>
                             </Button>
                        )}
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
                                    This action cannot be undone. This will permanently delete the loan application.
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
                    </div>
                </TableCell>
                </TableRow>
            ))
            ) : (
            <TableRow>
                <TableCell colSpan={6} className="text-center">
                No loans in this category.
                </TableCell>
            </TableRow>
            )}
        </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Loan Applications</CardTitle>
          <CardDescription>Review, approve, reject, and disburse loan applications for {selectedBusiness.name}.</CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="pending">
                <TabsList>
                    <TabsTrigger value="pending">
                        <Hourglass className="mr-2"/> Pending ({filteredLoans.pending.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        <BadgeCheck className="mr-2"/> Approved ({filteredLoans.approved.length})
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                        <XCircle className="mr-2"/> Rejected ({filteredLoans.rejected.length})
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                    <LoanTable loans={filteredLoans.pending} type="Pending" />
                </TabsContent>
                <TabsContent value="approved">
                    <LoanTable loans={filteredLoans.approved} type="Approved" />
                </TabsContent>
                <TabsContent value="rejected">
                    <LoanTable loans={filteredLoans.rejected} type="Rejected" />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      <Dialog open={!!disburseLoanId} onOpenChange={(open) => !open && setDisburseLoanId(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirm Loan Disbursal</DialogTitle>
                <DialogDescription>
                    Select the date of disbursal for loan: {disburseLoanId}. The EMI schedule will be generated based on this date.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex justify-center">
                <DateSelector />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDisburseLoanId(null)}>Cancel</Button>
                <Button onClick={handleDisburseConfirm}>Confirm Disbursal</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
