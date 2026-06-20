import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/auth";
import { BRAND_NAME } from "@/lib/config";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin/dashboard" : "/customer/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{BRAND_NAME}</CardTitle>
          <CardDescription>Apne account mein login karein</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
