
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
import { Download, Wallet, MessageCircle, PiggyBank, BadgeCheck, Hourglass } from 'lucide-react';
import { format, getYear, getMonth, setYear, setMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface MonthlyEmi extends EMI {
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
                    <p className="font-bold">JLS FINACE LTD Bot</p>
                    <p>{message}</p>
                </div>
                <Button className="w-full mt-4" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
        </div>
    );
}

export default function EmiCollectionPage() {
  const [monthlyEmis, setMonthlyEmis] = useState<MonthlyEmi[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const { role, loading, selectedBusiness } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [whatsappPreview, setWhatsappPreview] = useState({ open: false, message: '' });

  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    return Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).sort((a,b) => b-a);
  }, []);

  const months = useMemo(() => {
      return Array.from({length: 12}, (_, i) => ({ value: i, name: format(new Date(2000, i), 'MMMM')}))
  }, []);

  const fetchMonthlyEmis = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
        setIsLoading(true);
        const [loans, customers] = await Promise.all([
            getLoans(selectedBusiness.id), 
            getCustomers(selectedBusiness.id)
        ]);
        
        const customersMap = new Map(customers.map(c => [c.id, c]));
        const disbursedLoans = loans.filter(l => l.status === 'Disbursed' || l.status === 'Closed');
        
        const selectedMonth = getMonth(selectedDate);
        const selectedYear = getYear(selectedDate);

        const allMonthlyEmis: MonthlyEmi[] = [];

        disbursedLoans.forEach(loan => {
            const customer = customersMap.get(loan.customerId);
            if (!customer) return;

            loan.emis.forEach(emi => {
                const dueDate = new Date(emi.dueDate);
                if (getMonth(dueDate) === selectedMonth && getYear(dueDate) === selectedYear) {
                    allMonthlyEmis.push({ ...emi, loanId: loan.id, customer });
                }
            });
        });

        setMonthlyEmis(allMonthlyEmis.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    } catch(error) {
        toast({ title: 'Error', description: 'Failed to fetch EMIs for the month.', variant: 'destructive' });
    } finally {
        setIsLoading(false);
    }
  }, [selectedDate, toast, selectedBusiness]);


  useEffect(() => {
    if (!loading && (role !== 'admin' && role !== 'agent')) {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else if (selectedBusiness) {
      fetchMonthlyEmis();
    }
  }, [role, loading, router, toast, fetchMonthlyEmis, selectedBusiness]);
  
  const { totalAmount, collectedAmount, pendingAmount, pendingEmis } = useMemo(() => {
    const stats = monthlyEmis.reduce((acc, emi) => {
        acc.totalAmount += emi.amount;
        if (emi.status === 'Paid') {
            acc.collectedAmount += emi.amount;
        } else {
            acc.pendingAmount += emi.amount;
        }
        return acc;
    }, { totalAmount: 0, collectedAmount: 0, pendingAmount: 0 });

    const pending = monthlyEmis.filter(emi => emi.status === 'Pending');
    
    return { ...stats, pendingEmis: pending };
  }, [monthlyEmis]);


  const handleMonthChange = (monthValue: string) => {
    setSelectedDate(current => setMonth(current, parseInt(monthValue, 10)));
  }

  const handleYearChange = (yearValue: string) => {
    setSelectedDate(current => setYear(current, parseInt(yearValue, 10)));
  }

  const handleCollectEmi = async (loanId: string, emiId: string) => {
    if (!selectedBusiness?.id) return;
    const loan = await getLoanById(selectedBusiness.id, loanId);
    if (!loan) {
        toast({ title: 'Error', description: 'Loan not found.', variant: 'destructive' });
        return;
    }

    let collectedEmi: EMI | undefined;
    const emiIndex = loan.emis.findIndex(emi => emi.id === emiId);

    if (emiIndex === -1) {
        toast({ title: 'Error', description: 'EMI not found.', variant: 'destructive' });
        return;
    }

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
    
    const allPaid = updatedLoan.emis.every(e => e.status === 'Paid');
    if (allPaid) {
        updatedLoan.status = 'Closed';
    }
    
    try {
        await updateLoan(updatedLoan);
        await fetchMonthlyEmis(); 
        
        toast({
            title: 'EMI Collected!',
            description: `Successfully collected ${collectedEmi?.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} from ${loan.customerName}.`,
        });

         if (collectedEmi) {
            setWhatsappPreview({
                open: true,
                message: `Dear ${loan.customerName}, your EMI payment of ${collectedEmi.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })} for loan ${loan.id} has been received. Thank you.`
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
    doc.text(`Pending EMI Report - ${monthName} - ${selectedBusiness?.name}`, 14, 22);

    const body = pendingEmis.map((emi) => {
        return [
            emi.customer.name,
            emi.customer.phone,
            emi.customer.guarantorName,
            emi.customer.guarantorPhone,
            `Rs. ${emi.amount.toLocaleString()}`,
        ]
    });

    autoTable(doc, {
        startY: 30,
        head: [['Customer', 'Phone', 'Guarantor', 'Guarantor Phone', 'EMI Amount']],
        body: body,
        foot: [[ {content: `Total Due: Rs. ${pendingAmount.toLocaleString()}`, colSpan: 5, styles: { halign: 'right' } } ]],
        footStyles: { fontStyle: 'bold' },
        rowPageBreak: 'avoid',
    });
    
    doc.save(`pending_emi_report_${monthName.toLowerCase().replace(' ', '_')}.pdf`);
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

  if (loading || (role !== 'admin' && role !== 'agent') || !selectedBusiness) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
       <WhatsappPreview 
        open={whatsappPreview.open} 
        onOpenChange={(open) => setWhatsappPreview({ open, message: '' })} 
        message={whatsappPreview.message}
      />

       <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Due This Month</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Sum of all EMIs for {format(selectedDate, 'MMMM')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected Amount</CardTitle>
              <BadgeCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{collectedAmount.toLocaleString()}</div>
               <p className="text-xs text-muted-foreground">{Math.round((collectedAmount/totalAmount || 0) * 100)}% collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
              <Hourglass className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{pendingAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{pendingEmis.length} EMIs to be collected</p>
            </CardContent>
          </Card>
        </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <CardTitle>Pending Collections for {format(selectedDate, 'MMMM yyyy')}</CardTitle>
                    <CardDescription>
                        A list of all EMIs still pending for this month in {selectedBusiness.name}.
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
                    <Button onClick={generateReportPDF} disabled={pendingEmis.length === 0}>
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
              {isLoading ? renderSkeleton() : pendingEmis.length > 0 ? (
                pendingEmis.map((emi) => (
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
