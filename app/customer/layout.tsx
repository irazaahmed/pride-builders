import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import { BRAND_NAME } from "@/lib/config";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "CUSTOMER") {
    redirect("/login");
  }

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">{BRAND_NAME}</span>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/customer/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/customer/ledger"
              className="text-muted-foreground hover:text-foreground"
            >
              Ledger
            </Link>
            <Link
              href="/customer/profile"
              className="text-muted-foreground hover:text-foreground"
            >
              Profile
            </Link>
          </nav>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
