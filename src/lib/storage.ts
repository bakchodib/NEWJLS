
import type { Customer, Loan, LoanStatus, EMI } from '@/types';
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
    writeBatch,
    orderBy,
    limit,
    setDoc
} from 'firebase/firestore';

// Customer Functions
const customersCollection = collection(db, 'customers');
const loansCollection = collection(db, 'loans');


export const getCustomers = async (): Promise<Customer[]> => {
  const querySnapshot = await getDocs(query(customersCollection, orderBy("id")));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
};

export const getAvailableCustomers = async (): Promise<Customer[]> => {
    const [customersSnapshot, loansSnapshot] = await Promise.all([
        getDocs(query(customersCollection, orderBy("id"))),
        getDocs(query(loansCollection, where("status", "in", ["Pending", "Approved", "Disbursed"])))
    ]);
    
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    const customerIdsWithActiveLoans = new Set(loansSnapshot.docs.map(loan => loan.data().customerId));

    return customers.filter(customer => !customerIdsWithActiveLoans.has(customer.id));
}

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  const lastCustomerQuery = query(customersCollection, orderBy("id", "desc"), limit(1));
  const lastCustomerSnapshot = await getDocs(lastCustomerQuery);

  let newCustomerId = 101000;
  if (!lastCustomerSnapshot.empty) {
    const lastCustomerId = parseInt(lastCustomerSnapshot.docs[0].id, 10);
    newCustomerId = lastCustomerId + 100;
  }
  
  const newCustomerData = {
      ...customer,
      id: String(newCustomerId),
  };

  const customerDocRef = doc(db, 'customers', newCustomerData.id);
  await setDoc(customerDocRef, newCustomerData);

  return newCustomerData;
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
    const querySnapshot = await getDocs(query(loansCollection, orderBy("id")));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
};

export const getLoanById = async (loanId: string): Promise<Loan | null> => {
    const loanDocRef = doc(db, 'loans', loanId);
    const loanDoc = await getDoc(loanDocRef);
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


export const addLoan = async (loan: Omit<Loan, 'id' | 'emis' | 'history' | 'status' | 'disbursalDate' | 'principalRemaining'>): Promise<Loan> => {
    // Get the last loan to determine the new ID
    const lastLoanQuery = query(loansCollection, orderBy("id", "desc"), limit(1));
    const lastLoanSnapshot = await getDocs(lastLoanQuery);

    let newLoanId = 1000100;
    if (!lastLoanSnapshot.empty) {
        const lastLoanId = parseInt(lastLoanSnapshot.docs[0].id, 10);
        newLoanId = lastLoanId + 100;
    }

    const newLoanData: Loan = { 
        ...loan,
        id: String(newLoanId),
        status: 'Pending' as LoanStatus,
        disbursalDate: '', 
        emis: [],
        history: [],
        principalRemaining: loan.amount,
    };
    
    // Use setDoc with the custom ID
    const loanDocRef = doc(db, 'loans', newLoanData.id);
    await setDoc(loanDocRef, newLoanData);

    return newLoanData;
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
        loanData.emis = calculateEmis(updatedLoan, updatedLoan.principalRemaining);
    }
    
    await updateDoc(loanDoc, loanData);
}

export const deleteLoan = async (loanId: string): Promise<void> => {
    await deleteDoc(doc(db, 'loans', loanId));
}

export const disburseLoan = async (loanId: string, disbursalDate: Date): Promise<Loan | null> => {
    const loan = await getLoanById(loanId);
    if (!loan || loan.status !== 'Approved') return null;

    loan.status = 'Disbursed';
    loan.disbursalDate = disbursalDate.toISOString();
    loan.principalRemaining = loan.amount;
    loan.emis = calculateEmis(loan, loan.amount);
    
    await updateLoan(loan);
    return loan;
}


