import type { Customer, Loan } from '@/types';

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

export const addLoan = (loan: Omit<Loan, 'id' | 'emis' | 'history'>): Loan => {
  const loans = getLoans();
  const newLoan: Loan = { 
      ...loan, 
      id: `LOAN_${Date.now()}`,
      emis: [],
      history: [],
  };
  
  const principal = newLoan.amount;
  const monthlyInterestRate = newLoan.interestRate / 12 / 100;
  const tenureInMonths = newLoan.tenure;
  
  const emiAmount = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureInMonths)) / (Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1);
  
  let balance = principal;
  for (let i = 0; i < tenureInMonths; i++) {
    const interest = balance * monthlyInterestRate;
    const principalComponent = emiAmount - interest;
    balance -= principalComponent;
    const dueDate = new Date(newLoan.disbursalDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    newLoan.emis.push({
      id: `${newLoan.id}_EMI_${i+1}`,
      dueDate: dueDate.toISOString(),
      amount: parseFloat(emiAmount.toFixed(2)),
      principal: parseFloat(principalComponent.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      balance: parseFloat(balance.toFixed(2)),
      status: 'Pending',
    });
  }

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
