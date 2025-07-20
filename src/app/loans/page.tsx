'use client';

import { useEffect, useState } from 'react';
import { getLoans } from '@/lib/storage';
import type { Loan } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const { role } = useAuth();
  
  useEffect(() => {
    const allLoans = getLoans();
    // In a real app, customer's view would be filtered by their ID.
    // For this simulation, customers see all loans for demo purposes.
    setLoans(allLoans);
  }, []);

  const getStatus = (loan: Loan) => {
    return loan.emis.every(e => e.status === 'Paid') ? 'Closed' : 'Active';
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
         <div>
          <h1 className="text-2xl font-bold tracking-tight">{role === 'customer' ? 'My Loans' : 'All Loans'}</h1>
          <p className="text-muted-foreground">View and manage loan accounts.</p>
        </div>
        {role === 'admin' && (
            <Button asChild>
                <Link href="/loans/disburse">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Disburse Loan
                </Link>
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Accounts</CardTitle>
          <CardDescription>A list of all loan accounts.</CardDescription>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.length > 0 ? (
                loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.id}</TableCell>
                    <TableCell>{loan.customerName}</TableCell>
                    <TableCell>${loan.amount.toLocaleString()}</TableCell>
                    <TableCell>{loan.interestRate}%</TableCell>
                    <TableCell>{loan.tenure} months</TableCell>
                    <TableCell>{getStatus(loan)}</TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/loans/${loan.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No loans found.
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
