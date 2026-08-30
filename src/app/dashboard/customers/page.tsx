"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, Mail, Phone, ExternalLink, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  status: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch orders and extract unique customers
      const res = await fetch("/api/orders?limit=200");
      const data = await res.json();
      if (data.success) {
        const customerMap = new Map<string, Customer>();
        for (const order of data.data) {
          const email = order.billingAddress?.email || order.guestEmail || "unknown";
          const name = order.billingAddress?.name || email.split("@")[0];
          const key = email.toLowerCase();

          if (customerMap.has(key)) {
            const existing = customerMap.get(key)!;
            existing.totalOrders += 1;
            existing.totalSpent += order.total || 0;
            if (new Date(order.createdAt) > new Date(existing.lastOrderDate)) {
              existing.lastOrderDate = order.createdAt;
            }
          } else {
            customerMap.set(key, {
              _id: order.user || order._id,
              name,
              email,
              phone: order.billingAddress?.phone,
              totalOrders: 1,
              totalSpent: order.total || 0,
              lastOrderDate: order.createdAt,
              status: order.paymentStatus === "paid" ? "active" : "pending",
            });
          }
        }
        setCustomers(Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent));
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">View customer information and order history.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary">{customers.length} customers</Badge>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No customers found</h3>
          <p className="text-muted-foreground">
            {search ? "Try adjusting your search." : "No customers have placed orders yet."}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <TableRow key={customer._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.totalOrders}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${customer.totalSpent.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(customer.lastOrderDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.status === "active" ? "success" : "warning"}>
                        {customer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`mailto:${customer.email}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
