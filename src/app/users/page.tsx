
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Upload } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type AppUser = {
  id: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
};

const getInitialUsers = (): AppUser[] => {
    if (typeof window === 'undefined') return [];
    const storedUsers = localStorage.getItem('appUsers');
    if (storedUsers) {
        return JSON.parse(storedUsers);
    }
    const defaultUsers: AppUser[] = [
        { id: 'user-admin-01', name: 'Admin User', role: 'admin' },
        { id: 'user-agent-01', name: 'Agent User', role: 'agent' },
    ];
    localStorage.setItem('appUsers', JSON.stringify(defaultUsers));
    return defaultUsers;
};

export default function UserManagementPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You do not have permission to view this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else if (role === 'admin') {
      setUsers(getInitialUsers());
      setCurrentLogoUrl(localStorage.getItem('companyLogoUrl'));
    }
  }, [role, loading, router, toast]);

  const handleRoleChange = (userId: string, newRole: 'admin' | 'agent' | 'customer') => {
    const updatedUsers = users.map(user => 
      user.id === userId ? { ...user, role: newRole } : user
    );
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
    toast({ title: 'Success', description: `User role has been updated.` });
  };

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter(user => user.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
    toast({ title: 'User Deleted', description: `The user has been removed from the system.` });
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
        toast({ title: 'No file selected', description: 'Please select a logo file to upload.', variant: 'destructive' });
        return;
    }
    setIsUploading(true);
    toast({ title: 'Uploading Logo...', description: 'Please wait.' });

    const apiKey = '881d667e66f0b22ff45ba16e248fbcb2';
    const formData = new FormData();
    formData.append('image', logoFile);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (result.success) {
            const newLogoUrl = result.data.url;
            localStorage.setItem('companyLogoUrl', newLogoUrl);
            setCurrentLogoUrl(newLogoUrl);
            toast({ title: 'Success!', description: 'Company logo has been updated.' });
        } else {
            throw new Error(result.error?.message || 'Failed to upload image.');
        }
    } catch (error) {
        toast({ title: 'Upload Failed', description: (error as Error).message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
    }
  };

  if (loading || role !== 'admin') {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
            <CardTitle>Company Settings</CardTitle>
            <CardDescription>Manage company-wide settings like the logo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-end gap-4">
                <div className="space-y-2 flex-grow">
                    <Label htmlFor="logo-upload">Company Logo</Label>
                    <Input id="logo-upload" type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)} />
                </div>
                <Button onClick={handleLogoUpload} disabled={isUploading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Logo'}
                </Button>
            </div>
            {currentLogoUrl && (
                <div>
                    <Label>Current Logo</Label>
                    <div className="mt-2 p-4 border rounded-md flex justify-center items-center bg-muted/50">
                        <img src={currentLogoUrl} alt="Company Logo" className="max-h-20 rounded" />
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user roles and access for the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <Select value={user.role} onValueChange={(newRole: 'admin' | 'agent' | 'customer') => handleRoleChange(user.id, newRole)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="destructive" size="icon" disabled={user.role === 'admin'}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    