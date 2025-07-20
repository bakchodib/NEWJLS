export type Role = 'admin' | 'agent' | 'customer';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  kycImage: string; // URL or base64 string
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
}

export interface LoanHistory {
    date: string;
    amount: number;
    description: string;
}

export interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  interestRate: number; // Annual interest rate in percent
  tenure: number; // in months
  disbursalDate: string;
  emis: EMI[];
  history: LoanHistory[];
}
