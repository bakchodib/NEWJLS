
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getLoanById, updateLoan, getCustomerById, prepayLoan, topupLoan, closeLoan, sendWhatsappMessage } from '@/lib/storage';
import type { Loan, EMI, Customer } from '@/types';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, MessageCircle, Wallet, Download, Pencil, XCircle, TrendingUp, HandCoins, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const prepaymentSchema = z.object({
  amount: z.coerce.number().positive("Prepayment amount must be positive."),
});
const topupSchema = z.object({
  amount: z.coerce.number().positive("Top-up amount must be positive."),
  newTenure: z.coerce.number().optional(),
});


// Helper: Load image as Base64
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:image')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg");
        resolve(dataUrl);
      } catch (e) {
        console.error("Canvas toDataURL failed:", e);
        reject(new Error("Failed to convert image to data URL. The image might be tainted."));
      }
    };
    img.onerror = (e) => {
      console.error("Image load error:", e);
      reject(new Error('Failed to load image. The resource might be blocked by CORS policy.'));
    };

    // Use a CORS proxy to bypass issues with placehold.co not sending headers
    const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}`;
    img.src = proxyUrl;
  });
}

// Helper: Format number with "Rs." prefix for PDF
function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN")}`;
}


/**
 * Generates a beautifully formatted Loan Card PDF
 * @param customer - Object with { name, id, customerPhoto }
 * @param loan - Object with { id, amount, interestRate, tenure, disbursalDate }
 * @param emiList - Array of EMIs with { dueDate, amount, principal, interest, balance, status }
 */
