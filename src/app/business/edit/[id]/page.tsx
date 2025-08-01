
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { getBusinessById, updateBusiness } from '@/lib/storage';
import type { Business } from '@/types';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Business name must be at least 3 characters.' }),
});

export default function EditBusinessPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user, loading, refreshBusinesses } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }

    const fetchBusiness = async () => {
        if (typeof id !== 'string') return;
        try {
            const foundBusiness = await getBusinessById(id);
            if (foundBusiness && foundBusiness.ownerId === user?.uid) {
                setBusiness(foundBusiness);
                form.reset({ name: foundBusiness.name });
            } else {
                 toast({ title: 'Not Found', description: 'Business not found or you do not have permission to edit it.', variant: 'destructive' });
                 router.replace('/business');
            }
        } catch (error) {
             toast({ title: 'Error', description: 'Failed to load business data.', variant: 'destructive' });
        }
    }
    
    if(!loading && user) fetchBusiness();

  }, [id, user, loading, router, toast, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!business) return;
    
    setIsSubmitting(true);
    try {
        const updatedBusiness = { ...business, name: values.name };
        await updateBusiness(updatedBusiness);
        await refreshBusinesses(); // Refresh context data
        
        toast({
          title: 'Business Updated!',
          description: `The business name has been changed to ${values.name}.`,
        });
        router.push('/business');

    } catch (error) {
        toast({
            title: 'Update Failed',
            description: (error as Error).message || 'Could not update the business. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (loading || !business) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Business</CardTitle>
          <CardDescription>Update the name for your business: {business.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sharma Finance Group" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
