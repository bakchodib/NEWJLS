
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getLoanById, updateLoan, getCustomerById } from '@/lib/storage';
import type { Loan, EMI, Customer } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, MessageCircle, Wallet, Download, Pencil, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


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
  const router = useRouter();

  const fetchLoanDetails = useCallback(async (loanId: string) => {
    try {
        const currentLoan = await getLoanById(loanId);
        setLoan(currentLoan);
        if (currentLoan) {
            const currentCustomer = await getCustomerById(currentLoan.customerId);
            setCustomer(currentCustomer);
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to fetch loan details.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (id && typeof id === 'string') {
        fetchLoanDetails(id);
    }
  }, [id, fetchLoanDetails]);


  const handleCollectEmi = async (emiId: string) => {
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
    
    const remainingPending = updatedLoan.emis.filter(e => e.status === 'Pending').length;
    if (remainingPending === 0) {
        updatedLoan.status = 'Closed';
    }
    
    try {
        await updateLoan(updatedLoan); 
        await fetchLoanDetails(loan.id); // Refresh data from firestore
        toast({ title: 'Success', description: `EMI ${emiIndex + 1} marked as paid.` });
        
        if (collectedEmi) {
            setWhatsappPreview({
                open: true,
                message: `Dear ${loan.customerName}, your EMI payment of ₹${collectedEmi.amount} for loan ${loan.id} has been received. Thank you.`
            });
        }
    } catch (error) {
        toast({ title: 'Error', description: "Failed to update EMI status.", variant: "destructive" });
    }
  };

  const generateLoanCardPDF = async () => {
    if(!loan || !customer) return;
    const doc = new jsPDF();
        
    doc.setFontSize(11);
    doc.text(`Loan Card`, 14, 22);
    doc.text(`Loan ID: ${loan.id}`, 14, 28);
    doc.text(`Customer: ${loan.customerName} (${loan.customerId})`, 14, 34);
    
    if (customer.customerPhoto) {
        try {
            doc.addImage(customer.customerPhoto, 'JPEG', 150, 15, 30, 30);
        } catch(e) {
            console.error("Error adding image to PDF:", e);
             toast({ title: "PDF Error", description: "Could not add customer photo to PDF.", variant: "destructive" });
        }
    }
    
    autoTable(doc, {
        startY: 50,
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
    
    await addAgreementContent(doc);
    doc.save(`loan_agreement_${loan.id}.pdf`);
  }

  const addAgreementContent = async (doc: jsPDF) => {
    if(!loan || !customer) return;

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    const addHeader = () => {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Loan Agreement', margin, margin + 2);
        doc.line(margin, margin + 8, pageWidth - margin, margin + 8);
    };

    const addFooter = (pageNumber: number) => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - margin, { align: 'right' });
        doc.line(margin, pageHeight - margin - 2, pageWidth - margin, pageHeight - margin - 2);
    };

    // ===== PAGE 1 =====
    addHeader();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('FinanceFlow Inc.', pageWidth / 2, 30, { align: 'center' });

    
    if (customer.customerPhoto) {
        try {
            doc.addImage(customer.customerPhoto, 'JPEG', pageWidth - margin - 35, 40, 30, 30);
        } catch(e) {
             console.error("Error adding image to PDF:", e);
             toast({ title: "PDF Error", description: "Could not add customer photo to PDF.", variant: "destructive" });
        }
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Loan ID: ${loan.id}`, margin, 45);
    doc.text(`Agreement Date: ${new Date().toLocaleDateString()}`, margin, 50);


    // Parties
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Parties to the Agreement', margin, 70);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
        startY: 75,
        theme: 'plain',
        tableWidth: 120,
        styles: { fontSize: 9, cellPadding: 1, overflow: 'linebreak' },
        body: [
            [{ content: 'Lender:', styles: { fontStyle: 'bold' } }, 'FinanceFlow Inc.'],
            [{ content: 'Borrower:', styles: { fontStyle: 'bold' } }, ''],
            ['  Name:', customer.name],
            ['  Customer ID:', customer.id],
            ['  Address:', customer.address],
            ['  Phone:', customer.phone],
            [{ content: 'Guarantor:', styles: { fontStyle: 'bold', paddingTop: 4 } }, ''],
            ['  Name:', customer.guarantorName],
            ['  Phone:', customer.guarantorPhone],
        ],
    });
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Loan Terms
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Principal Loan Terms', margin, finalY);
    const netDisbursed = loan.amount - (loan.amount * (loan.processingFee / 100));
    autoTable(doc, {
        startY: finalY + 5,
        head: [['Term', 'Details']],
        body: [
            ['Principal Amount', `₹${loan.amount.toLocaleString()}`],
            ['Annual Interest Rate', `${loan.interestRate}%`],
            ['Tenure', `${loan.tenure} months`],
            ['Processing Fee', `${loan.processingFee}% (₹${(loan.amount * (loan.processingFee / 100)).toLocaleString()})`],
            ['Net Disbursed Amount', `₹${netDisbursed.toLocaleString()}`],
            ['Disbursal Date', new Date(loan.disbursalDate).toLocaleDateString()],
        ],
         headStyles: { fillColor: [46, 71, 101] },
         didDrawPage: (data) => addFooter(1)
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;

    // ----- END OF PAGE 1 -----

    doc.addPage();
    // ===== PAGE 2 =====
    addHeader();
    let page2Y = 30;

    // Terms and Conditions
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. General Terms and Conditions', margin, page2Y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    page2Y += 8;

    const addTerm = (termNumber: number, termText: string) => {
        const splitText = doc.splitTextToSize(`${termNumber}. ${termText}`, pageWidth - (margin * 2) - 5);
        if (page2Y + (splitText.length * 4) + 4 > pageHeight - 40) { // check if it fits
            addFooter(doc.internal.pages.length);
            doc.addPage();
            addHeader();
            page2Y = 30;
        }
        doc.text(splitText, margin + 5, page2Y);
        page2Y += (splitText.length * 4) + 4;
    }

    addTerm(1, `Repayment: The Borrower agrees to repay the loan in ${loan.tenure} equated monthly installments (EMIs) as per the schedule provided separately in the loan card.`);
    addTerm(2, 'Late Fees: Failure to pay an EMI on the due date shall attract a late payment penalty as per the company\\'s policy, which will be communicated separately.');
    addTerm(3, 'Default: If the Borrower defaults on three or more consecutive EMIs, the Lender reserves the right to recall the entire outstanding loan amount immediately and initiate legal proceedings.');
    addTerm(4, 'Prepayment: Prepayment of the loan, in part or full, is permitted subject to prepayment charges, if any, as specified by the Lender.');
    addTerm(5, 'Guarantor\\'s Liability: The Guarantor is jointly and severally liable for the repayment of the entire loan amount, including any interest, penalties, and charges, in case of default by the Borrower. The Lender may proceed against the Guarantor without first proceeding against the Borrower.');
    addTerm(6, 'Use of Funds: The Borrower shall use the loan amount for the purpose stated in the application and not for any illegal or speculative activities.');
    addTerm(7, 'Jurisdiction: This agreement shall be governed by the laws of India. Any disputes arising out of this agreement shall be subject to the exclusive jurisdiction of the courts in the city where the Lender\\'s office is located.');
    addTerm(8, 'Communication: All notices and communications will be deemed to have been duly served if sent to the registered address, phone number, or email of the Borrower and Guarantor.');
    addTerm(9, 'Data Privacy & Verification: The Lender is authorized to use the Borrower\\'s and Guarantor\\'s data for credit assessment, verification, and collection purposes. The Borrower and Guarantor consent to the Lender making inquiries with any third party, including credit bureaus.');
    addTerm(10, 'Entire Agreement: This document, along with the loan application, KYC documents, and EMI schedule, constitutes the entire agreement between the parties and supersedes all prior discussions and agreements.');

    // Signatures
    if (page2Y > pageHeight - 80) { // Check space for signatures
        addFooter(doc.internal.pages.length);
        doc.addPage();
        addHeader();
        page2Y = 30;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. Acknowledgment and Signatures', margin, page2Y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    page2Y += 8;
    const acknowledgementText = "By signing below, the parties acknowledge that they have read, understood, and agreed to the terms and conditions of this agreement.";
    const splitAckText = doc.splitTextToSize(acknowledgementText, pageWidth - (margin * 2));
    doc.text(splitAckText, margin, page2Y);
    page2Y += (splitAckText.length * 5) + 30;
    
    doc.line(margin, page2Y, margin + 70, page2Y);
    doc.text('Signature of Borrower', margin, page2Y + 5);
    doc.text(`(${customer.name})`, margin, page2Y + 10);
    
    doc.line(pageWidth - margin - 70, page2Y, pageWidth - margin, page2Y);
    doc.text('For FinanceFlow Inc.', pageWidth - margin - 70, page2Y + 5);
    doc.text('(Authorized Signatory)', pageWidth - margin - 70, page2Y + 10);

    page2Y += 25;
    doc.line(margin, page2Y, margin + 70, page2Y);
    doc.text('Signature of Guarantor', margin, page2Y + 5);
    doc.text(`(${customer.guarantorName})`, margin, page2Y + 10);


    addFooter(doc.internal.pages.length);
  }

  const generateEmiReceiptPDF = async (emi: EMI) => {
    if(!loan || !customer || !emi.paymentDate) return;
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const emiIndex = loan.emis.findIndex(e => e.id === emi.id);
    const emiNumber = emiIndex !== -1 ? `${emiIndex + 1} of ${loan.emis.length}` : '';


    // Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Official Payment Receipt', margin, margin + 10);
    doc.line(margin, margin + 14, pageWidth - margin, margin + 14);

    if (customer.customerPhoto) {
        try {
            doc.addImage(customer.customerPhoto, 'JPEG', pageWidth - margin - 25, margin + 18, 25, 25);
        } catch(e) {
            console.error("Error adding image to PDF:", e);
            toast({ title: "PDF Error", description: "Could not add customer photo to PDF.", variant: "destructive" });
        }
    }
    
    // Receipt Details
    doc.setFontSize(10);
    let receiptY = margin + 25;
    doc.text(`Receipt No:`, margin, receiptY);
    doc.text(`${emi.receiptNumber}`, margin + 40, receiptY);

    receiptY += 7;
    doc.text(`Payment Date:`, margin, receiptY);
    doc.text(`${new Date(emi.paymentDate).toLocaleString()}`, margin + 40, receiptY);

    // Customer & Loan Details
    let detailsY = receiptY + 14;
    doc.text(`Received from:`, margin, detailsY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${customer.name} (ID: ${customer.id})`, margin + 40, detailsY);
    doc.setFont('helvetica', 'normal');

    detailsY += 7;
    doc.text(`For Loan ID:`, margin, detailsY);
    doc.text(`${loan.id}`, margin + 40, detailsY);
    
    detailsY += 7;
    doc.text(`EMI Number:`, margin, detailsY);
    doc.text(`${emiNumber}`, margin + 40, detailsY);


    // Payment Table
    autoTable(doc, {
        startY: detailsY + 8,
        head: [['Description', 'Amount']],
        body: [
            ['EMI Amount Received', `₹ ${emi.amount.toLocaleString()}`],
            ['  - Principal Component', `₹ ${emi.principal.toLocaleString()}`],
            ['  - Interest Component', `₹ ${emi.interest.toLocaleString()}`],
        ],
        foot: [[
            { content: 'Total Paid', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `₹ ${emi.amount.toLocaleString()}`, styles: { fontStyle: 'bold' } }
        ]],
        theme: 'striped',
        headStyles: { fillColor: [46, 71, 101] },
    });
    let finalY = (doc as any).lastAutoTable.finalY + 7;

    doc.text(`Payment Method:`, margin, finalY);
    doc.text(`${emi.paymentMethod}`, margin + 40, finalY);

    doc.text(`Outstanding Balance after this payment:`, margin, finalY + 7);
    doc.text(`₹ ${emi.balance.toLocaleString()}`, margin + 70, finalY + 7);


    // Footer
    doc.setFontSize(8);
    doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, pageHeight - margin, { align: 'center' });
    doc.line(margin, pageHeight - margin - 4, pageWidth - margin, pageHeight - margin - 4);


    doc.save(`receipt_${emi.receiptNumber}.pdf`);
  }


  if (!loan) return <div>Loading loan details or loan not found...</div>;

  const isClosed = loan.status === 'Closed';

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-6">
      <WhatsappPreview 
        open={whatsappPreview.open} 
        onOpenChange={(open) => setWhatsappPreview({ open, message: '' })} 
        message={whatsappPreview.message}
      />
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
               {customer?.customerPhoto && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={customer.customerPhoto} alt={customer.name} />
                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
              <div>
                <CardTitle>Loan Details - {loan.id}</CardTitle>
                <CardDescription>Customer: {loan.customerName} ({loan.customerId})</CardDescription>
              </div>
            </div>
             <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={generateLoanCardPDF}>Loan Card</Button>
                <Button variant="outline" size="sm" onClick={generateLoanAgreementPDF}>Loan Agreement</Button>
                {role === 'admin' && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                             <Button asChild variant="outline" size="sm" disabled={isClosed}>
                                <Link href={`/loans/edit/${loan.id}`}>
                                    <Pencil className="mr-2 h-4 w-4"/>
                                    Edit
                                </Link>
                             </Button>
                        </TooltipTrigger>
                        {isClosed && (
                            <TooltipContent>
                                <p>Closed loans cannot be edited.</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-5 gap-4 text-sm">
                <div><span className="font-medium text-muted-foreground">Principal:</span> <span className="font-bold">₹{loan.amount.toLocaleString()}</span></div>
                <div><span className="font-medium text-muted-foreground">Interest Rate:</span> <span className="font-bold">{loan.interestRate}% p.a.</span></div>
                <div><span className="font-medium text-muted-foreground">Tenure:</span> <span className="font-bold">{loan.tenure} months</span></div>
                 <div><span className="font-medium text-muted-foreground">Processing Fee:</span> <span className="font-bold">{loan.processingFee}%</span></div>
                <div><span className="font-medium text-muted-foreground">Disbursed:</span> <span className="font-bold">{loan.disbursalDate ? new Date(loan.disbursalDate).toLocaleDateString() : 'N/A'}</span></div>
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
                <TableHead className="text-right">Action</TableHead>
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
                  <TableCell className="text-right">
                    {(role === 'agent' || role === 'admin') ? (
                      emi.status === 'Pending' ? (
                        <Button variant="outline" size="sm" onClick={() => handleCollectEmi(emi.id)}>
                          <Wallet className="mr-2 h-4 w-4" />
                          Collect EMI
                        </Button>
                      ) : (
                        <Button variant="secondary" size="sm" onClick={() => generateEmiReceiptPDF(emi)} disabled={!emi.paymentDate}>
                            <Download className="mr-2 h-4 w-4" />
                            Receipt
                        </Button>
                      )
                    ) : (
                        emi.status === 'Paid' && (
                            <Button variant="secondary" size="sm" onClick={() => generateEmiReceiptPDF(emi)} disabled={!emi.paymentDate}>
                                <Download className="mr-2 h-4 w-4" />
                                Receipt
                            </Button>
                        )
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