async function generateLoanCardPDF(customer: Customer, loan: Loan, emiList: EMI[], businessName?: string) {
  const doc = new jsPDF();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(businessName || 'JLS FINACE LTD', 105, 15, { align: "center" });
  doc.setFontSize(13);
  doc.text("Loan Card", 105, 23, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${format(new Date(), 'dd-MM-yyyy')}`, 15, 30);

  // Customer Photo (top right)
  if (customer.customerPhoto) {
    try {
      const image = await loadImage(customer.customerPhoto);
      doc.addImage(image, "JPEG", 150, 35, 40, 40);
    } catch {
      doc.text("(Photo not loaded)", 150, 45);
    }
  }

  // Loan & Customer Info Table using autoTable
    const info = [
        ["Customer Name:", customer.name],
        ["Customer ID:", customer.id],
        ["Loan ID:", loan.id],
        ["Loan Amount:", formatCurrency(loan.amount)],
        ["Interest Rate:", `${loan.interestRate}% p.a.`],
        ["Tenure:", `${loan.tenure} months`],
        ["Disbursal Date:", format(new Date(loan.disbursalDate), 'dd-MM-yyyy')],
    ];

    autoTable(doc, {
        body: info,
        startY: 35,
        theme: 'plain',
        tableWidth: 120,
        styles: {
            font: 'helvetica',
            fontSize: 10,
        },
        columnStyles: {
            0: { fontStyle: 'bold' }
        }
    });

  let tableStartY = (doc as any).lastAutoTable.finalY + 10;


  // EMI Schedule Table
  const tableData = emiList.map((emi, i) => [
    `${i + 1}`,
    format(new Date(emi.dueDate), 'dd-MM-yyyy'),
    formatCurrency(emi.amount),
    formatCurrency(emi.principal),
    formatCurrency(emi.interest),
    formatCurrency(emi.balance),
    emi.status,
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [["#", "Due Date", "EMI Amount", "Principal", "Interest", "Balance", "Status"]],
    body: tableData,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [46, 71, 101], textColor: 255 }, // Dark Blue
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // Signatures
  doc.setFont("helvetica", "normal");
  doc.text("_____________________", 20, finalY);
  doc.text("Authorized Signatory", 20, finalY + 6);
  doc.text("_____________________", 130, finalY);
  doc.text("Borrower Signature", 130, finalY + 6);

  doc.save(`Loan_Card_${loan.id}.pdf`);
}


export default function LoanDetailsPage() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  const params = useParams();
  const { id } = params;
  const { role, selectedBusiness } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const prepaymentFormMethods = useForm({ resolver: zodResolver(prepaymentSchema) });
  const topupFormMethods = useForm({ resolver: zodResolver(topupSchema) });

  const fetchLoanDetails = useCallback(async (loanId: string) => {
    if (!selectedBusiness?.id) return;
    try {
        const currentLoan = await getLoanById(selectedBusiness.id, loanId);
        setLoan(currentLoan);
        if (currentLoan) {
            const currentCustomer = await getCustomerById(selectedBusiness.id, currentLoan.customerId);
            setCustomer(currentCustomer);
        }
    } catch (error) {
        toast({ title: "Error", description: "Failed to fetch loan details.", variant: "destructive" });
    }
  }, [toast, selectedBusiness]);

  useEffect(() => {
    if (id && typeof id === 'string' && selectedBusiness) {
        fetchLoanDetails(id);
    }
  }, [id, fetchLoanDetails, selectedBusiness]);


  const handleCollectEmi = async (emiId: string) => {
    if (!loan || !customer || !selectedBusiness) return;
    
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
        await fetchLoanDetails(loan.id); // Refresh data
        toast({ title: 'Success', description: `EMI ${emiIndex + 1} marked as paid.` });
        
        if (collectedEmi && selectedBusiness.fast2smsApiKey) {
            const message = `Dear ${loan.customerName}, your EMI payment of ${formatCurrency(collectedEmi.amount)} for loan ${loan.id} has been received. Thank you. - ${selectedBusiness.name}`;
            const result = await sendWhatsappMessage(selectedBusiness.fast2smsApiKey, customer.phone, message);
             if (result.success) {
                toast({ title: 'WhatsApp Sent', description: 'Payment confirmation sent to customer.' });
            } else {
                toast({ title: 'WhatsApp Failed', description: result.reason, variant: 'destructive' });
            }
        } else if (collectedEmi) {
             toast({ title: 'WhatsApp Skipped', description: 'API key not configured for this business.', variant: 'destructive' });
        }

    } catch (error) {
        toast({ title: 'Error', description: "Failed to update EMI status.", variant: "destructive" });
    }
  };

  const onPrepaymentSubmit = async (values: z.infer<typeof prepaymentSchema>) => {
    if (!loan || !selectedBusiness?.id) return;
    setIsActionSubmitting(true);
    try {
        await prepayLoan(selectedBusiness.id, loan.id, values.amount);
        toast({ title: "Prepayment Successful", description: `Prepayment of ${formatCurrency(values.amount)} has been applied.` });
        await fetchLoanDetails(loan.id);
    } catch(e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
        setIsActionSubmitting(false);
    }
  };

  const onTopupSubmit = async (values: z.infer<typeof topupSchema>) => {
    if (!loan || !selectedBusiness?.id) return;
    setIsActionSubmitting(true);
    try {
        await topupLoan(selectedBusiness.id, loan.id, values.amount, values.newTenure);
        toast({ title: "Top-up Successful", description: `Loan has been topped up by ${formatCurrency(values.amount)}.` });
        await fetchLoanDetails(loan.id);
    } catch(e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
        setIsActionSubmitting(false);
    }
  };

  const handleCloseLoan = async () => {
    if (!loan || !selectedBusiness?.id) return;
    setIsActionSubmitting(true);
    try {
        await closeLoan(selectedBusiness.id, loan.id);
        toast({ title: "Loan Closed", description: "The loan has been successfully closed." });
        await fetchLoanDetails(loan.id);
    } catch(e) {
        toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
        setIsActionSubmitting(false);
    }
  };

async function generateLoanAgreementPDF(customer: Customer, loan: Loan, emiList: EMI[], businessName?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y: number;

  // Page 1 Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(businessName || 'JLS FINACE LTD', 105, 15, { align: "center" });
  doc.setFontSize(13);
  doc.text("Loan Agreement Document", 105, 23, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${format(new Date(), 'dd-MM-yyyy')}`, 15, 30);
  doc.setLineWidth(0.5);
  doc.line(15, 32, pageWidth - 15, 32);

  // Customer Photo (top-right)
  if (customer.customerPhoto) {
    try {
      const image = await loadImage(customer.customerPhoto);
      doc.addImage(image, "JPEG", 150, 35, 40, 40);
    } catch {
      doc.text("(Photo not loaded)", 150, 45);
    }
  }

  y = 40;
  // Borrower Info with autoTable for clean alignment
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Borrower Details", 15, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    body: [
        ["Full Name:", customer.name],
        ["Phone Number:", customer.phone],
        ["Aadhar Number:", customer.aadharNumber],
        ["Address:", customer.address],
    ],
    theme: 'plain',
    tableWidth: 120,
    styles: { fontSize: 10, cellPadding: 1.5, font: 'helvetica' },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });
  y = (doc as any).lastAutoTable.finalY + 5;
  
  // Guarantor Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Guarantor Details", 15, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    body: [
        ["Full Name:", customer.guarantorName],
        ["Phone Number:", customer.guarantorPhone],
        ["Relationship:", "N/A"], // This data isn't in the types
    ],
    theme: 'plain',
    tableWidth: 120,
    styles: { fontSize: 10, cellPadding: 1.5, font: 'helvetica' },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });
  y = (doc as any).lastAutoTable.finalY + 5;


  // Loan Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Loan Information", 15, y);
  y += 5;
  const processingFeeAmount = loan.amount * (loan.processingFee / 100);
  const netDisbursed = loan.amount - processingFeeAmount;
  autoTable(doc, {
    startY: y,
    body: [
        ["Loan ID:", loan.id],
        ["Total Disbursed Amount:", formatCurrency(loan.amount)],
        ["Processing Fee:", `${loan.processingFee}% (${formatCurrency(processingFeeAmount)})`],
        ["Net Disbursed Amount:", formatCurrency(netDisbursed)],
        ["Interest Rate:", `${loan.interestRate}% p.a.`],
        ["Tenure:", `${loan.tenure} months`],
        ["Disbursal Date:", format(new Date(loan.disbursalDate), 'dd-MM-yyyy')],
    ],
    theme: 'plain',
    tableWidth: 120,
    styles: { fontSize: 10, cellPadding: 1.5, font: 'helvetica' },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;
  
  // Terms & Conditions
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Terms and Conditions", 15, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  const terms = [
    `1. Purpose of Loan: The Borrower agrees to use the loan amount solely for the purpose declared during the application and for no other reason. Misuse of funds may result in immediate recall of the loan.`,
    `2. Repayment Schedule: The Borrower is obligated to repay the loan in ${loan.tenure} Equated Monthly Installments (EMIs) on the specified due dates as detailed in the EMI schedule. It is the borrower's responsibility to ensure timely payments.`,
    `3. Interest Calculation: Interest on the loan will be calculated on a reducing balance basis. The interest rate is fixed for the duration of the loan unless explicitly stated otherwise.`,
    `4. Non-Refundable Fees: The processing fee, collected at the time of disbursal for administrative and processing costs, is strictly non-refundable under any circumstances, including loan cancellation or prepayment.`,
    `5. Penalties for Late Payment: Failure to pay any EMI by its due date will attract a late payment penalty. Continued defaults may adversely affect the Borrower's credit score and future borrowing eligibility.`,
    `6. Prepayment of Loan: The Borrower may choose to prepay the loan in full before the end of its tenure. Such prepayments may be subject to prepayment charges as per the Lender's prevailing policy.`,
    `7. Guarantor's Liability: The Guarantor is jointly and severally liable for the repayment of the entire loan amount, including any interest, penalties, and charges. The Lender may proceed against the Guarantor without first proceeding against the Borrower.`,
    `8. Confidentiality of Data: The Lender agrees to maintain the confidentiality of the Borrower's and Guarantor's personal data. This information will only be used for official purposes, including credit checks and legal proceedings if required.`,
    `9. Jurisdiction: Any disputes, claims, or legal proceedings arising out of this loan agreement shall be subject to the exclusive jurisdiction of the courts in Rajasthan, India.`
  ];

  const splitTerms = terms.map(term => doc.splitTextToSize(term, pageWidth - 30));
  splitTerms.flat().forEach(line => {
      if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 15;
      }
      doc.text(line, 15, y);
      y += 5;
  });

  // Page 2: EMI Summary
  if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = 15;
  }

  doc.addPage();
  let emiPageY = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMI Schedule Summary", 105, emiPageY, { align: "center" });
  emiPageY += 10;

  const emiTable = emiList.map((emi, i) => [
    `${i + 1}`,
    format(new Date(emi.dueDate), 'dd-MM-yyyy'),
    formatCurrency(emi.amount),
    emi.status,
  ]);

  autoTable(doc, {
    startY: emiPageY,
    head: [["#", "Due Date", "EMI Amount", "Status"]],
    body: emiTable,
    styles: { fontSize: 9 },
    theme: "grid",
    headStyles: { fillColor: [46, 71, 101], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  const lastY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFont("helvetica", "normal");
  doc.text("_____________________", 20, lastY);
  doc.text("Customer Signature", 20, lastY + 6);
  doc.text("_____________________", 130, lastY);
  doc.text("Guarantor Signature", 130, lastY + 6);

  doc.save(`Loan_Agreement_${loan.id}.pdf`);
}


  const generateEmiReceiptPDF = async (emi: EMI) => {
    if(!loan || !customer || !emi.paymentDate) return;
    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const emiIndex = loan.emis.findIndex(e => e.id === emi.id);
    const emiNumber = emiIndex !== -1 ? `${emiIndex + 1} of ${loan.emis.length}` : 'N/A';

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Receipt', pageWidth / 2, margin + 10, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedBusiness?.name || 'JLS FINACE LTD', pageWidth / 2, margin + 16, { align: 'center' });
    
    // Receipt Details Table
    autoTable(doc, {
        startY: margin + 30,
        body: [
            [{ content: 'Receipt No:', styles: { fontStyle: 'bold' } }, emi.receiptNumber || 'N/A'],
            [{ content: 'Payment Date:', styles: { fontStyle: 'bold' } }, format(new Date(emi.paymentDate), 'dd-MM-yyyy hh:mm a')],
        ],
        theme: 'plain',
        styles: { fontSize: 9 }
    });

    let detailsY = (doc as any).lastAutoTable.finalY + 5;
    doc.setLineWidth(0.2);
    doc.line(margin, detailsY, pageWidth - margin, detailsY); // separator line
    detailsY += 10;
    
    // Billed To Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO', margin, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, margin, detailsY + 5);
    doc.text(`Customer ID: ${customer.id}`, margin, detailsY + 10);
    doc.text(`Loan ID: ${loan.id}`, margin, detailsY + 15);
    doc.text(`EMI no. ${emiNumber}`, margin, detailsY + 20);

    // Payment Table
    autoTable(doc, {
        startY: detailsY + 30,
        head: [['Description', 'Amount']],
        body: [
            ['EMI Amount Received', formatCurrency(emi.amount)],
            ['  - Principal Component', formatCurrency(emi.principal)],
            ['  - Interest Component', formatCurrency(emi.interest)],
        ],
        foot: [[
            { content: 'Total Paid', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: formatCurrency(emi.amount), styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 20 } }
        ]],
        theme: 'striped',
        headStyles: { fillColor: [46, 71, 101] },
        footStyles: { fontStyle: 'bold', lineWidth: 0.2 },
    });
    let finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`Payment Method:`, margin, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${emi.paymentMethod}`, margin + 40, finalY);

    finalY += 7;
    doc.setFont('helvetica', 'bold');
    doc.text(`Outstanding Balance:`, margin, finalY);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(emi.balance), margin + 42, finalY);

    // Footer
    const footerY = pageHeight - 20;
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setFontSize(8);
    doc.text('Thank you for your payment!', pageWidth / 2, footerY + 8, { align: 'center' });
    doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, footerY + 12, { align: 'center' });


    doc.save(`receipt_${emi.receiptNumber}.pdf`);
  }


  if (!loan || !customer || !selectedBusiness) return <div>Loading loan details or loan not found...</div>;

  const isClosed = loan.status === 'Closed';
  const PrepaymentForm = ({formMethods}) => (
    <form onSubmit={formMethods.handleSubmit(onPrepaymentSubmit)}>
      <DialogHeader>
        <DialogTitle>Make a Prepayment</DialogTitle>
        <DialogDescription>
          Enter an amount to pay towards your principal. This will reduce your outstanding balance.
          Current remaining principal: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.principalRemaining || 0)}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-2">
        <Label htmlFor="prepayment-amount">Prepayment Amount</Label>
        <Input id="prepayment-amount" type="number" {...formMethods.register('amount')} />
        {formMethods.formState.errors.amount && <p className="text-sm text-destructive">{String(formMethods.formState.errors.amount.message)}</p>}
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={isActionSubmitting}>{isActionSubmitting ? 'Submitting...' : 'Submit Prepayment'}</Button>
      </DialogFooter>
    </form>
  );

  const TopupForm = ({formMethods}) => (
    <form onSubmit={formMethods.handleSubmit(onTopupSubmit)}>
      <DialogHeader>
        <DialogTitle>Request Loan Top-Up</DialogTitle>
        <DialogDescription>
          Add more funds to your existing loan. This will recalculate and extend your EMI schedule.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="space-y-2">
            <Label htmlFor="topup-amount">Top-Up Amount</Label>
            <Input id="topup-amount" type="number" {...formMethods.register('amount')} />
            {formMethods.formState.errors.amount && <p className="text-sm text-destructive">{String(formMethods.formState.errors.amount.message)}</p>}
        </div>
        <div className="space-y-2">
            <Label htmlFor="new-tenure">New Tenure (optional)</Label>
            <Input id="new-tenure" type="number" placeholder={`Current: ${loan.tenure} months`} {...formMethods.register('newTenure')} />
            <p className="text-xs text-muted-foreground">Leave blank to keep the same EMI amount and extend tenure automatically.</p>
        </div>
      </div>
      <DialogFooter>
         <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={isActionSubmitting}>{isActionSubmitting ? 'Submitting...' : 'Request Top-Up'}</Button>
      </DialogFooter>
    </form>
  );

  return (
    <TooltipProvider>
    <div className="flex flex-col gap-6">
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
                <Button variant="outline" size="sm" onClick={() => generateLoanCardPDF(customer, loan, loan.emis, selectedBusiness.name)}>Loan Card</Button>
                <Button variant="outline" size="sm" onClick={() => generateLoanAgreementPDF(customer, loan, loan.emis, selectedBusiness.name)}>Loan Agreement</Button>
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
                <div><span className="font-medium text-muted-foreground">Principal:</span> <span className="font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.amount)}</span></div>
                <div><span className="font-medium text-muted-foreground">Remaining Principal:</span> <span className="font-bold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.principalRemaining || loan.amount)}</span></div>
                <div><span className="font-medium text-muted-foreground">Interest Rate:</span> <span className="font-bold">{loan.interestRate}% p.a.</span></div>
                <div><span className="font-medium text-muted-foreground">Tenure:</span> <span className="font-bold">{loan.tenure} months</span></div>
                <div><span className="font-medium text-muted-foreground">Disbursed:</span> <span className="font-bold">{loan.disbursalDate ? format(new Date(loan.disbursalDate), 'dd-MM-yyyy') : 'N/A'}</span></div>
            </div>
        </CardContent>
      </Card>

      {role === 'admin' && !isClosed && (
      <Card>
        <CardHeader>
            <CardTitle>Loan Actions</CardTitle>
            <CardDescription>Manage this loan with prepayments, top-ups, or early closure.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-4">
            <Dialog>
                <DialogTrigger asChild><Button variant="outline"><HandCoins className="mr-2"/>Make Prepayment</Button></DialogTrigger>
                <DialogContent><PrepaymentForm formMethods={prepaymentFormMethods} /></DialogContent>
            </Dialog>

            <Dialog>
                <DialogTrigger asChild><Button variant="outline"><TrendingUp className="mr-2"/>Request Top-Up</Button></DialogTrigger>
                <DialogContent><TopupForm formMethods={topupFormMethods} /></DialogContent>
            </Dialog>

            <Dialog>
                <DialogTrigger asChild><Button variant="destructive"><ShieldCheck className="mr-2"/>Close Loan Early</Button></DialogTrigger>
                 <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you sure you want to close this loan?</DialogTitle>
                        <DialogDescription>
                            This will mark the loan as closed. This action cannot be undone. The outstanding amount of {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(loan.principalRemaining || 0)} will be considered settled.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button variant="destructive" onClick={handleCloseLoan} disabled={isActionSubmitting}>
                           {isActionSubmitting ? 'Closing...' : 'Yes, Close Loan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardContent>
      </Card>
      )}

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
                  <TableCell>{format(new Date(emi.dueDate), 'dd-MM-yyyy')}</TableCell>
                  <TableCell>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(emi.amount)}</TableCell>
                  <TableCell>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(emi.principal)}</TableCell>
                  <TableCell>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(emi.interest)}</TableCell>
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
