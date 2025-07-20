
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addLoan, getCustomers, getLoans } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Customer } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

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
  const [isFetchingCustomers, setIsFetchingCustomers] = useState(true);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }
    const fetchData = async () => {
        setIsFetchingCustomers(true);
        try {
            const [fetchedCustomers, allLoans] = await Promise.all([
                getCustomers(),
                getLoans()
            ]);
            
            const customerIdsWithLoans = new Set(allLoans.map(loan => loan.customerId));
            const availableCustomers = fetchedCustomers.filter(customer => !customerIdsWithLoans.has(customer.id));

            setCustomers(availableCustomers);
        } catch(error) {
            toast({ title: 'Error', description: 'Failed to load available customers.', variant: 'destructive' });
        } finally {
            setIsFetchingCustomers(false);
        }
    }
    if (role === 'admin') {
      fetchData();
    }
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
  
  const customerId = form.watch('customerId');

  useEffect(() => {
      if(customerId) {
          setSelectedCustomer(customers.find(c => c.id === customerId) || null);
      } else {
          setSelectedCustomer(null);
      }
  }, [customerId, customers]);

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

  const CustomerSkeleton = () => (
    <div className="flex flex-col items-center gap-2 p-4 border rounded-lg">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-4 w-3/4" />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>New Loan Application</CardTitle>
          <CardDescription>
            {selectedCustomer ? `Creating loan for ${selectedCustomer.name}` : 'First, select a customer from the list below.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <FormLabel>Select a Customer</FormLabel>
                {isFetchingCustomers ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                        {Array.from({length: 4}).map((_, i) => <CustomerSkeleton key={i} />)}
                    </div>
                ) : customers.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                        {customers.map(customer => (
                            <button
                                type="button"
                                key={customer.id}
                                onClick={() => form.setValue('customerId', customer.id, { shouldValidate: true })}
                                className={cn(
                                    "p-4 border rounded-lg flex flex-col items-center gap-2 text-center transition-all duration-200",
                                    customerId === customer.id ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'
                                )}
                            >
                                <Avatar className="h-24 w-24 border-2" data-ai-hint="person portrait">
                                    <AvatarImage src={customer.customerPhoto} alt={customer.name} />
                                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-sm">{customer.name}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border rounded-lg mt-2">
                        <p className="text-muted-foreground">No available customers to create a new loan for.</p>
                        <p className="text-xs text-muted-foreground mt-1">All registered customers may already have an active loan.</p>
                    </div>
                )}
                <FormField
                  control={form.control}
                  name="customerId"
                  render={() => <FormMessage className="mt-2" />}
                />
              </div>

              {selectedCustomer && (
                <>
                <Separator />
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
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
