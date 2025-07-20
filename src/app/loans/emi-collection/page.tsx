
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
import { format, getYear, getMonth, setYear, setMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DueEmi extends EMI {
  loanId: string;
  customer: Customer;
}

export default function EmiCollectionPage() {
  const [dueEmis, setDueEmis] = useState<DueEmi[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { role, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const years = useMemo(() => {
    const allLoans = getLoans();
    const allEmis = allLoans.flatMap(l => l.emis);
    const loanYears = new Set(allEmis.map(emi => getYear(new Date(emi.dueDate))));
    if (!loanYears.has(getYear(new Date()))) {
        loanYears.add(getYear(new Date()));
    }
    return Array.from(loanYears).sort((a, b) => b - a);
  }, []);

  const months = useMemo(() => {
      return Array.from({length: 12}, (_, i) => ({ value: i, name: format(new Date(2000, i), 'MMMM')}))
  }, []);

  useEffect(() => {
    if (!loading && (role !== 'admin' && role !== 'agent')) {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else {
      const loans = getLoans().filter(l => l.status === 'Disbursed');
      const customers = getCustomers();
      
      const selectedMonth = getMonth(selectedDate);
      const selectedYear = getYear(selectedDate);

      const monthlyDueEmis: DueEmi[] = [];

      loans.forEach(loan => {
        const customer = customers.find(c => c.id === loan.customerId);
        if (!customer) return;

        loan.emis.forEach(emi => {
          const dueDate = new Date(emi.dueDate);
          if (emi.status === 'Pending' && getMonth(dueDate) === selectedMonth && getYear(dueDate) === selectedYear) {
            monthlyDueEmis.push({ ...emi, loanId: loan.id, customer });
          }
        });
      });

      setDueEmis(monthlyDueEmis.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
    }
  }, [role, loading, router, toast, selectedDate]);

  const totalDueAmount = useMemo(() => {
    return dueEmis.reduce((acc, emi) => acc + emi.amount, 0);
  }, [dueEmis]);

  const handleMonthChange = (monthValue: string) => {
    setSelectedDate(current => setMonth(current, parseInt(monthValue, 10)));
  }

  const handleYearChange = (yearValue: string) => {
    setSelectedDate(current => setYear(current, parseInt(yearValue, 10)));
  }

  const imageToDataUrl = async (url: string): Promise<string | null> => {
    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error(`Image fetch failed for ${url}`);
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = (error) => {
                console.error("Error reading blob:", error);
                reject(null);
            }
        });
    } catch (error) {
        console.error(`Error fetching or processing image for PDF from ${url}:`, error);
        return null;
    }
  }

  const generateReportPDF = async () => {
    const doc = new jsPDF();
    const monthName = format(selectedDate, 'MMMM yyyy');
    const logoUrl = 'https://i.ibb.co/9Hwjrt7/logo.png';
    const logoDataUrl = await imageToDataUrl(logoUrl);

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 14, 15, 10, 10);
    }
    doc.setFontSize(18);
    doc.text(`FinanceFlow Inc.`, 28, 22);
    doc.setFontSize(12)
    doc.text(`EMI Due Report - ${monthName}`, 14, 32);

    const tableBody = [];
    const imagePromises = dueEmis.map(emi => imageToDataUrl(emi.customer.customerPhoto));
    const imageDataUrls = await Promise.all(imagePromises);

    const body = dueEmis.map((emi, index) => {
        return [
            { content: '', image: imageDataUrls[index] }, // Placeholder for image
            emi.customer.name,
            emi.customer.phone,
            emi.customer.guarantorName,
            emi.customer.guarantorPhone,
            `₹${emi.amount.toLocaleString()}`,
        ]
    });

    autoTable(doc, {
        startY: 40,
        head: [['Photo', 'Customer', 'Phone', 'Guarantor', 'Guarantor Phone', 'EMI Amount']],
        body: body,
        foot: [[`Total Due: ₹${totalDueAmount.toLocaleString()}`, '', '', '', '', '']],
        footStyles: { fontStyle: 'bold' },
        didDrawCell: (data) => {
            if (data.column.index === 0 && data.cell.section === 'body') {
                if (data.row.raw && (data.row.raw as any[])[0].image) {
                    doc.addImage((data.row.raw as any[])[0].image, 'PNG', data.cell.x + 2, data.cell.y + 2, 10, 10);
                }
            }
        },
        rowPageBreak: 'avoid',
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
                    <TableCell className="font-medium flex items-center gap-2">
                      <img src={emi.customer.customerPhoto} alt={emi.customer.name} className="w-8 h-8 rounded-full object-cover" />
                      {emi.customer.name}
                    </TableCell>
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
                    No EMIs due for {format(selectedDate, 'MMMM yyyy')}.
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
