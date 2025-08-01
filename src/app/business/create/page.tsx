
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  name: z.string().min(3, { message: 'Business name must be at least 3 characters.' }),
});

export default function CreateBusinessPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading, refreshBusinesses } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You are not allowed to access this page.', variant: 'destructive' });
      router.replace('/dashboard');
    }
  }, [user, loading, router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ title: 'Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const newBusinessId = `biz_${new Date().getTime()}`;
        const newBusiness = {
            id: newBusinessId,
            name: values.name,
            ownerId: user.uid,
        };

        await setDoc(doc(db, 'businesses', newBusinessId), newBusiness);

        await refreshBusinesses();
        
        toast({
          title: 'Business Created!',
          description: `${values.name} has been successfully created.`,
        });
        router.push('/dashboard');

    } catch (error) {
        toast({
            title: 'Creation Failed',
            description: (error as Error).message || 'Could not create the business. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (loading || user?.role !== 'admin') {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Business</CardTitle>
          <CardDescription>Enter the name for your new business entity.</CardDescription>
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
                {isSubmitting ? 'Creating...' : 'Create Business'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
