import type { Customer, Loan, LoanStatus } from '@/types';

const isClient = typeof window !== 'undefined';

function getFromStorage<T>(key: string, defaultValue: T): T {
  if (!isClient) return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (!isClient) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

// Customer Functions
export const getCustomers = (): Customer[] => getFromStorage<Customer[]>('customers', []);

export const saveCustomers = (customers: Customer[]) => saveToStorage('customers', customers);

export const addCustomer = (customer: Omit<Customer, 'id'>): Customer => {
  const customers = getCustomers();
  const newCustomer: Customer = { ...customer, id: `CUST_${Date.now()}` };
  saveCustomers([...customers, newCustomer]);
  return newCustomer;
};

// Loan Functions
export const getLoans = (): Loan[] => getFromStorage<Loan[]>('loans', []);

export const saveLoans = (loans: Loan[]) => saveToStorage('loans', loans);

export const addLoan = (loan: Omit<Loan, 'id' | 'emis' | 'history' | 'status' | 'disbursalDate'>): Loan => {
  const loans = getLoans();
  const newLoan: Loan = { 
      ...loan, 
      id: `LOAN_${Date.now()}`,
      status: 'Pending',
      disbursalDate: '', // Will be set on approval/disbursal
      emis: [],
      history: [],
  };
  
  saveLoans([...loans, newLoan]);
  return newLoan;
};

export const updateLoan = (updatedLoan: Loan): void => {
    const loans = getLoans();
    const index = loans.findIndex(l => l.id === updatedLoan.id);
    if(index !== -1) {
        loans[index] = updatedLoan;
        saveLoans(loans);
    }
}

export const disburseLoan = (loanId: string): Loan | null => {
    const loans = getLoans();
    const loanIndex = loans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) return null;

    const loan = loans[loanIndex];
    loan.status = 'Disbursed';
    loan.disbursalDate = new Date().toISOString();

    const principal = loan.amount;
    const monthlyInterestRate = loan.interestRate / 12 / 100;
    const tenureInMonths = loan.tenure;
    
    const emiAmount = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureInMonths)) / (Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1);
    
    let balance = principal;
    const newEmis = [];
    for (let i = 0; i < tenureInMonths; i++) {
        const interest = balance * monthlyInterestRate;
        const principalComponent = emiAmount - interest;
        balance -= principalComponent;
        const dueDate = new Date(loan.disbursalDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        
        newEmis.push({
            id: `${loan.id}_EMI_${i+1}`,
            dueDate: dueDate.toISOString(),
            amount: parseFloat(emiAmount.toFixed(2)),
            principal: parseFloat(principalComponent.toFixed(2)),
            interest: parseFloat(interest.toFixed(2)),
            balance: parseFloat(balance.toFixed(2)),
            status: 'Pending' as const,
        });
    }
    loan.emis = newEmis;
    updateLoan(loan);
    return loan;
}
