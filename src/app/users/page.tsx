
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type AppUser = {
  id: string;
  name: string;
  role: 'admin' | 'agent' | 'customer';
};

// NOTE: This component assumes a 'users' collection exists in Firestore.
// You need to manually create this collection and add documents for admin/agent users.
// e.g., { name: "Admin User", role: "admin" }, { name: "Agent User", role: "agent" }
// Customer roles are not managed here; they are derived from the main customer list.

const usersCollection = collection(db, 'users');

export default function UserManagementPage() {
  const { role, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  
  const fetchUsers = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(usersCollection);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch users from Firestore.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (!loading && role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You do not have permission to view this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else if (role === 'admin') {
      fetchUsers();
    }
  }, [role, loading, router, toast, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'agent' | 'customer') => {
    try {
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, { role: newRole });
      await fetchUsers();
      toast({ title: 'Success', description: `User role has been updated.` });
    } catch (error) {
       toast({ title: 'Error', description: `Failed to update user role.`, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      await fetchUsers();
      toast({ title: 'User Deleted', description: `The user has been removed from the system.` });
    } catch (error) {
       toast({ title: 'Error', description: `Failed to delete user.`, variant: 'destructive' });
    }
  };

  if (loading || role !== 'admin') {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage user roles for admins and agents. Customer roles are handled automatically.</CardDescription>
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
                            <SelectItem value="customer" disabled>Customer (Managed via Customer list)</SelectItem>
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
