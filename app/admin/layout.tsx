import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import { BRAND_NAME } from "@/lib/config";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-svh">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">{BRAND_NAME} Admin</span>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/admin/dashboard"
              className="text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/projects"
              className="text-muted-foreground hover:text-foreground"
            >
              Projects
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
