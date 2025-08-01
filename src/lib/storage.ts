
import type { Customer, Loan, LoanStatus, EMI, Business } from '@/types';
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
    setDoc
} from 'firebase/firestore';
import * as xlsx from 'xlsx';

// References to top-level collections
const customersCollection = collection(db, 'customers');
const loansCollection = collection(db, 'loans');
const businessesCollection = collection(db, 'businesses');


// Business Functions
export const getBusinessById = async (businessId: string): Promise<Business | null> => {
    const docRef = doc(db, 'businesses', businessId);
    const docSnap = await getDoc(docRef);
    if(docSnap.exists()){
        return {id: docSnap.id, ...docSnap.data()} as Business;
    }
    return null;
}

export const updateBusiness = async (business: Business): Promise<void> => {
    const businessDoc = doc(db, 'businesses', business.id);
    await updateDoc(businessDoc, { name: business.name });
}

export const deleteBusiness = async (businessId: string): Promise<void> => {
    const batch = writeBatch(db);

    // 1. Delete all loans for the business
    const loansQuery = query(loansCollection, where("businessId", "==", businessId));
    const loansSnapshot = await getDocs(loansQuery);
    loansSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Delete all customers for the business
    const customersQuery = query(customersCollection, where("businessId", "==", businessId));
    const customersSnapshot = await getDocs(customersQuery);
    customersSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 3. Delete the business itself
    const businessDoc = doc(db, 'businesses', businessId);
    batch.delete(businessDoc);

    // Commit the batch
    await batch.commit();
}


