
export type Role = 'admin' | 'agent' | 'customer';

export interface Business {
  id: string;
  name: string;
  ownerId: string; // UID of the admin who created it
  fast2smsApiKey?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  address: string;
  customerPhoto: string; // Base64 data URI
  
  // KYC Details
  aadharNumber: string;
  panNumber: string;

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
  businessId: string;
  customerId: string;
  customerName: string;
  amount: number; // Original or total including topups
  interestRate: number; // Annual interest rate in percent
  tenure: number; // in months
  processingFee: number; // Percentage
  disbursalDate: string;
  status: LoanStatus;
  emis: EMI[];
  history: LoanHistory[];
  principalRemaining: number;
}


export interface AppUser {
  id: string; // This is the UID from Firebase Auth
  name: string;
  email: string;
  role: 'admin' | 'agent';
  accessibleBusinessIds: string[];
};
