import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/actions/auth";

export default async function CustomerDashboardPage() {
  const session = await auth();

  if (session?.user?.role !== "CUSTOMER") {
    redirect("/login");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Customer Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome, {session.user.name} ({session.user.role})
      </p>
      <form action={signOutAction} className="mt-6">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