// Customer Functions
export const getCustomers = async (businessId: string): Promise<Customer[]> => {
  const q = query(customersCollection, where("businessId", "==", businessId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
};

export const getAvailableCustomers = async (businessId: string): Promise<Customer[]> => {
    const [customersSnapshot, loansSnapshot] = await Promise.all([
        getDocs(query(customersCollection, where("businessId", "==", businessId))),
        getDocs(query(loansCollection, where("businessId", "==", businessId), where("status", "in", ["Pending", "Approved", "Disbursed"])))
    ]);
    
    const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
    const customerIdsWithActiveLoans = new Set(loansSnapshot.docs.map(loan => loan.data().customerId));

    return customers.filter(customer => !customerIdsWithActiveLoans.has(customer.id));
}

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  const customerId = `cust_${new Date().getTime()}`;
  
  const newCustomerData = {
      ...customer,
      id: customerId,
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
    const loansQuery = query(loansCollection, where("customerId", "==", id), where("businessId", "==", updatedCustomer.businessId));
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

export const deleteCustomer = async (businessId: string, customerId: string): Promise<void> => {
    // Check if customer has loans
    const loansQuery = query(loansCollection, where("businessId", "==", businessId), where("customerId", "==", customerId));
    const loansSnapshot = await getDocs(loansQuery);
    if (!loansSnapshot.empty) {
        throw new Error("Cannot delete customer with existing loans.");
    }
    await deleteDoc(doc(db, 'customers', customerId));
}

// Loan Functions
export const getLoans = async (businessId: string): Promise<Loan[]> => {
    const q = query(loansCollection, where("businessId", "==", businessId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan));
};

export const getLoanById = async (businessId: string, loanId: string): Promise<Loan | null> => {
    const loanDocRef = doc(db, 'loans', loanId);
    const loanDoc = await getDoc(loanDocRef);
    if (loanDoc.exists() && loanDoc.data().businessId === businessId) {
        return { id: loanDoc.id, ...loanDoc.data() } as Loan;
    }
    return null;
}

export const getCustomerById = async (businessId: string, customerId: string): Promise<Customer | null> => {
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (customerDoc.exists() && customerDoc.data().businessId === businessId) {
        return { id: customerDoc.id, ...customerDoc.data() } as Customer;
    }
    return null;
}


export const addLoan = async (loan: Omit<Loan, 'id' | 'emis' | 'history' | 'status' | 'disbursalDate' | 'principalRemaining'>): Promise<Loan> => {
    const loanId = `loan_${new Date().getTime()}`;

    const newLoanData: Loan = { 
        ...loan,
        id: loanId,
        status: 'Pending' as LoanStatus,
        disbursalDate: '', 
        emis: [],
        history: [],
        principalRemaining: loan.amount,
    };
    
    const loanDocRef = doc(db, 'loans', newLoanData.id);
    await setDoc(loanDocRef, newLoanData);

    return newLoanData;
};

export const updateLoan = async (updatedLoan: Loan): Promise<void> => {
    const loanDoc = doc(db, 'loans', updatedLoan.id);
    const oldLoan = await getLoanById(updatedLoan.businessId, updatedLoan.id);
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

export const deleteLoan = async (businessId: string, loanId: string): Promise<void> => {
    const loanRef = doc(db, 'loans', loanId);
    // Optional: check businessId before deleting for extra security
    const loanDoc = await getDoc(loanRef);
    if(loanDoc.exists() && loanDoc.data().businessId === businessId) {
        await deleteDoc(loanRef);
    } else {
        throw new Error("Loan not found or you do not have permission to delete it.");
    }
}

export const disburseLoan = async (loanId: string, disbursalDate: Date): Promise<Loan | null> => {
    // This function needs to fetch the loan without businessId first to get it, then can call update.
    const loanRef = doc(db, 'loans', loanId);
    const loanSnap = await getDoc(loanRef);

    if (!loanSnap.exists()) return null;
    const loan = { id: loanSnap.id, ...loanSnap.data() } as Loan;
    
    if (loan.status !== 'Approved') return null;

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

export const prepayLoan = async (businessId: string, loanId: string, amount: number): Promise<void> => {
    const loan = await getLoanById(businessId, loanId);
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

    const lastPaymentDate = paidEmis.length > 0 ? new Date(paidEmis[paidEmis.length - 1].dueDate) : new Date(loan.disbursalDate);

    const newEmis = calculateEmis(loan, loan.principalRemaining, remainingTenure, lastPaymentDate);
    
    loan.emis = [...paidEmis, ...newEmis];

    await updateLoan(loan);
}

export const topupLoan = async (businessId: string, loanId: string, topupAmount: number, newTenure?: number): Promise<void> => {
    const loan = await getLoanById(businessId, loanId);
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

export const closeLoan = async (businessId: string, loanId: string): Promise<void> => {
    const loan = await getLoanById(businessId, loanId);
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

// Import/Export Functions
export const exportBusinessData = async (businessId: string) => {
    const [customers, loans] = await Promise.all([
        getCustomers(businessId),
        getLoans(businessId)
    ]);
    return { customers, loans };
};


export const importBusinessData = async (data: { customers: Customer[], loans: Loan[] }, targetBusinessId: string) => {
    const { customers, loans } = data;

    if (!customers || !loans) {
        throw new Error("Invalid import file. 'customers' and 'loans' arrays are required.");
    }
    
    const batch = writeBatch(db);
    const oldToNewCustomerIdMap = new Map<string, string>();

    // Process Customers
    customers.forEach(customer => {
        const oldId = customer.id;
        const newId = `cust_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;
        oldToNewCustomerIdMap.set(oldId, newId);

        const newCustomerData = { ...customer, id: newId, businessId: targetBusinessId };
        const customerDocRef = doc(db, 'customers', newId);
        batch.set(customerDocRef, newCustomerData);
    });

    // Process Loans
    loans.forEach(loan => {
        const newLoanId = `loan_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;
        const newCustomerId = oldToNewCustomerIdMap.get(loan.customerId);

        if (!newCustomerId) {
            console.warn(`Skipping loan ${loan.id} because its customer ${loan.customerId} was not found in the import file.`);
            return;
        }

        const newLoanData = { 
            ...loan, 
            id: newLoanId, 
            businessId: targetBusinessId, 
            customerId: newCustomerId 
        };
        const loanDocRef = doc(db, 'loans', newLoanId);
        batch.set(loanDocRef, newLoanData);
    });

    await batch.commit();
};
