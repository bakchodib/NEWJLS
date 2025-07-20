
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, Shield, Briefcase } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  role: z.enum(['customer', 'agent', 'admin'], {
    required_error: 'Please select a role.',
  }),
});

export default function LoginPage() {
  const { role, setRole, loading } = useAuth();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (role) {
      router.replace('/dashboard');
    }
  }, [role, router]);

  const handleLogin = (values: z.infer<typeof formSchema>) => {
    if (values.role) {
      setRole(values.role);
    }
  };

  if (loading || role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Briefcase className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">JLS FINACE LTD</CardTitle>
            <CardDescription className="text-muted-foreground">Select a role to sign in</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <Label htmlFor="role">User Role</Label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger id="role" className="w-full">
                            <SelectValue placeholder="Select a role..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="customer">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>Customer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="agent">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <span>Agent</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <span>Admin</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
                  Sign In
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </main>
  );
}
