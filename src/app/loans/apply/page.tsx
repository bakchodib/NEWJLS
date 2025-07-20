
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addLoan, getCustomers } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Customer } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const formSchema = z.object({
  customerId: z.string().min(1, { message: 'Please select a customer.' }),
  amount: z.coerce.number().min(1000, { message: 'Loan amount must be at least ₹1,000.' }),
  interestRate: z.coerce.number().min(1, { message: 'Interest rate must be at least 1%.' }),
  tenure: z.coerce.number().min(6, { message: 'Tenure must be at least 6 months.' }).max(120),
  processingFee: z.coerce.number().min(0, { message: 'Processing fee cannot be negative.'}).max(10),
});

export default function LoanApplicationPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { role, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }
    const fetchCustomers = async () => {
        try {
            const fetchedCustomers = await getCustomers();
            setCustomers(fetchedCustomers);
        } catch(error) {
            toast({ title: 'Error', description: 'Failed to load customers.', variant: 'destructive' });
        }
    }
    fetchCustomers();
  }, [role, loading, router, toast]);

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const customer = customers.find(c => c.id === values.customerId);
    if (!customer) {
      toast({ title: 'Error', description: 'Selected customer not found.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const newLoanData = {
      ...values,
      customerName: customer.name,
    };
    
    try {
        await addLoan(newLoanData);
        toast({
          title: 'Application Submitted!',
          description: `Loan application for ${customer.name} has been submitted for approval.`,
        });
        router.push('/loans/applications');
    } catch(error) {
        toast({ title: 'Error', description: 'Failed to submit loan application.', variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (loading || role !== 'admin') {
      return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>New Loan Application</CardTitle>
          <CardDescription>Fill in the details below to create a new loan application.</CardDescription>
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
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedCustomer(customers.find(c => c.id === value) || null);
                      }}
                      defaultValue={field.value}
                    >
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

              {selectedCustomer && (
                <div className="flex items-center gap-4 rounded-md border p-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedCustomer.customerPhoto} alt={selectedCustomer.name} />
                    <AvatarFallback>{selectedCustomer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold">{selectedCustomer.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedCustomer.phone}</div>
                     <div className="text-sm text-muted-foreground">{selectedCustomer.address}</div>
                  </div>
                </div>
              )}

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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
