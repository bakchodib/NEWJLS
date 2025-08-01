
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCustomers, deleteCustomer, getLoans } from '@/lib/storage';
import type { Customer } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { role, selectedBusiness } = useAuth();
  const { toast } = useToast();
  
  const fetchCustomers = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      setIsLoading(true);
      const fetchedCustomers = await getCustomers(selectedBusiness.id);
      setCustomers(fetchedCustomers);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch customers.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedBusiness, toast]);

  useEffect(() => {
    if (selectedBusiness) {
        fetchCustomers();
    }
  }, [selectedBusiness, fetchCustomers]);

  const handleDelete = async (customerId: string) => {
    if (!selectedBusiness?.id) return;
    try {
      await deleteCustomer(selectedBusiness.id, customerId);
      await fetchCustomers(); // Refresh the list
      toast({
          title: 'Customer Deleted',
          description: 'The customer has been successfully deleted.',
      });
    } catch (error) {
      toast({
            title: 'Deletion Failed',
            description: (error as Error).message || 'Could not delete the customer.',
            variant: 'destructive',
        });
    }
  }
  
  const renderSkeleton = () => (
    Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
            <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            <TableCell><Skeleton className="h-8 w-20" /></TableCell>
        </TableRow>
    ))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer base for {selectedBusiness?.name}.</p>
        </div>
        {(role === 'admin' || role === 'agent') && (
            <Button asChild>
                <Link href="/customers/register">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Customer
                </Link>
            </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <CardDescription>A list of all registered customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                {(role === 'admin' || role === 'agent') && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? renderSkeleton() : customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                       <Avatar>
                        <AvatarImage src={customer.customerPhoto} alt={customer.name} />
                        <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                       </Avatar>
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[150px]">{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.address}</TableCell>
                    {(role === 'admin' || role === 'agent') && (
                        <TableCell className="text-right">
                           <div className="flex gap-2 justify-end">
                             <Button asChild variant="outline" size="icon">
                                <Link href={`/customers/edit/${customer.id}`}>
                                    <Pencil className="h-4 w-4"/>
                                    <span className="sr-only">Edit</span>
                                </Link>
                             </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon">
                                        <Trash2 className="h-4 w-4"/>
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the customer. You can only delete customers who do not have any loans.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(customer.id)}>
                                        Continue
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                           </div>
                        </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No customers found for this business.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
