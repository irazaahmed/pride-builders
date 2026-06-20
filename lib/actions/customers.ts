"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";

const createCustomerSchema = z.object({
  name: z.string().min(1, "Naam likhain."),
  email: z.string().email("Sahi email likhain."),
  phone: z.string().optional(),
  password: z.string().min(6, "Password kam az kam 6 characters ka ho."),
});

export async function createCustomerInlineAction(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<
  | { error: string; customer?: undefined }
  | { error?: undefined; customer: { id: string; name: string; email: string } }
> {
  await requireAdmin();

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "Is email se pehle hi account mojood hai." };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  const customer = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      password: hashedPassword,
      role: "CUSTOMER",
    },
  });

  return {
    customer: { id: customer.id, name: customer.name, email: customer.email },
  };
}
