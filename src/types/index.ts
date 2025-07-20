export type Role = 'admin' | 'agent' | 'customer';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  customerPhoto: string; // URL or base64 string
  
  // KYC Details
  aadharNumber: string;
  aadharImage: string; // URL or base64 string
  panNumber: string;
  panImage: string; // URL or base64 string

  guarantorName: string;
  guarantorPhone: string;
}

export interface EMI {
  id: string;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
  status: 'Pending' | 'Paid';
  paymentDate?: string;
  receiptNumber?: string;
  paymentMethod?: 'Cash' | 'Online';
}

export interface LoanHistory {
    date: string;
    amount: number;
    description: string;
}

export type LoanStatus = 'Pending' | 'Approved' | 'Disbursed' | 'Rejected' | 'Closed';

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  interestRate: number; // Annual interest rate in percent
  tenure: number; // in months
  processingFee: number; // Percentage
  disbursalDate: string;
  status: LoanStatus;
  emis: EMI[];
  history: LoanHistory[];
}
