'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, Shield, Briefcase } from 'lucide-react';

export default function LoginPage() {
  const { role, setRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (role) {
      router.replace('/dashboard');
    }
  }, [role, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRole = (e.target as any).role.value;
    if (selectedRole) {
      setRole(selectedRole);
    }
  };

  if (loading || role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-light-gray dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
              <Briefcase className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-bold text-primary">FinanceFlow</CardTitle>
            <CardDescription className="text-muted-foreground">Select a role to sign in</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Select name="role" required defaultValue="">
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select a role..." />
                  </SelectTrigger>
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
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90">
                Sign In
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
