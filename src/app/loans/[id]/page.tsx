
'use client';

import { useEffect, useState } from 'react';
import { getLoans, updateLoan, getCustomers } from '@/lib/storage';
import type { Loan, EMI, Customer } from '@/types';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
  const [customer, setCustomer] = useState<Customer | null>(null);
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
      if (currentLoan) {
        const customers = getCustomers();
        const currentCustomer = customers.find(c => c.id === currentLoan.customerId);
        setCustomer(currentCustomer || null);
      }
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
        message: `Dear ${loan.customerName}, your EMI payment of ₹${updatedLoan.emis.find(e=>e.id === emiId)?.amount} for loan ${loan.id} has been received. Thank you.`
    });
  };

  const generateLoanCardPDF = () => {
    if(!loan) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Loan Card - ${loan.id}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Customer: ${loan.customerName} (${loan.customerId})`, 14, 32);
    
    autoTable(doc, {
        startY: 40,
        head: [['Due Date', 'Amount', 'Principal', 'Interest', 'Balance', 'Status']],
        body: loan.emis.map(emi => [
            new Date(emi.dueDate).toLocaleDateString(),
            `₹${emi.amount.toLocaleString()}`,
            `₹${emi.principal.toLocaleString()}`,
            `₹${emi.interest.toLocaleString()}`,
            `₹${emi.balance.toLocaleString()}`,
            emi.status,
        ]),
    });
    
    doc.save(`loan_card_${loan.id}.pdf`);
  }

  const generateLoanAgreementPDF = async () => {
    if(!loan || !customer) return;
    const doc = new jsPDF();

    // Add customer photo
    if (customer.customerPhoto) {
        try {
            const response = await fetch(customer.customerPhoto);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                doc.addImage(base64data, 'PNG', 150, 15, 45, 45);
                
                // Add content after image is loaded
                addAgreementContent(doc);
                doc.save(`loan_agreement_${loan.id}.pdf`);
            };
        } catch (error) {
            console.error("Error fetching image for PDF:", error);
            // Continue without image if fetch fails
            addAgreementContent(doc);
            doc.save(`loan_agreement_${loan.id}.pdf`);
        }
    } else {
        addAgreementContent(doc);
        doc.save(`loan_agreement_${loan.id}.pdf`);
    }
  }

  const addAgreementContent = (doc: jsPDF) => {
     if(!loan || !customer) return;

    doc.setFontSize(22);
    doc.text('Loan Agreement', 14, 22);
    doc.setFontSize(12);
    doc.text(`Loan ID: ${loan.id}`, 14, 32);
    
    doc.line(14, 35, 196, 35); // Horizontal line

    doc.setFontSize(14);
    doc.text('Customer Details', 14, 45);
    doc.setFontSize(10);
    autoTable(doc, {
        startY: 50,
        theme: 'plain',
        body: [
            ['Name:', customer.name],
            ['Customer ID:', customer.id],
            ['Address:', customer.address],
            ['Phone:', customer.phone],
        ]
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    doc.setFontSize(14);
    doc.text('Loan Terms', 14, finalY + 15);
    doc.setFontSize(10);
    const netDisbursed = loan.amount - (loan.amount * (loan.processingFee / 100));
    autoTable(doc, {
        startY: finalY + 20,
        head: [['Term', 'Details']],
        body: [
            ['Principal Amount', `₹${loan.amount.toLocaleString()}`],
            ['Annual Interest Rate', `${loan.interestRate}%`],
            ['Tenure', `${loan.tenure} months`],
            ['Processing Fee', `${loan.processingFee}% (₹${(loan.amount * (loan.processingFee / 100)).toLocaleString()})`],
            ['Net Disbursed Amount', `₹${netDisbursed.toLocaleString()}`],
            ['Disbursal Date', new Date(loan.disbursalDate).toLocaleDateString()],
        ]
    });
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
                <Button variant="outline" size="sm" onClick={generateLoanCardPDF}>Loan Card</Button>
                <Button variant="outline" size="sm" onClick={generateLoanAgreementPDF}>Loan Agreement</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-5 gap-4 text-sm">
                <div><span className="font-medium text-muted-foreground">Principal:</span> <span className="font-bold">₹{loan.amount.toLocaleString()}</span></div>
                <div><span className="font-medium text-muted-foreground">Interest Rate:</span> <span className="font-bold">{loan.interestRate}% p.a.</span></div>
                <div><span className="font-medium text-muted-foreground">Tenure:</span> <span className="font-bold">{loan.tenure} months</span></div>
                 <div><span className="font-medium text-muted-foreground">Processing Fee:</span> <span className="font-bold">{loan.processingFee}%</span></div>
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
                  <TableCell>₹{emi.amount.toLocaleString()}</TableCell>
                  <TableCell>₹{emi.principal.toLocaleString()}</TableCell>
                  <TableCell>₹{emi.interest.toLocaleString()}</TableCell>
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
