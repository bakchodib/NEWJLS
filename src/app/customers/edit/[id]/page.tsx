
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getCustomerById, updateCustomer } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import type { Customer } from '@/types';

// Form schema without KYC fields as they are not editable
const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Phone number must be 10 digits.' }),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
  guarantorName: z.string().min(2, { message: 'Guarantor name must be at least 2 characters.' }),
  guarantorPhone: z.string().regex(/^\d{10}$/, { message: 'Guarantor phone must be 10 digits.' }),
});

export default function EditCustomerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { role, loading: authLoading, selectedBusiness } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      guarantorName: '',
      guarantorPhone: '',
    },
  });

  useEffect(() => {
    if (!authLoading && (role === 'customer' || !role)) {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
      return;
    }

    if (id && typeof id === 'string' && selectedBusiness?.id) {
      const fetchCustomer = async () => {
        try {
          setPageLoading(true);
          const foundCustomer = await getCustomerById(selectedBusiness.id, id);
          if (foundCustomer) {
              setCustomer(foundCustomer);
              form.reset({
                  name: foundCustomer.name,
                  phone: foundCustomer.phone,
                  address: foundCustomer.address,
                  guarantorName: foundCustomer.guarantorName,
                  guarantorPhone: foundCustomer.guarantorPhone,
              });
          } else {
              toast({ title: 'Not Found', description: 'Customer not found.', variant: 'destructive' });
              router.replace('/customers');
          }
        } catch(error) {
            toast({ title: 'Error', description: 'Failed to load customer data.', variant: 'destructive' });
        } finally {
            setPageLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [id, role, authLoading, router, toast, form, selectedBusiness]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!customer) return;
    setIsSubmitting(true);
    
    const updatedCustomerData: Customer = {
        ...customer,
        ...values,
    };

    try {
      await updateCustomer(updatedCustomerData);
      toast({
        title: 'Customer Updated!',
        description: `${values.name}'s details have been successfully updated.`,
      });
      router.push('/customers');
    } catch(error) {
       toast({ title: 'Update Failed', description: 'Could not update customer details.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (pageLoading || authLoading || !selectedBusiness) {
    return <div>Loading customer data...</div>;
  }

  if (!customer) {
    return <div>Customer not found.</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Edit Customer: {customer.name}</CardTitle>
          <CardDescription>Update the customer details below for {selectedBusiness.name}. KYC documents cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Customer Details</h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main St, Anytown, USA" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Guarantor Details</h3>
                <FormField
                  control={form.control}
                  name="guarantorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantor Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Jane Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guarantorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantor Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="9876543211" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
