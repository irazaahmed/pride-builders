import { format } from "date-fns";
import { auth } from "@/auth";
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
import { syncOverdueInstallments } from "@/lib/installment-sync";

export default async function CustomerLedgerPage() {
  const session = await auth();
  const customerId = session!.user.id;

  await syncOverdueInstallments();

  const bookings = await prisma.booking.findMany({
    where: { customerId },
    include: {
      flat: { include: { project: true } },
      installments: { orderBy: { dueDate: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Payment Ledger</h1>

      {bookings.length === 0 ? (
        <p className="mt-4 text-muted-foreground">You don&apos;t have any bookings yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {bookings.map((booking) => (
            <div key={booking.id}>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-medium">
                  {booking.flat.project.name} {booking.flat.flatNumber}
                </h2>
                <Badge variant="outline">{booking.status}</Badge>
              </div>
              <div className="mt-3 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Paid Date</TableHead>
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
                          {i.paidDate ? format(i.paidDate, "dd MMM yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{i.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
