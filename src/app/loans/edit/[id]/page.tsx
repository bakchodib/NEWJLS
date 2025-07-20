
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getLoans, updateLoan, getCustomers } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Customer, Loan } from '@/types';
import { useAuth } from '@/contexts/auth-context';

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
  const { role, loading } = useAuth();

  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }
    setCustomers(getCustomers());

    if (id) {
        const loans = getLoans();
        const foundLoan = loans.find(l => l.id === id);
        if (foundLoan) {
            if (foundLoan.status === 'Disbursed' || foundLoan.status === 'Closed') {
                 toast({ title: 'Cannot Edit', description: 'Disbursed or closed loans cannot be edited.', variant: 'destructive' });
                 router.back();
                 return;
            }
            setLoan(foundLoan);
            form.reset(foundLoan);
        } else {
            toast({ title: 'Not Found', description: 'Loan not found.', variant: 'destructive' });
            router.replace('/loans/applications');
        }
    }
  }, [id, role, loading, router, toast]);

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

  function onSubmit(values: z.infer<typeof formSchema>) {
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

    updateLoan(updatedLoanData);

    toast({
      title: 'Application Updated!',
      description: `Loan application for ${customer.name} has been successfully updated.`,
    });
    router.push('/loans/applications');
  }

  if (loading || role !== 'admin' || !loan) {
      return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Loan Application</CardTitle>
          <CardDescription>Update the details for loan ID: {loan.id}.</CardDescription>
        </CardHeader>
        <CardContent>
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
