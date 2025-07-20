'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addCustomer } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Phone number must be 10 digits.' }),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
  kycImage: z.any().refine(files => files?.length > 0, 'KYC image is required.'),
});

export default function RegisterCustomerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { role, loading } = useAuth();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      kycImage: undefined,
    },
  });

  useEffect(() => {
    if (!loading && role === 'customer') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }
  }, [role, loading, router, toast]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Simulate image upload by using a placeholder
    const newCustomer = {
      name: values.name,
      phone: values.phone,
      address: values.address,
      kycImage: 'https://placehold.co/600x400.png',
    };
    addCustomer(newCustomer);
    toast({
      title: 'Customer Registered!',
      description: `${values.name} has been successfully added.`,
    });
    router.push('/customers');
  }

  if (loading || role === 'customer') {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Register New Customer</CardTitle>
          <CardDescription>Fill in the details below to add a new customer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
              <FormField
                control={form.control}
                name="kycImage"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                        <FormLabel>KYC Document</FormLabel>
                        <FormControl>
                            <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
                        </FormControl>
                        <FormDescription>Upload an identity document (e.g., Aadhar, PAN).</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
                />

              <Button type="submit">Register Customer</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
