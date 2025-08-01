
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Business } from '@/types';
import { deleteBusiness } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function ManageBusinessesPage() {
    const { user, loading, businesses, refreshBusinesses, setSelectedBusiness, selectedBusiness } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (!loading && user?.role !== 'admin') {
            toast({ title: 'Unauthorized', description: 'You do not have permission to view this page.', variant: 'destructive' });
            router.replace('/dashboard');
        }
    }, [user, loading, router, toast]);

    const handleDelete = async (businessId: string) => {
        if (businesses.length <= 1) {
            toast({ title: 'Action Not Allowed', description: 'You cannot delete your only business.', variant: 'destructive' });
            return;
        }
        
        try {
            await deleteBusiness(businessId);
            toast({ title: 'Business Deleted', description: 'The business and all its data have been permanently removed.' });
            
            // If the deleted business was the selected one, select a new one
            if (selectedBusiness?.id === businessId) {
                const remainingBusinesses = businesses.filter(b => b.id !== businessId);
                setSelectedBusiness(remainingBusinesses[0] || null);
            }

            await refreshBusinesses(); // Refresh the list
        } catch (error) {
            toast({ title: 'Deletion Failed', description: (error as Error).message, variant: 'destructive' });
        }
    };

    if (loading || user?.role !== 'admin') {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Businesses</h1>
                    <p className="text-muted-foreground">Edit or delete your business entities.</p>
                </div>
                <Button asChild>
                    <Link href="/business/create">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Business
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Businesses</CardTitle>
                    <CardDescription>A list of all businesses you own.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Business Name</TableHead>
                                <TableHead>Business ID</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {businesses.map((biz) => (
                                <TableRow key={biz.id}>
                                    <TableCell className="font-medium">{biz.name}</TableCell>
                                    <TableCell>{biz.id}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/business/edit/${biz.id}`}>
                                                    <Pencil className="mr-2 h-4 w-4" />
                                                    Edit
                                                </Link>
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={businesses.length <= 1}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete the business <span className="font-bold">{biz.name}</span> and all of its associated customers and loans.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(biz.id)}>
                                                            Continue
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
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
