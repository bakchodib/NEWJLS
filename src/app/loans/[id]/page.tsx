'use client';

import { useEffect, useState } from 'react';
import { getLoans, updateLoan } from '@/lib/storage';
import type { Loan, EMI } from '@/types';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, FileDown, MessageCircle, Download, FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


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

export default function LoanDetailsPage() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [whatsappPreview, setWhatsappPreview] = useState({ open: false, message: '' });
  const params = useParams();
  const { id } = params;
  const { role } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      const loans = getLoans();
      const currentLoan = loans.find(l => l.id === id);
      setLoan(currentLoan || null);
    }
  }, [id]);

  const handleMarkAsPaid = (emiId: string) => {
    if (!loan) return;
    const updatedEmis = loan.emis.map(emi => 
        emi.id === emiId ? { ...emi, status: 'Paid' as const, paymentDate: new Date().toISOString() } : emi
    );
    const updatedLoan = { ...loan, emis: updatedEmis };
    setLoan(updatedLoan);
    updateLoan(updatedLoan);
    toast({ title: 'Success', description: `EMI ${emiId} marked as paid.` });
    
    setWhatsappPreview({
        open: true,
        message: `Dear ${loan.customerName}, your EMI payment of $${updatedLoan.emis.find(e=>e.id === emiId)?.amount} for loan ${loan.id} has been received. Thank you.`
    });
  };

  const generatePDF = () => {
    if(!loan) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Loan Agreement - ${loan.id}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Customer: ${loan.customerName} (${loan.customerId})`, 14, 32);
    
    autoTable(doc, {
        startY: 40,
        head: [['Term', 'Details']],
        body: [
            ['Loan Amount', `$${loan.amount.toLocaleString()}`],
            ['Interest Rate', `${loan.interestRate}% p.a.`],
            ['Tenure', `${loan.tenure} months`],
            ['Disbursal Date', new Date(loan.disbursalDate).toLocaleDateString()],
        ]
    });

    autoTable(doc, {
        head: [['Due Date', 'Amount', 'Principal', 'Interest', 'Balance', 'Status']],
        body: loan.emis.map(emi => [
            new Date(emi.dueDate).toLocaleDateString(),
            `$${emi.amount.toLocaleString()}`,
            `$${emi.principal.toLocaleString()}`,
            `$${emi.interest.toLocaleString()}`,
            `$${emi.balance.toLocaleString()}`,
            emi.status,
        ]),
        foot: [['Total', '', '', '', '', '']],
    });
    
    doc.save(`loan_${loan.id}_schedule.pdf`);
  }

  const exportExcel = () => {
    if(!loan) return;
    const worksheet = XLSX.utils.json_to_sheet(loan.emis.map(emi => ({
        'Due Date': new Date(emi.dueDate).toLocaleDateString(),
        'Amount': emi.amount,
        'Principal': emi.principal,
        'Interest': emi.interest,
        'Balance': emi.balance,
        'Status': emi.status
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EMI Schedule');
    XLSX.writeFile(workbook, `loan_${loan.id}_schedule.xlsx`);
  }

  if (!loan) return <div>Loading loan details or loan not found...</div>;

  return (
    <div className="flex flex-col gap-6">
      <WhatsappPreview 
        open={whatsappPreview.open} 
        onOpenChange={(open) => setWhatsappPreview({ open, message: '' })} 
        message={whatsappPreview.message}
      />
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Loan Details - {loan.id}</CardTitle>
              <CardDescription>Customer: {loan.customerName} ({loan.customerId})</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={generatePDF}><FileDown className="h-4 w-4 mr-2"/> PDF</Button>
                <Button variant="outline" size="sm" onClick={exportExcel}><FileType className="h-4 w-4 mr-2"/> Excel</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div><span className="font-medium text-muted-foreground">Principal:</span> <span className="font-bold">${loan.amount.toLocaleString()}</span></div>
                <div><span className="font-medium text-muted-foreground">Interest Rate:</span> <span className="font-bold">{loan.interestRate}% p.a.</span></div>
                <div><span className="font-medium text-muted-foreground">Tenure:</span> <span className="font-bold">{loan.tenure} months</span></div>
                <div><span className="font-medium text-muted-foreground">Disbursed:</span> <span className="font-bold">{new Date(loan.disbursalDate).toLocaleDateString()}</span></div>
            </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>EMI Schedule</CardTitle>
          <CardDescription>Monthly installment plan for the loan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Status</TableHead>
                {(role === 'agent' || role === 'admin') && <TableHead>Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.emis.map((emi) => (
                <TableRow key={emi.id}>
                  <TableCell>{new Date(emi.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>${emi.amount.toLocaleString()}</TableCell>
                  <TableCell>${emi.principal.toLocaleString()}</TableCell>
                  <TableCell>${emi.interest.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={emi.status === 'Paid' ? 'default' : 'secondary'} className={emi.status === 'Paid' ? 'bg-green-600' : 'bg-yellow-500'}>
                        {emi.status === 'Paid' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1"/>}
                        {emi.status}
                    </Badge>
                  </TableCell>
                  {(role === 'agent' || role === 'admin') && (
                    <TableCell>
                      {emi.status === 'Pending' && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(emi.id)}>
                          Mark as Paid
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
