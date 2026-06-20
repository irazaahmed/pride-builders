import { prisma } from "@/lib/prisma";

/** Marks any PENDING installment whose due date has passed as OVERDUE. */
export async function syncOverdueInstallments() {
  await prisma.installment.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });
}
