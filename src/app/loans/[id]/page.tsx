
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
            emi.status === 'Paid' ? 'Paid' : '',
        ]),
    });
    
    doc.save(`loan_card_${loan.id}.pdf`);
  }

  const generateLoanAgreementPDF = async () => {
    if(!loan || !customer) return;
    
    const doc = new jsPDF();
    
    const addContentAndSave = (photoDataUrl: string | null) => {
        addAgreementContent(doc, photoDataUrl);
        doc.save(`loan_agreement_${loan.id}.pdf`);
    };

    if (customer.customerPhoto && customer.customerPhoto.startsWith('http')) {
        try {
            // Using a CORS proxy for external images to avoid tainted canvas
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
            const response = await fetch(proxyUrl + customer.customerPhoto);
            if (!response.ok) throw new Error('CORS proxy failed');
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                addContentAndSave(reader.result as string);
            };
            reader.onerror = (error) => {
                console.error("Error reading blob:", error);
                addContentAndSave(null);
            }
        } catch (error) {
            console.error("Error fetching or processing image for PDF:", error);
            addContentAndSave(null);
        }
    } else if(customer.customerPhoto) { // Handle base64 urls directly
        addContentAndSave(customer.customerPhoto);
    } else {
        addContentAndSave(null);
    }
  }

  const addAgreementContent = (doc: jsPDF, photoDataUrl: string | null) => {
     if(!loan || !customer) return;

    doc.setFontSize(22);
    doc.text('Loan Agreement', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Loan ID: ${loan.id}`, 14, 32);
    doc.text(`Agreement Date: ${new Date().toLocaleDateString()}`, 14, 38);

    if(photoDataUrl) {
        doc.addImage(photoDataUrl, 'PNG', 150, 15, 45, 45);
    }

    doc.line(14, 65, 196, 65); // separator line

    let finalY = 72;

    // Parties
    doc.setFontSize(12);
    doc.text('1. Parties to the Agreement', 14, finalY);
    doc.setFontSize(10);
    doc.text("This Loan Agreement is made between:", 14, finalY + 6);
    
    const partiesBody = [
        ['Lender:', 'FinanceFlow Inc.'],
        ['Borrower:', ''],
        ['  Name:', customer.name],
        ['  Customer ID:', customer.id],
        ['  Address:', customer.address],
        ['  Phone:', { content: customer.phone, styles: { textColor: [0, 0, 255], FONT_STYLE: 'underline' } }],
        ['Guarantor:', ''],
        ['  Name:', customer.guarantorName],
        ['  Phone:', { content: customer.guarantorPhone, styles: { textColor: [0, 0, 255], FONT_STYLE: 'underline' } }],
    ];
    autoTable(doc, {
        startY: finalY + 10,
        theme: 'plain',
        tableWidth: 'auto',
        styles: { fontSize: 9, cellPadding: 1 },
        body: partiesBody as any,
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    finalY = (doc as any).lastAutoTable.finalY + 5;

    // Loan Terms
    doc.setFontSize(12);
    doc.text('2. Loan Terms', 14, finalY);
    const netDisbursed = loan.amount - (loan.amount * (loan.processingFee / 100));
    autoTable(doc, {
        startY: finalY + 4,
        head: [['Term', 'Details']],
        body: [
            ['Principal Amount', `₹${loan.amount.toLocaleString()}`],
            ['Annual Interest Rate', `${loan.interestRate}%`],
            ['Tenure', `${loan.tenure} months`],
            ['Processing Fee', `${loan.processingFee}% (₹${(loan.amount * (loan.processingFee / 100)).toLocaleString()})`],
            ['Net Disbursed Amount', `₹${netDisbursed.toLocaleString()}`],
            ['Disbursal Date', new Date(loan.disbursalDate).toLocaleDateString()],
        ],
         headStyles: { fillColor: [46, 71, 101] }
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Terms and Conditions
    doc.setFontSize(12);
    doc.text('3. Terms and Conditions', 14, finalY);
    doc.setFontSize(9);
    finalY += 6;

    const addTerm = (term: string) => {
        const splitText = doc.splitTextToSize(term, 180);
        doc.text(splitText, 14, finalY);
        finalY += (splitText.length * 4) + 2; // Adjust spacing
    }

    addTerm(`1. Repayment: The Borrower agrees to repay the loan in ${loan.tenure} equated monthly installments (EMIs) as per the schedule provided separately in the loan card.`);
    addTerm('2. Late Fees: Failure to pay an EMI on the due date shall attract a late payment penalty as per the company\'s policy.');
    addTerm('3. Default: If the Borrower defaults on three or more consecutive EMIs, the Lender reserves the right to recall the entire loan amount immediately.');
    addTerm('4. Prepayment: Prepayment of the loan, in part or full, is permitted subject to prepayment charges, if any, as specified by the Lender.');
    addTerm('5. Guarantor\'s Liability: The Guarantor is jointly and severally liable for the repayment of the entire loan amount, including any interest and charges, in case of default by the Borrower.');
    addTerm('6. Use of Funds: The Borrower shall use the loan amount for the purpose stated in the application and not for any illegal or speculative activities.');
    addTerm('7. Jurisdiction: This agreement shall be governed by the laws of India. Any disputes arising out of this agreement shall be subject to the exclusive jurisdiction of the courts in [City, State].');
    addTerm('8. Communication: All notices and communications will be sent to the registered address and phone number of the Borrower and Guarantor.');
    addTerm('9. Data Privacy: The Lender may use the Borrower\'s and Guarantor\'s data for credit assessment, verification, and collection purposes.');
    addTerm('10. Entire Agreement: This document, along with the loan application and schedule, constitutes the entire agreement between the parties.');

    // Signatures
    doc.setFontSize(12);
    doc.text('4. Signatures', 14, finalY + 5);
    finalY += 25;
    doc.line(14, finalY, 74, finalY);
    doc.text('Borrower Signature', 14, finalY + 5);
    doc.line(136, finalY, 196, finalY);
    doc.text('Guarantor Signature', 136, finalY + 5);
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
