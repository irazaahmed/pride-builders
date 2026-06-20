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
  /**
   * Required when planType is HYBRID: how many half-yearly installments occur
   * (every 6th month) in parallel with the monthly installments running for the
   * rest of the duration.
   */
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

  // HYBRID: monthly installments run every month starting the month after booking,
  // in parallel with half-yearly installments every 6 months. A month that lands on
  // a half-yearly due date gets ONLY the half-yearly installment that month, not both.
  //
  // A half-yearly installment is worth 6x a monthly one, so with H half-yearly months
  // and M = durationMonths - H monthly months, the total "weight" is 6H + M, i.e.
  // durationMonths + 5H. Solving weight * monthlyAmount = remainingAmount keeps the
  // total exact even though half-yearly months don't also carry a monthly payment.
  const halfYearlyCount = input.hybridHalfYearlyCount ?? 0;
  const halfYearlyMonthSet = new Set(
    Array.from({ length: halfYearlyCount }, (_, i) => (i + 1) * 6)
  );

  const totalWeight = durationMonths + 5 * halfYearlyCount;
  const monthlyAmount = totalWeight > 0 ? remainingAmount / totalWeight : 0;
  const halfYearlyAmount = monthlyAmount * 6;

  const slots: { month: number; type: InstallmentType; amount: number }[] = [];
  for (let month = 1; month <= durationMonths; month++) {
    if (halfYearlyMonthSet.has(month)) {
      slots.push({ month, type: "HALF_YEARLY", amount: roundCurrency(halfYearlyAmount) });
    } else {
      slots.push({ month, type: "MONTHLY", amount: roundCurrency(monthlyAmount) });
    }
  }

  if (slots.length > 0) {
    const allocated = slots
      .slice(0, -1)
      .reduce((acc, s) => roundCurrency(acc + s.amount), 0);
    slots[slots.length - 1].amount = roundCurrency(remainingAmount - allocated);
  }

  const hybridInstallments: DraftInstallment[] = slots.map((s) => ({
    type: s.type,
    status: "PENDING",
    dueDate: addMonths(bookingDate, s.month),
    amount: s.amount,
    paidAmount: 0,
    paidDate: null,
  }));

  return [advance, ...hybridInstallments];
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
