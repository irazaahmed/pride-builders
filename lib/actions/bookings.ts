"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import {
  generateInstallmentSchedule,
  validateInstallmentSum,
  roundCurrency,
} from "@/lib/installment-engine";
import {
  PlanType,
  InstallmentType,
  InstallmentStatus,
} from "@/app/generated/prisma/client";

const dealTermsSchema = z
  .object({
    totalPrice: z.coerce.number().positive("Total price likhain."),
    advanceAmount: z.coerce.number().min(0, "Advance amount likhain."),
    planType: z.enum(PlanType),
    durationMonths: z.coerce.number().int().min(1, "Duration kam az kam 1 month."),
    bookingDate: z.coerce.date(),
    hybridHalfYearlyCount: z.coerce.number().int().min(0).optional(),
  })
  .refine((d) => d.advanceAmount <= d.totalPrice, {
    message: "Advance, total price se zyada nahi ho sakta.",
    path: ["advanceAmount"],
  })
  .refine(
    (d) => {
      if (d.planType !== "HYBRID") return true;
      return (d.hybridHalfYearlyCount ?? 0) * 6 <= d.durationMonths;
    },
    {
      message: "Half-yearly installments ki tadaad duration se zyada nahi ho sakti.",
      path: ["hybridHalfYearlyCount"],
    }
  );

export async function generateScheduleAction(
  input: z.input<typeof dealTermsSchema>
) {
  await requireAdmin();

  const parsed = dealTermsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const schedule = generateInstallmentSchedule(parsed.data);
  return { schedule };
}

const installmentRowSchema = z.object({
  type: z.enum(InstallmentType),
  status: z.enum(InstallmentStatus),
  dueDate: z.coerce.date(),
  amount: z.coerce.number(),
  paidAmount: z.coerce.number(),
  paidDate: z.coerce.date().nullable(),
  note: z.string().nullable().optional(),
});

const createBookingSchema = dealTermsSchema.and(
  z.object({
    flatId: z.string().min(1),
    customerId: z.string().min(1),
    installments: z.array(installmentRowSchema).min(1),
  })
);

export async function createBookingAction(
  _prevState: string | undefined,
  formData: FormData
) {
  await requireAdmin();

  let installmentsJson: unknown;
  try {
    const raw = formData.get("installments");
    installmentsJson = JSON.parse(typeof raw === "string" ? raw : "[]");
  } catch {
    return "Installment data ka format ghalat hai.";
  }

  const parsed = createBookingSchema.safeParse({
    flatId: formData.get("flatId"),
    customerId: formData.get("customerId"),
    totalPrice: formData.get("totalPrice"),
    advanceAmount: formData.get("advanceAmount"),
    planType: formData.get("planType"),
    durationMonths: formData.get("durationMonths"),
    bookingDate: formData.get("bookingDate"),
    hybridHalfYearlyCount: formData.get("hybridHalfYearlyCount") || undefined,
    installments: installmentsJson,
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const {
    flatId,
    customerId,
    totalPrice,
    advanceAmount,
    planType,
    durationMonths,
    bookingDate,
    installments,
  } = parsed.data;

  const remainingAmount = roundCurrency(totalPrice - advanceAmount);

  if (!validateInstallmentSum(remainingAmount, installments)) {
    return `Installments ka total Rs ${remainingAmount.toLocaleString()} ke barabar hona chahiye.`;
  }

  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  if (!flat) {
    return "Flat nahi mila.";
  }
  if (flat.status !== "AVAILABLE") {
    return "Yeh flat ab available nahi hai.";
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        flatId,
        customerId,
        totalPrice,
        advanceAmount,
        remainingAmount,
        planType,
        durationMonths,
        bookingDate,
        installments: {
          create: installments.map((i) => ({
            type: i.type,
            status: i.status,
            dueDate: i.dueDate,
            amount: i.amount,
            paidAmount: i.paidAmount,
            paidDate: i.paidDate,
            note: i.note ?? null,
          })),
        },
      },
    });

    await tx.flat.update({
      where: { id: flatId },
      data: { status: "BOOKED" },
    });

    return created;
  });

  redirect(`/admin/bookings/${booking.id}`);
}
