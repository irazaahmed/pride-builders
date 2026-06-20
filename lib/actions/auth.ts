"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function loginAction(_prevState: string | undefined, formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return "Email aur password darj karein.";
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const redirectTo = user?.role === "ADMIN" ? "/admin/dashboard" : "/customer/dashboard";

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Email ya password ghalat hai.";
    }
    throw error;
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
