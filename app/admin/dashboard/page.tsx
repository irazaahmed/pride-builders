import { auth } from "@/auth";

export default async function AdminDashboardPage() {
  const session = await auth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome, {session?.user?.name} ({session?.user?.role})
      </p>
    </div>
  );
}
