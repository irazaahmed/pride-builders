"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { roundCurrency } from "@/lib/installment-engine";

const recordPaymentSchema = z.object({
  installmentId: z.string().min(1),
  amount: z.coerce.number().positive("Please enter a payment amount."),
  paidDate: z.coerce.date(),
  note: z.string().optional(),
});

export async function recordPaymentAction(
  _prevState: string | undefined,
  formData: FormData
) {
  await requireAdmin();

  const parsed = recordPaymentSchema.safeParse({
    installmentId: formData.get("installmentId"),
    amount: formData.get("amount"),
    paidDate: formData.get("paidDate"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const installment = await prisma.installment.findUnique({
    where: { id: parsed.data.installmentId },
    include: { booking: true },
  });

  if (!installment) {
    return "Installment not found.";
  }

  if (installment.status === "PAID") {
    return "This installment is already fully paid.";
  }

  const remainingDue = roundCurrency(installment.amount - installment.paidAmount);
  if (parsed.data.amount > remainingDue + 0.01) {
    return `Payment cannot exceed the remaining due amount of Rs ${remainingDue.toLocaleString()}.`;
  }

  const newPaidAmount = roundCurrency(installment.paidAmount + parsed.data.amount);
  const isFullyPaid = newPaidAmount >= installment.amount - 0.01;

  await prisma.$transaction(async (tx) => {
    await tx.installment.update({
      where: { id: installment.id },
      data: {
        paidAmount: newPaidAmount,
        status: isFullyPaid ? "PAID" : installment.status,
        paidDate: isFullyPaid ? parsed.data.paidDate : installment.paidDate,
        note: parsed.data.note ?? installment.note,
      },
    });

    if (isFullyPaid) {
      const remainingUnpaid = await tx.installment.count({
        where: {
          bookingId: installment.bookingId,
          status: { not: "PAID" },
          id: { not: installment.id },
        },
      });

      if (remainingUnpaid === 0) {
        await tx.booking.update({
          where: { id: installment.bookingId },
          data: { status: "COMPLETED" },
        });
        await tx.flat.update({
          where: { id: installment.booking.flatId },
          data: { status: "SOLD" },
        });
      }
    }
  });

  redirect(`/admin/bookings/${installment.bookingId}`);
}
