
'use client';

import { useEffect, useState, useMemo } from 'react';
import { getLoans, updateLoan, disburseLoan } from '@/lib/storage';
import type { Loan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeCheck, XCircle, Hourglass, ChevronsRight } from 'lucide-react';

export default function LoanApplicationsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const { role, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else {
      setLoans(getLoans());
    }
  }, [role, loading, router, toast]);
  
  const updateLoanStatus = (loanId: string, status: 'Approved' | 'Rejected') => {
    const allLoans = getLoans();
    const loanToUpdate = allLoans.find(l => l.id === loanId);
    if (loanToUpdate) {
      loanToUpdate.status = status;
      updateLoan(loanToUpdate);
      setLoans(getLoans());
      toast({ title: `Loan ${status}`, description: `The loan application ${loanId} has been ${status.toLowerCase()}.` });
    }
  };

  const handleDisburse = (loanId: string) => {
    const disbursed = disburseLoan(loanId);
    if(disbursed) {
        setLoans(getLoans());
        toast({ title: 'Loan Disbursed', description: `Loan ${loanId} has been disbursed and EMI schedule generated.` });
    }
  }

  const filteredLoans = useMemo(() => ({
    pending: loans.filter(l => l.status === 'Pending'),
    approved: loans.filter(l => l.status === 'Approved'),
    rejected: loans.filter(l => l.status === 'Rejected'),
  }), [loans]);


  if (loading || role !== 'admin') {
    return <div>Loading...</div>;
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
            {loans.length > 0 ? (
            loans.map((loan) => (
                <TableRow key={loan.id}>
                <TableCell className="font-medium">{loan.id}</TableCell>
                <TableCell>{loan.customerName}</TableCell>
                <TableCell>₹{loan.amount.toLocaleString()}</TableCell>
                <TableCell>{loan.tenure} months</TableCell>
                <TableCell><Badge variant={loan.status === 'Pending' ? 'secondary' : loan.status === 'Approved' ? 'default' : 'destructive'}>{loan.status}</Badge></TableCell>
                <TableCell className="text-right">
                    {type === 'Pending' && (
                        <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="border-green-500 text-green-500 hover:bg-green-500 hover:text-white" onClick={() => updateLoanStatus(loan.id, 'Approved')}><BadgeCheck className="mr-2"/>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateLoanStatus(loan.id, 'Rejected')}><XCircle className="mr-2"/>Reject</Button>
                        </div>
                    )}
                    {type === 'Approved' && (
                         <Button size="sm" onClick={() => handleDisburse(loan.id)}><ChevronsRight className="mr-2"/>Disburse</Button>
                    )}
                     {type === 'Rejected' && (
                         <span className="text-xs text-muted-foreground">No actions available</span>
                    )}
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
          <CardDescription>Review, approve, reject, and disburse loan applications.</CardDescription>
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
    </div>
  );
}
