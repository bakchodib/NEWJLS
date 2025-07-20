
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

// Helper: Load image as Base64
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Attempt to use the direct Base64 URI if available
    if (url.startsWith('data:image')) {
        resolve(url);
        return;
    }
    
    // Fallback to fetching if it's a URL
    const img = new Image();
    img.crossOrigin = "anonymous"; // This is important for fetching from other domains
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
        reject(new Error("Failed to convert image to data URL."));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image.'));
    
    // Use a CORS proxy for external images to avoid tainted canvas issues
    img.src = `https://cors-anywhere.herokuapp.com/${url}`;
  });
}

// Helper: Format number with commas
function formatCurrency(value: number) {
  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

/**
 * Generates a beautifully formatted Loan Card PDF
 * @param customer - Object with { name, id, customerPhoto }
 * @param loan - Object with { id, amount, interestRate, tenure, disbursalDate }
 * @param emiList - Array of EMIs with { dueDate, amount, principal, interest, balance, status }
 */
async function generateLoanCardPDF(customer: Customer, loan: Loan, emiList: EMI[]) {
  const doc = new jsPDF();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("JLS FINANCE LTD", 105, 15, { align: "center" });
  doc.setFontSize(13);
  doc.text("Loan Card", 105, 23, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 15, 30);

  // Customer Photo (top right)
  if (customer.customerPhoto) {
    try {
      // The image is already a Base64 data URI, so no conversion needed.
      doc.addImage(customer.customerPhoto, "JPEG", 150, 35, 40, 40);
    } catch {
      doc.text("(Photo not loaded)", 150, 45);
    }
  }

  // Loan & Customer Info Table using autoTable
    const info = [
        ["Customer Name:", customer.name],
        ["Customer ID:", customer.id],
        ["Loan ID:", loan.id],
        ["Loan Amount:", `₹${formatCurrency(loan.amount)}`],
        ["Interest Rate:", `${loan.interestRate}% p.a.`],
        ["Tenure:", `${loan.tenure} months`],
        ["Disbursal Date:", new Date(loan.disbursalDate).toLocaleDateString()],
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
    new Date(emi.dueDate).toLocaleDateString(),
    `₹${formatCurrency(emi.amount)}`,
    `₹${formatCurrency(emi.principal)}`,
    `₹${formatCurrency(emi.interest)}`,
    `₹${formatCurrency(emi.balance)}`,
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


async function generateLoanAgreementPDF(customer: Customer, loan: Loan, emiList: EMI[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y: number;

  // Page 1 Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("JLS FINANCE LTD", 105, 15, { align: "center" });
  doc.setFontSize(13);
  doc.text("Loan Agreement Document", 105, 23, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 30);
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
        ["Sanctioned Amount:", `\u20B9${formatCurrency(loan.amount)}`],
        ["Processing Fee:", `${loan.processingFee}% (\u20B9${formatCurrency(processingFeeAmount)})`],
        ["Net Disbursed Amount:", `\u20B9${formatCurrency(netDisbursed)}`],
        ["Interest Rate:", `${loan.interestRate}% p.a.`],
        ["Tenure:", `${loan.tenure} months`],
        ["Disbursal Date:", new Date(loan.disbursalDate).toLocaleDateString()],
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
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const terms = [
    "1. Loan amount must be used only for declared purpose.",
    "2. Repayment shall be in fixed EMIs as per schedule.",
    "3. Interest is charged on reducing balance basis.",
    "4. Processing fee is non-refundable.",
    "5. Late payments may incur penalties.",
    "6. Early closure allowed with full dues & charges.",
    "7. Top-up eligibility is subject to repayment history.",
    "8. Guarantor shares legal liability on default.",
    "9. Data will be kept secure and used officially.",
    "10. Disputes fall under [Rajasthan] jurisdiction."
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
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("EMI Schedule Summary", 105, 20, { align: "center" });

  const emiTable = emiList.map((emi, i) => [
    `${i + 1}`,
    new Date(emi.dueDate).toLocaleDateString(),
    `\u20B9${formatCurrency(emi.amount)}`,
    emi.status,
  ]);

  autoTable(doc, {
    startY: 30,
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
    doc.text('FinanceFlow Inc.', pageWidth / 2, margin + 16, { align: 'center' });
    
    // Receipt Details Table
    autoTable(doc, {
        startY: margin + 30,
        body: [
            [{ content: 'Receipt No:', styles: { fontStyle: 'bold' } }, emi.receiptNumber || 'N/A'],
            [{ content: 'Payment Date:', styles: { fontStyle: 'bold' } }, new Date(emi.paymentDate).toLocaleString()],
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
            ['EMI Amount Received', `₹ ${emi.amount.toLocaleString()}`],
            ['  - Principal Component', `₹ ${emi.principal.toLocaleString()}`],
            ['  - Interest Component', `₹ ${emi.interest.toLocaleString()}`],
        ],
        foot: [[
            { content: 'Total Paid', styles: { fontStyle: 'bold', halign: 'right' } },
            { content: `₹ ${emi.amount.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 20 } }
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
    doc.text(`₹ ${emi.balance.toLocaleString()}`, margin + 42, finalY);

    // Footer
    const footerY = pageHeight - 20;
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setFontSize(8);
    doc.text('Thank you for your payment!', pageWidth / 2, footerY + 8, { align: 'center' });
    doc.text('This is a computer-generated receipt and does not require a signature.', pageWidth / 2, footerY + 12, { align: 'center' });


    doc.save(`receipt_${emi.receiptNumber}.pdf`);
  }


  if (!loan || !customer) return <div>Loading loan details or loan not found...</div>;

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
                <Button variant="outline" size="sm" onClick={() => generateLoanCardPDF(customer, loan, loan.emis)}>Loan Card</Button>
                <Button variant="outline" size="sm" onClick={() => generateLoanAgreementPDF(customer, loan, loan.emis)}>Loan Agreement</Button>
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
