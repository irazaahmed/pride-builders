import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function CustomerProfilePage() {
  const session = await auth();
  const customerId = session!.user.id;

  const customer = await prisma.user.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    return null;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">My Profile</h1>
      <div className="mt-6 max-w-sm rounded-md border p-4 text-sm">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p>{customer.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p>{customer.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{customer.phone ?? "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
