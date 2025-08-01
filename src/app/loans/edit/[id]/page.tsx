
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getLoanById, updateLoan, getCustomers } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { Customer, Loan } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const formSchema = z.object({
  customerId: z.string().min(1, { message: 'Please select a customer.' }),
  amount: z.coerce.number().min(1000, { message: 'Loan amount must be at least ₹1,000.' }),
  interestRate: z.coerce.number().min(1, { message: 'Interest rate must be at least 1%.' }),
  tenure: z.coerce.number().min(6, { message: 'Tenure must be at least 6 months.' }).max(120),
  processingFee: z.coerce.number().min(0, { message: 'Processing fee cannot be negative.'}).max(10),
});

export default function EditLoanPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const { role, loading, selectedBusiness } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      amount: undefined,
      interestRate: undefined,
      tenure: undefined,
      processingFee: 5,
    },
  });
  
  const fetchData = useCallback(async () => {
    if (!id || typeof id !== 'string' || !selectedBusiness?.id) return;
    try {
        setPageLoading(true);
        const [fetchedCustomers, foundLoan] = await Promise.all([
            getCustomers(selectedBusiness.id),
            getLoanById(selectedBusiness.id, id as string)
        ]);

        setCustomers(fetchedCustomers);

        if (foundLoan) {
            if (foundLoan.status === 'Closed') {
                 toast({ title: 'Cannot Edit', description: 'Closed loans cannot be edited.', variant: 'destructive' });
                 router.back();
                 return;
            }
            setLoan(foundLoan);
            form.reset(foundLoan);
        } else if(id) {
            toast({ title: 'Not Found', description: 'Loan not found.', variant: 'destructive' });
            router.replace('/loans/applications');
        }
    } catch(error) {
        toast({ title: 'Error', description: 'Failed to load data.', variant: 'destructive' });
    } finally {
        setPageLoading(false);
    }
  }, [id, selectedBusiness, toast, form, router]);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }
    
    if (role === 'admin' && selectedBusiness) {
        fetchData();
    }

  }, [id, role, loading, router, toast, form, selectedBusiness, fetchData]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!loan) return;

    const customer = customers.find(c => c.id === values.customerId);
    if (!customer) {
      toast({ title: 'Error', description: 'Selected customer not found.', variant: 'destructive' });
      return;
    }

    const updatedLoanData: Loan = {
      ...loan,
      ...values,
      customerName: customer.name,
    };
    
    try {
        await updateLoan(updatedLoanData);
        toast({
          title: 'Loan Updated!',
          description: `Loan for ${customer.name} has been successfully updated.`,
        });
        router.push(`/loans/${loan.id}`);
    } catch(error) {
        toast({ title: 'Error', description: 'Failed to update loan.', variant: 'destructive' });
    }
  }

  if (loading || pageLoading) {
      return <div>Loading...</div>;
  }
  
  if (!loan) {
      return <div>Loan not found.</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Loan</CardTitle>
          <CardDescription>Update the details for loan ID: {loan.id}.</CardDescription>
        </CardHeader>
        <CardContent>
          {loan.status === 'Disbursed' && (
             <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning: Editing Disbursed Loan</AlertTitle>
              <AlertDescription>
                Changing the amount, interest rate, or tenure will recalculate and replace the entire EMI schedule. Previously paid EMIs will be disregarded in the new schedule.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Loan Amount (₹)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="50000" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Annual Interest Rate (%)</FormLabel>
                        <FormControl>
                        <Input type="number" step="0.1" placeholder="12.5" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="tenure"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tenure (in months)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="36" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="processingFee"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Processing Fee (%)</FormLabel>
                        <FormControl>
                        <Input type="number" step="0.1" placeholder="5" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <Button type="submit">Save Changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
