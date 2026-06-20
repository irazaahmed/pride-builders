import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      flat: { include: { project: true } },
      customer: true,
      installments: { orderBy: { dueDate: "asc" } },
    },
  });

  if (!booking) {
    notFound();
  }

  const paidSoFar = booking.installments.reduce((acc, i) => acc + i.paidAmount, 0);

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {booking.flat.project.name} {booking.flat.flatNumber}
        </h1>
        <Badge variant="outline">{booking.status}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 rounded-md border p-4 text-sm md:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Customer</p>
          <p>{booking.customer.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Price</p>
          <p>Rs {booking.totalPrice.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Paid So Far</p>
          <p>Rs {paidSoFar.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Remaining</p>
          <p>Rs {(booking.totalPrice - paidSoFar).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Plan</p>
          <p>{booking.planType}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Duration</p>
          <p>{booking.durationMonths} months</p>
        </div>
        <div>
          <p className="text-muted-foreground">Booking Date</p>
          <p>{format(booking.bookingDate, "dd MMM yyyy")}</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-medium">Installment Ledger</h2>
      <div className="mt-3 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {booking.installments.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.type}</TableCell>
                <TableCell>{format(i.dueDate, "dd MMM yyyy")}</TableCell>
                <TableCell>Rs {i.amount.toLocaleString()}</TableCell>
                <TableCell>Rs {i.paidAmount.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline">{i.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
