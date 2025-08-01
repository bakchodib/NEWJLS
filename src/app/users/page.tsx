
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, KeyRound } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Label } from '@/components/ui/label';
import type { AppUser, Business } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';


const usersCollection = collection(db, 'users');

const newUserSchema = z.object({
  name: z.string().min(2, "Name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  role: z.enum(['admin', 'agent']),
  accessibleBusinessIds: z.array(z.string()).optional(),
});

const ManageAccessDialog = ({ user, allBusinesses, open, onOpenChange, onSave }: { user: AppUser | null, allBusinesses: Business[], open: boolean, onOpenChange: (open: boolean) => void, onSave: (userId: string, ids: string[]) => void }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    useEffect(() => {
        if(user) {
            setSelectedIds(user.accessibleBusinessIds || []);
        }
    }, [user]);

    if (!user) return null;

    const handleToggle = (businessId: string) => {
        setSelectedIds(prev => prev.includes(businessId) ? prev.filter(id => id !== businessId) : [...prev, businessId]);
    };
    
    const handleSave = () => {
        onSave(user.id, selectedIds);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Access for {user.name}</DialogTitle>
                    <DialogDescription>Select the businesses this user can access.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
                    {allBusinesses.map(biz => (
                        <div key={biz.id} className="flex items-center space-x-2">
                           <Checkbox
                                id={`biz-${biz.id}`}
                                checked={selectedIds.includes(biz.id)}
                                onCheckedChange={() => handleToggle(biz.id)}
                            />
                            <Label htmlFor={`biz-${biz.id}`} className="font-normal">{biz.name}</Label>
                        </div>
                    ))}
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function UserManagementPage() {
  const { user: currentUser, loading, allBusinesses } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [managingAccessFor, setManagingAccessFor] = useState<AppUser | null>(null);
  
  const form = useForm<z.infer<typeof newUserSchema>>({
    resolver: zodResolver(newUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'agent', accessibleBusinessIds: [] },
  });

  const fetchUsers = useCallback(async () => {
    try {
      const q = query(usersCollection, where("role", "in", ["admin", "agent"]));
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setUsers(fetchedUsers);
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch users from Firestore.", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    if (!loading && currentUser?.role !== 'admin') {
      toast({ title: 'Unauthorized', description: 'You do not have permission to view this page.', variant: 'destructive' });
      router.replace('/dashboard');
    } else if (currentUser?.role === 'admin') {
      fetchUsers();
    }
  }, [currentUser, loading, router, toast, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'agent') => {
    if (userId === currentUser?.uid) {
        toast({ title: "Action Forbidden", description: "You cannot change your own role.", variant: "destructive" });
        await fetchUsers();
        return;
    }
    try {
      const userDoc = doc(db, 'users', userId);
      await updateDoc(userDoc, { role: newRole });
      await fetchUsers();
      toast({ title: 'Success', description: `User role has been updated.` });
    } catch (error) {
       toast({ title: 'Error', description: `Failed to update user role.`, variant: 'destructive' });
    }
  };

  const handleAccessChange = async (userId: string, businessIds: string[]) => {
      try {
          const userDoc = doc(db, 'users', userId);
          await updateDoc(userDoc, { accessibleBusinessIds: businessIds });
          await fetchUsers();
          toast({ title: "Access Updated", description: "User's business access has been successfully updated." });
          setManagingAccessFor(null);
      } catch (error) {
          toast({ title: "Update Failed", description: "Could not update business access.", variant: "destructive" });
      }
  }

  const handleAddUser = async (values: z.infer<typeof newUserSchema>) => {
      form.formState.isSubmitting = true;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newUser = userCredential.user;

        await setDoc(doc(db, 'users', newUser.uid), {
            name: values.name,
            email: values.email,
            role: values.role,
            accessibleBusinessIds: values.accessibleBusinessIds || [],
        });

        toast({ title: "User Created", description: `${values.name} has been added as an ${values.role}.` });
        await fetchUsers(); 
        setIsAddUserOpen(false); 
        form.reset(); 
      } catch(error: any) {
          let errorMessage = "Could not create user.";
          if (error.code === 'auth/email-already-in-use') {
              errorMessage = "This email address is already in use by another account.";
          }
          toast({ title: "Creation Failed", description: errorMessage, variant: "destructive" });
      } finally {
          form.formState.isSubmitting = false;
      }
  };

  const handleDeleteUser = async (userId: string) => {
    toast({ title: "Action Disabled", description: "User deletion must be handled via a secure backend function to also delete the Firebase Auth user.", variant: "destructive" });
  };

  if (loading || currentUser?.role !== 'admin') {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user roles and business access for admins and agents.</CardDescription>
          </div>
          <Button onClick={() => setIsAddUserOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Accessible Businesses</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(newRole: 'admin' | 'agent') => handleRoleChange(u.id, newRole)} disabled={u.id === currentUser.uid}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                        </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {u.accessibleBusinessIds?.length || 0} business(es)
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button variant="outline" size="sm" onClick={() => setManagingAccessFor(u)}>
                       <KeyRound className="mr-2 h-4 w-4" /> Manage Access
                     </Button>
                     <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="destructive" size="icon" disabled={u.id === currentUser.uid}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action is for demonstration. In a real application, deleting a user from here would only remove their Firestore record, not their authentication entry. Proper deletion requires a secure backend function.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(u.id)}>
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
      
      {managingAccessFor && (
        <ManageAccessDialog 
            user={managingAccessFor}
            allBusinesses={allBusinesses}
            open={!!managingAccessFor}
            onOpenChange={() => setManagingAccessFor(null)}
            onSave={handleAccessChange}
        />
      )}

      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new Admin or Agent user. This will create a new login in Firebase Authentication.</DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleAddUser)} className="space-y-4 py-4">
                  <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" {...form.register('name')} />
                      {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
                  </div>
                   <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" {...form.register('email')} />
                      {form.formState.errors.email && <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>}
                  </div>
                   <div>
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" {...form.register('password')} />
                      {form.formState.errors.password && <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>}
                  </div>
                   <div>
                      <Label>Role</Label>
                       <Select onValueChange={(value) => form.setValue('role', value as 'admin' | 'agent')} defaultValue="agent">
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="agent">Agent</SelectItem>
                             <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  );
}
