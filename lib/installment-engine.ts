import { addMonths } from "date-fns";
import type {
  InstallmentType,
  InstallmentStatus,
  PlanType,
} from "@/app/generated/prisma/client";

export interface DraftInstallment {
  type: InstallmentType;
  status: InstallmentStatus;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  paidDate: Date | null;
  note?: string | null;
}

export interface GenerateScheduleInput {
  totalPrice: number;
  advanceAmount: number;
  planType: PlanType;
  durationMonths: number;
  bookingDate: Date;
  /** Required when planType is HYBRID: how many half-yearly installments come first. */
  hybridHalfYearlyCount?: number;
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Splits `amount` across `count` equal slots (rounded to 2 decimals), folding any
 * rounding remainder into the last slot so the slots always sum to exactly `amount`.
 * Due dates land every `monthsPerSlot` months, starting `monthOffset + monthsPerSlot`
 * months after `startDate`.
 */
function distribute(
  amount: number,
  count: number,
  monthsPerSlot: number,
  startDate: Date,
  monthOffset: number,
  type: InstallmentType
): DraftInstallment[] {
  if (count <= 0) return [];

  const perSlot = roundCurrency(amount / count);
  const installments: DraftInstallment[] = [];
  let allocated = 0;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const slotAmount = isLast ? roundCurrency(amount - allocated) : perSlot;
    allocated = roundCurrency(allocated + slotAmount);

    installments.push({
      type,
      status: "PENDING",
      dueDate: addMonths(startDate, monthOffset + (i + 1) * monthsPerSlot),
      amount: slotAmount,
      paidAmount: 0,
      paidDate: null,
    });
  }

  return installments;
}

export function generateInstallmentSchedule(
  input: GenerateScheduleInput
): DraftInstallment[] {
  const { totalPrice, advanceAmount, planType, durationMonths, bookingDate } = input;
  const remainingAmount = roundCurrency(totalPrice - advanceAmount);

  const advance: DraftInstallment = {
    type: "ADVANCE",
    status: "PAID",
    dueDate: bookingDate,
    amount: roundCurrency(advanceAmount),
    paidAmount: roundCurrency(advanceAmount),
    paidDate: bookingDate,
  };

  if (planType === "MONTHLY") {
    return [
      advance,
      ...distribute(remainingAmount, durationMonths, 1, bookingDate, 0, "MONTHLY"),
    ];
  }

  if (planType === "HALF_YEARLY") {
    const count = Math.max(1, Math.round(durationMonths / 6));
    return [
      advance,
      ...distribute(remainingAmount, count, 6, bookingDate, 0, "HALF_YEARLY"),
    ];
  }

  // HYBRID: a fixed number of half-yearly installments first, then monthly for the rest.
  // Both groups share the same underlying monthly rate (remainingAmount / durationMonths)
  // so a half-yearly installment is simply 6x a monthly one.
  const halfYearlyCount = input.hybridHalfYearlyCount ?? 0;
  const halfYearlyMonths = halfYearlyCount * 6;
  const monthlyCount = Math.max(0, durationMonths - halfYearlyMonths);
  const monthlyUnit = durationMonths > 0 ? remainingAmount / durationMonths : 0;
  const halfYearlyAmount = roundCurrency(monthlyUnit * 6 * halfYearlyCount);
  const monthlyAmount = roundCurrency(remainingAmount - halfYearlyAmount);

  const halfYearlyInstallments = distribute(
    halfYearlyAmount,
    halfYearlyCount,
    6,
    bookingDate,
    0,
    "HALF_YEARLY"
  );
  const monthlyInstallments = distribute(
    monthlyAmount,
    monthlyCount,
    1,
    bookingDate,
    halfYearlyMonths,
    "MONTHLY"
  );

  return [advance, ...halfYearlyInstallments, ...monthlyInstallments];
}

export function sumNonAdvanceInstallments(
  installments: { type: string; amount: number }[]
): number {
  return roundCurrency(
    installments
      .filter((i) => i.type !== "ADVANCE")
      .reduce((acc, i) => acc + i.amount, 0)
  );
}

export function validateInstallmentSum(
  remainingAmount: number,
  installments: { type: string; amount: number }[]
): boolean {
  return (
    Math.abs(sumNonAdvanceInstallments(installments) - roundCurrency(remainingAmount)) < 0.01
  );
}
