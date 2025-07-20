
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
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Phone number must be 10 digits.' }),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }),
  customerPhoto: z.any().refine(files => files?.length > 0, 'Customer photo is required.'),
  
  // KYC Fields
  aadharNumber: z.string().regex(/^\d{12}$/, { message: 'Aadhar number must be 12 digits.' }),
  aadharImage: z.any().refine(files => files?.length > 0, 'Aadhar photo is required.'),
  panNumber: z.string().min(5, {message: 'PAN/Voter ID must be at least 5 characters.'}),
  panImage: z.any().refine(files => files?.length > 0, 'PAN/Voter ID photo is required.'),

  // Guarantor Fields
  guarantorName: z.string().min(2, { message: 'Guarantor name must be at least 2 characters.' }),
  guarantorPhone: z.string().regex(/^\d{10}$/, { message: 'Guarantor phone must be 10 digits.' }),
});

export default function RegisterCustomerPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { role, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      customerPhoto: undefined,
      aadharNumber: '',
      aadharImage: undefined,
      panNumber: '',
      panImage: undefined,
      guarantorName: '',
      guarantorPhone: '',
    },
  });

  useEffect(() => {
    if (!loading && role === 'customer') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }
  }, [role, loading, router, toast]);

  const uploadToImgBB = async (imageFile: File): Promise<string | null> => {
    const apiKey = '881d667e66f0b22ff45ba16e248fbcb2';
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (result.success) {
            return result.data.url;
        } else {
            console.error('ImgBB upload failed:', result);
            return null;
        }
    } catch (error) {
        console.error('Error uploading to ImgBB:', error);
        return null;
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    toast({ title: 'Uploading Images...', description: 'Please wait while we upload the KYC documents.' });

    try {
        const customerPhotoUrl = await uploadToImgBB(values.customerPhoto[0]);
        const aadharImageUrl = await uploadToImgBB(values.aadharImage[0]);
        const panImageUrl = await uploadToImgBB(values.panImage[0]);

        if (!customerPhotoUrl || !aadharImageUrl || !panImageUrl) {
            throw new Error('One or more image uploads failed.');
        }

        const newCustomer = {
          name: values.name,
          phone: values.phone,
          address: values.address,
          customerPhoto: customerPhotoUrl,
          aadharNumber: values.aadharNumber,
          aadharImage: aadharImageUrl,
          panNumber: values.panNumber,
          panImage: panImageUrl,
          guarantorName: values.guarantorName,
          guarantorPhone: values.guarantorPhone,
        };

        addCustomer(newCustomer);
        
        toast({
          title: 'Customer Registered!',
          description: `${values.name} has been successfully added.`,
        });
        router.push('/customers');

    } catch (error) {
        toast({
            title: 'Upload Failed',
            description: (error as Error).message || 'Could not upload images. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
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
                 <FormField
                  control={form.control}
                  name="customerPhoto"
                  render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                          <FormLabel>Customer Photo</FormLabel>
                          <FormControl>
                              <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
                          </FormControl>
                          <FormDescription>Upload a clear photo of the customer.</FormDescription>
                          <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">KYC Details</h3>
                 <FormField
                  control={form.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Card Number</FormLabel>
                      <FormControl>
                        <Input placeholder="123456789012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aadharImage"
                  render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                          <FormLabel>Aadhar Card Photo</FormLabel>
                          <FormControl>
                              <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
                          </FormControl>
                          <FormDescription>Upload a photo of the Aadhar Card.</FormDescription>
                          <FormMessage />
                      </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="panNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PAN / Voter ID Number</FormLabel>
                      <FormControl>
                        <Input placeholder="ABCDE1234F" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="panImage"
                  render={({ field: { onChange, value, ...rest } }) => (
                      <FormItem>
                          <FormLabel>PAN / Voter ID Photo</FormLabel>
                          <FormControl>
                              <Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} />
                          </FormControl>
                          <FormDescription>Upload a photo of the PAN or Voter ID Card.</FormDescription>
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
                {isSubmitting ? 'Submitting...' : 'Register Customer'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
