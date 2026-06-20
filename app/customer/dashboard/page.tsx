import { format } from "date-fns";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { syncOverdueInstallments } from "@/lib/installment-sync";

export default async function CustomerDashboardPage() {
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
      <h1 className="text-2xl font-semibold">Welcome, {session!.user.name}</h1>

      {bookings.length === 0 ? (
        <p className="mt-4 text-muted-foreground">You don&apos;t have any bookings yet.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {bookings.map((booking) => {
            const paidSoFar = booking.installments.reduce((acc, i) => acc + i.paidAmount, 0);
            const remaining = booking.totalPrice - paidSoFar;
            const nextDue = booking.installments.find((i) => i.status !== "PAID");

            return (
              <div key={booking.id} className="rounded-md border p-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-medium">
                    {booking.flat.project.name} {booking.flat.flatNumber}
                  </h2>
                  <Badge variant="outline">{booking.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
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
                    <p>Rs {remaining.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Due Date</p>
                    <p>
                      {nextDue
                        ? `${format(nextDue.dueDate, "dd MMM yyyy")} (Rs ${nextDue.amount.toLocaleString()})`
                        : "All paid"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
