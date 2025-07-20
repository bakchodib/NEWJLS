'use client';

import { useEffect, useState } from 'react';
import { getCustomers } from '@/lib/storage';
import type { Customer } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { role } = useAuth();
  
  useEffect(() => {
    setCustomers(getCustomers());
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer base.</p>
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
                <TableHead>Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.id}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.address}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    No customers found.
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
