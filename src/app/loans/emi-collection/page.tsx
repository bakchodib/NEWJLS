
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { getLoans, getCustomers, updateLoan, getLoanById } from '@/lib/storage';
import type { Loan, Customer, EMI } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Wallet, MessageCircle } from 'lucide-react';
import { format, getYear, getMonth, setYear, setMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface DueEmi extends EMI {
  loanId: string;
  customer: Customer;
}

function WhatsappPreview({ open, onOpenChange, message }: { open: boolean, onOpenChange: (open: boolean) => void, message: string }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => onOpenChange(false)}>
            <div className="bg-white dark:bg-card rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><MessageCircle className="text-green-500"/>WhatsApp Preview</h3>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm">
                    <p className="font-bold">FinanceFlow Bot</p>
                    <p>{message}</p>
                </div>
                <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
        </div>
    );
}

export default function EmiCollectionPage() {
  const [dueEmis, setDueEmis] = useState<DueEmi[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const { role, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [whatsappPreview, setWhatsappPreview] = useState({ open: false, message: '' });

  const years = useMemo(() => {
    // Just provide a range of years for simplicity
    const currentYear = getYear(new Date());
    return Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).sort((a,b) => b-a);
  }, []);

  const months = useMemo(() => {
      return Array.from({length: 12}, (_, i) => ({ value: i, name: format(new Date(2000, i), 'MMMM')}))
  }, []);

  const fetchDueEmis = useCallback(async () => {
    try {
        setIsLoading(true);
        const [loans, customers] = await Promise.all([getLoans(), getCustomers()]);
        
        const customersMap = new Map(customers.map(c => [c.id, c]));
        const disbursedLoans = loans.filter(l => l.status === 'Disbursed' || l.status === 'Closed');
        
        const selectedMonth = getMonth(selectedDate);
        const selectedYear = getYear(selectedDate);

        const monthlyDueEmis: DueEmi[] = [];

        disbursedLoans.forEach(loan => {
            const customer = customersMap.get(loan.customerId);
            if (!customer) return;

            loan.emis.forEach(emi => {
            const dueDate = new Date(emi.dueDate);
            if (emi.status === 'Pending' && getMonth(dueDate) === selectedMonth && getYear(dueDate) === selectedYear) {
                monthlyDueEmis.push({ ...emi, loanId: loan.id, customer });
            }
            });
        });

        setDueEmis(monthlyDueEmis.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    } catch(error) {
        toast({ title: 'Error', description: 'Failed to fetch due EMIs.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [selectedDate, toast]);


  useEffect(() => {
    if (!loading && (role !== 'admin' && role !== 'agent')) {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else {
      fetchDueEmis();
    }
  }, [role, loading, router, toast, fetchDueEmis]);

  const totalDueAmount = useMemo(() => {
    return dueEmis.reduce((acc, emi) => acc + emi.amount, 0);
  }, [dueEmis]);

  const handleMonthChange = (monthValue: string) => {
    setSelectedDate(current => setMonth(current, parseInt(monthValue, 10)));
  }

  const handleYearChange = (yearValue: string) => {
    setSelectedDate(current => setYear(current, parseInt(yearValue, 10)));
  }

  const handleCollectEmi = async (loanId: string, emiId: string) => {
    const loan = await getLoanById(loanId);
    if (!loan) return;

    let collectedEmi: EMI | undefined;
    const emiIndex = loan.emis.findIndex(emi => emi.id === emiId);

    if (emiIndex === -1) return;

    const updatedEmis = loan.emis.map((emi, index) => {
        if (emi.id === emiId) {
            collectedEmi = { 
                ...emi, 
                status: 'Paid' as const, 
                paymentDate: new Date().toISOString(),
                paymentMethod: 'Cash',
                receiptNumber: `RCPT-${loan.id}-${index + 1}`
            };
            return collectedEmi;
        }
        return emi;
    });

    const updatedLoan = { ...loan, emis: updatedEmis };
    
    try {
        await updateLoan(updatedLoan);
        await fetchDueEmis(); // Refresh the list
        
        toast({
            title: 'EMI Collected!',
            description: `Successfully collected ₹${collectedEmi?.amount} from ${loan.customerName}.`,
        });

         if (collectedEmi) {
            setWhatsappPreview({
                open: true,
                message: `Dear ${loan.customerName}, your EMI payment of ₹${collectedEmi.amount} for loan ${loan.id} has been received. Thank you.`
            });
        }
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to collect EMI.', variant: 'destructive' });
    }
  }


  const generateReportPDF = async () => {
    const doc = new jsPDF();
    const monthName = format(selectedDate, 'MMMM yyyy');

    doc.setFontSize(12);
    doc.text(`EMI Due Report - ${monthName}`, 14, 22);

    const body = dueEmis.map((emi) => {
        return [
            emi.customer.name,
            emi.customer.phone,
            emi.customer.guarantorName,
            emi.customer.guarantorPhone,
            `₹${emi.amount.toLocaleString()}`,
        ]
    });

    autoTable(doc, {
        startY: 30,
        head: [['Customer', 'Phone', 'Guarantor', 'Guarantor Phone', 'EMI Amount']],
        body: body,
        foot: [[ {content: `Total Due: ₹${totalDueAmount.toLocaleString()}`, colSpan: 5, styles: { halign: 'right' } } ]],
        footStyles: { fontStyle: 'bold' },
        rowPageBreak: 'avoid',
    });
    
    doc.save(`emi_due_report_${monthName.toLowerCase().replace(' ', '_')}.pdf`);
  }

  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
        </TableRow>
    ))
  );

  if (loading || (role !== 'admin' && role !== 'agent')) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
       <WhatsappPreview 
        open={whatsappPreview.open} 
        onOpenChange={(open) => setWhatsappPreview({ open, message: '' })} 
        message={whatsappPreview.message}
      />
      <Card>
        <CardHeader>
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <CardTitle>EMI Collection for {format(selectedDate, 'MMMM yyyy')}</CardTitle>
                    <CardDescription>
                        A list of all EMIs due this month. Total due: <span className="font-bold">₹{totalDueAmount.toLocaleString()}</span>
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={String(getMonth(selectedDate))} onValueChange={handleMonthChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map(month => (
                                <SelectItem key={month.value} value={String(month.value)}>{month.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={String(getYear(selectedDate))} onValueChange={handleYearChange}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(year => (
                                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={generateReportPDF} disabled={dueEmis.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? renderSkeleton() : dueEmis.length > 0 ? (
                dueEmis.map((emi) => (
                  <TableRow key={emi.id}>
                    <TableCell className="font-medium">
                        <div>{emi.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{emi.customer.phone}</div>
                    </TableCell>
                    <TableCell>{format(new Date(emi.dueDate), 'dd-MM-yyyy')}</TableCell>
                    <TableCell className="font-bold">₹{emi.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                        <Button size="sm" onClick={() => handleCollectEmi(emi.loanId, emi.id)}>
                            <Wallet className="mr-2 h-4 w-4" />
                            Collect
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No pending EMIs to collect for {format(selectedDate, 'MMMM yyyy')}.
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
