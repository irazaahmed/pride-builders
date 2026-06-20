import { prisma } from "@/lib/prisma";
import { BookingWizard, type FlatOption, type CustomerOption } from "./booking-wizard";

export default async function NewBookingPage() {
  const [flats, customers] = await Promise.all([
    prisma.flat.findMany({
      where: { status: "AVAILABLE" },
      include: { project: true },
      orderBy: [{ project: { name: "asc" } }, { floor: "asc" }, { flatNumber: "asc" }],
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { name: "asc" },
    }),
  ]);

  const flatOptions: FlatOption[] = flats.map((f) => ({
    id: f.id,
    flatNumber: f.flatNumber,
    floor: f.floor,
    type: f.type,
    basePrice: f.basePrice,
    projectName: f.project.name,
  }));

  const customerOptions: CustomerOption[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
  }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Nayi Booking</h1>
      <p className="mt-1 text-muted-foreground">
        Flat, customer aur deal terms select karein, phir installment plan ka preview dekhein.
      </p>
      <div className="mt-6">
        <BookingWizard flats={flatOptions} customers={customerOptions} />
      </div>
    </div>
  );
}
