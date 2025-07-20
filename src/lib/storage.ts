
import type { Customer, Loan, LoanStatus } from '@/types';
import { db } from './firebase';
import { 
    collection, 
    getDocs, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    getDoc,
    query,
    where,
    writeBatch
} from 'firebase/firestore';

// Customer Functions
const customersCollection = collection(db, 'customers');
const loansCollection = collection(db, 'loans');


export const getCustomers = async (): Promise<Customer[]> => {
  const querySnapshot = await getDocs(customersCollection);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
};

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  const docRef = await addDoc(customersCollection, customer);
  return { id: docRef.id, ...customer };
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<void> => {
    const customerDoc = doc(db, 'customers', updatedCustomer.id);
    const { id, ...customerData } = updatedCustomer;
    await updateDoc(customerDoc, customerData);

    // If customer name changed, update it in their loans
    const loansQuery = query(loansCollection, where("customerId", "==", id));
    const loansSnapshot = await getDocs(loansQuery);
    
    if (!loansSnapshot.empty) {
        const batch = writeBatch(db);
        loansSnapshot.forEach(loanDoc => {
            const loanRef = doc(db, "loans", loanDoc.id);
            batch.update(loanRef, { customerName: updatedCustomer.name });
        });
        await batch.commit();
    }
}

export const deleteCustomer = async (customerId: string): Promise<void> => {
    // Check if customer has loans
    const loansQuery = query(loansCollection, where("customerId", "==", customerId));
    const loansSnapshot = await getDocs(loansQuery);
    if (!loansSnapshot.empty) {
        throw new Error("Cannot delete customer with existing loans.");
    }
    await deleteDoc(doc(db, 'customers', customerId));
}

// Loan Functions
export const getLoans = async (): Promise<Loan[]> => {
    const querySnapshot = await getDocs(loansCollection);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
};

export const getLoanById = async (loanId: string): Promise<Loan | null> => {
    const loanDoc = await getDoc(doc(db, 'loans', loanId));
    if (loanDoc.exists()) {
        return { id: loanDoc.id, ...loanDoc.data() } as Loan;
    }
    return null;
}

export const getCustomerById = async (customerId: string): Promise<Customer | null> => {
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (customerDoc.exists()) {
        return { id: customerDoc.id, ...customerDoc.data() } as Customer;
    }
    return null;
}


export const addLoan = async (loan: Omit<Loan, 'id' | 'emis' | 'history' | 'status' | 'disbursalDate'>): Promise<Loan> => {
  const newLoanData = { 
      ...loan, 
      status: 'Pending' as LoanStatus,
      disbursalDate: '', 
      emis: [],
      history: [],
  };
  const docRef = await addDoc(loansCollection, newLoanData);
  return { id: docRef.id, ...newLoanData };
};

export const updateLoan = async (updatedLoan: Loan): Promise<void> => {
    const loanDoc = doc(db, 'loans', updatedLoan.id);
    const oldLoan = await getLoanById(updatedLoan.id);
    if (!oldLoan) return;
    
    const { id, ...loanData } = updatedLoan;

     const termsChanged = oldLoan.amount !== updatedLoan.amount || 
                         oldLoan.interestRate !== updatedLoan.interestRate ||
                         oldLoan.tenure !== updatedLoan.tenure;

    if (updatedLoan.status === 'Disbursed' && termsChanged) {
        loanData.emis = calculateEmis(updatedLoan);
    }
    
    await updateDoc(loanDoc, loanData);
}

export const deleteLoan = async (loanId: string): Promise<void> => {
    await deleteDoc(doc(db, 'loans', loanId));
}

export const disburseLoan = async (loanId: string): Promise<Loan | null> => {
    const loan = await getLoanById(loanId);
    if (!loan || loan.status !== 'Approved') return null;

    loan.status = 'Disbursed';
    loan.disbursalDate = new Date().toISOString();
    loan.emis = calculateEmis(loan);
    
    await updateLoan(loan);
    return loan;
}

function calculateEmis(loan: Loan) {
    const principal = loan.amount;
    const monthlyInterestRate = loan.interestRate / 12 / 100;
    const tenureInMonths = loan.tenure;

    if (principal <= 0 || monthlyInterestRate <= 0 || tenureInMonths <= 0) {
        return [];
    }
    
    const emiAmount = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureInMonths)) / (Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1);
    
    let balance = principal;
    const newEmis = [];
    const disbursalDate = loan.disbursalDate ? new Date(loan.disbursalDate) : new Date();

    for (let i = 0; i < tenureInMonths; i++) {
        const interest = balance * monthlyInterestRate;
        const principalComponent = emiAmount - interest;
        balance -= principalComponent;
        const dueDate = new Date(disbursalDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1);
        
        newEmis.push({
            id: `${loan.id}_EMI_${i+1}`,
            dueDate: dueDate.toISOString(),
            amount: parseFloat(emiAmount.toFixed(2)),
            principal: parseFloat(principalComponent.toFixed(2)),
            interest: parseFloat(interest.toFixed(2)),
            balance: parseFloat(Math.abs(balance) < 0.01 ? 0 : balance.toFixed(2)),
            status: 'Pending' as const,
        });
    }
    return newEmis;
}

// No longer need file upload, as images are stored as base64 in Firestore.
// export const uploadFile = async (file: File, path: string): Promise<string> => { ... }
