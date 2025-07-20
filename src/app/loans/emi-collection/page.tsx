
'use client';

import { useEffect, useState, useMemo } from 'react';
import { getLoans, getCustomers } from '@/lib/storage';
import type { Loan, Customer, EMI } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import { format } from 'date-fns';

interface DueEmi extends EMI {
  loanId: string;
  customer: Customer;
}

export default function EmiCollectionPage() {
  const [dueEmis, setDueEmis] = useState<DueEmi[]>([]);
  const { role, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (role !== 'admin' && role !== 'agent')) {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else {
      const loans = getLoans().filter(l => l.status === 'Disbursed');
      const customers = getCustomers();
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthlyDueEmis: DueEmi[] = [];

      loans.forEach(loan => {
        const customer = customers.find(c => c.id === loan.customerId);
        if (!customer) return;

        loan.emis.forEach(emi => {
          const dueDate = new Date(emi.dueDate);
          if (emi.status === 'Pending' && dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
            monthlyDueEmis.push({ ...emi, loanId: loan.id, customer });
          }
        });
      });

      setDueEmis(monthlyDueEmis);
    }
  }, [role, loading, router, toast]);

  const totalDueAmount = useMemo(() => {
    return dueEmis.reduce((acc, emi) => acc + emi.amount, 0);
  }, [dueEmis]);

  const generateReportPDF = () => {
    const doc = new jsPDF();
    const monthName = format(new Date(), 'MMMM yyyy');
    
    doc.setFontSize(18);
    doc.text(`EMI Due Report - ${monthName}`, 14, 22);
    
    autoTable(doc, {
        startY: 30,
        head: [['Customer', 'Phone', 'Guarantor', 'Guarantor Phone', 'EMI Amount']],
        body: dueEmis.map(emi => [
            emi.customer.name,
            { content: emi.customer.phone, styles: { textColor: [0, 0, 255] }, url: `tel:${emi.customer.phone}` },
            emi.customer.guarantorName,
            { content: emi.customer.guarantorPhone, styles: { textColor: [0, 0, 255] }, url: `tel:${emi.customer.guarantorPhone}` },
            `₹${emi.amount.toLocaleString()}`,
        ]),
        foot: [[`Total Due: ₹${totalDueAmount.toLocaleString()}`, '', '', '', '']],
        footStyles: { fontStyle: 'bold' }
    });
    
    doc.save(`emi_due_report_${monthName.toLowerCase().replace(' ', '_')}.pdf`);
  }

  if (loading || (role !== 'admin' && role !== 'agent')) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>EMI Collection for {format(new Date(), 'MMMM yyyy')}</CardTitle>
                    <CardDescription>
                        A list of all EMIs due this month. Total due: <span className="font-bold">₹{totalDueAmount.toLocaleString()}</span>
                    </CardDescription>
                </div>
                <Button onClick={generateReportPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                </Button>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Guarantor Name</TableHead>
                <TableHead>Guarantor Phone</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">EMI Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dueEmis.length > 0 ? (
                dueEmis.map((emi) => (
                  <TableRow key={emi.id}>
                    <TableCell className="font-medium">{emi.customer.name}</TableCell>
                    <TableCell>
                      <a href={`tel:${emi.customer.phone}`} className="text-blue-600 hover:underline">{emi.customer.phone}</a>
                    </TableCell>
                    <TableCell>{emi.customer.guarantorName}</TableCell>
                     <TableCell>
                        <a href={`tel:${emi.customer.guarantorPhone}`} className="text-blue-600 hover:underline">{emi.customer.guarantorPhone}</a>
                     </TableCell>
                    <TableCell>{format(new Date(emi.dueDate), 'dd-MMM-yyyy')}</TableCell>
                    <TableCell className="text-right font-bold">₹{emi.amount.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No EMIs due for the current month.
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
