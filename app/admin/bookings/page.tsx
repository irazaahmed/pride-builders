import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingsTable, type BookingRow } from "@/components/bookings-table";
import { BookingFilters } from "./booking-filters";
import type { BookingStatus } from "@/app/generated/prisma/client";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; projectId?: string; customerId?: string }>;
}) {
  const { status, projectId, customerId } = await searchParams;

  const [bookings, projects, customers] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...(status ? { status: status as BookingStatus } : {}),
        ...(customerId ? { customerId } : {}),
        ...(projectId ? { flat: { projectId } } : {}),
      },
      include: { flat: { include: { project: true } }, customer: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { name: "asc" } }),
  ]);

  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    flatLabel: `${b.flat.project.name} ${b.flat.flatNumber}`,
    customerName: b.customer.name,
    totalPrice: b.totalPrice,
    status: b.status,
    bookingDate: b.bookingDate.toISOString().slice(0, 10),
  }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <Link href="/admin/bookings/new" className={cn(buttonVariants())}>
          Nayi Booking
        </Link>
      </div>
      <div className="mt-4">
        <BookingFilters projects={projects} customers={customers} />
      </div>
      <div className="mt-6">
        <BookingsTable data={rows} />
      </div>
    </div>
  );
}