function calculateEmis(loan: Loan, principal: number, tenure?: number, startDate?: Date): EMI[] {
    const monthlyInterestRate = loan.interestRate / 12 / 100;
    const tenureInMonths = tenure || loan.tenure;

    if (principal <= 0 || monthlyInterestRate <= 0 || tenureInMonths <= 0) {
        return [];
    }
    
    const emiAmount = (principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, tenureInMonths)) / (Math.pow(1 + monthlyInterestRate, tenureInMonths) - 1);
    
    let balance = principal;
    const newEmis: EMI[] = [];
    const baseDate = startDate || (loan.disbursalDate ? new Date(loan.disbursalDate) : new Date());

    for (let i = 0; i < tenureInMonths; i++) {
        const interest = balance * monthlyInterestRate;
        const principalComponent = emiAmount - interest;
        balance -= principalComponent;
        
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + i + 1, 1);
        dueDate.setHours(0, 0, 0, 0);
        
        newEmis.push({
            id: `${loan.id}_EMI_${i + 1}_${new Date().getTime()}`, // Make ID more unique
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

export const prepayLoan = async (loanId: string, amount: number): Promise<void> => {
    const loan = await getLoanById(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.status !== 'Disbursed') throw new Error("Can only prepay a disbursed loan.");
    if (loan.principalRemaining === undefined || amount > loan.principalRemaining) {
      throw new Error("Prepayment cannot exceed remaining principal.");
    }

    loan.principalRemaining -= amount;
    loan.history.push({
        date: new Date().toISOString(),
        amount: amount,
        description: `Prepayment of ${amount} received. EMI amount recalculated.`,
    });
    
    const paidEmis = loan.emis.filter(e => e.status === 'Paid');
    const pendingEmis = loan.emis.filter(e => e.status === 'Pending');
    const remainingTenure = pendingEmis.length;
    
    if (remainingTenure <= 0) { // If all EMIs are paid, just update principal
        await updateLoan(loan);
        return;
    }

    const nextDueDate = new Date(pendingEmis[0].dueDate);
    const lastPaymentDate = paidEmis.length > 0 ? new Date(paidEmis[paidEmis.length - 1].dueDate) : new Date(loan.disbursalDate);

    // We pass the last payment date to calculate the next due date correctly.
    const newEmis = calculateEmis(loan, loan.principalRemaining, remainingTenure, lastPaymentDate);
    
    loan.emis = [...paidEmis, ...newEmis];

    await updateLoan(loan);
}

export const topupLoan = async (loanId: string, topupAmount: number, newTenure?: number): Promise<void> => {
    const loan = await getLoanById(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.status !== 'Disbursed') throw new Error("Can only top-up a disbursed loan.");

    loan.amount += topupAmount;
    if(loan.principalRemaining === undefined) loan.principalRemaining = 0;
    loan.principalRemaining += topupAmount;
    
    loan.history.push({
        date: new Date().toISOString(),
        amount: topupAmount,
        description: `Top-up of ${topupAmount} disbursed.`,
    });
    
    const paidEmis = loan.emis.filter(e => e.status === 'Paid');
    const lastPaymentDate = paidEmis.length > 0 ? new Date(paidEmis[paidEmis.length - 1].dueDate) : new Date(loan.disbursalDate);
    
    const remainingPendingEmisCount = loan.emis.filter(e => e.status === 'Pending').length;
    const tenureForRecalculation = newTenure || remainingPendingEmisCount;

    const newEmis = calculateEmis(loan, loan.principalRemaining, tenureForRecalculation, lastPaymentDate);
    
    loan.emis = [...paidEmis, ...newEmis];
    loan.tenure = loan.emis.length;

    await updateLoan(loan);
}

export const closeLoan = async (loanId: string): Promise<void> => {
    const loan = await getLoanById(loanId);
    if (!loan) throw new Error("Loan not found");
    if (loan.status !== 'Disbursed') throw new Error("Can only close a disbursed loan.");

    loan.status = 'Closed';
    loan.principalRemaining = 0;
    
    loan.emis = loan.emis.map(emi => emi.status === 'Pending' ? { ...emi, status: 'Paid', paymentDate: new Date().toISOString(), amount: 0, principal: 0, interest: 0 } : emi);
    
    loan.history.push({
        date: new Date().toISOString(),
        amount: 0,
        description: 'Loan closed early by administrator.',
    });

    await updateLoan(loan);
}
