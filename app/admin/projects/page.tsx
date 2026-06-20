import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { ProjectsTable, type ProjectRow } from "@/components/projects-table";
import { cn } from "@/lib/utils";

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    include: { _count: { select: { flats: true } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: ProjectRow[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    totalFloors: p.totalFloors,
    status: p.status,
    flatCount: p._count.flats,
  }));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/admin/projects/new" className={cn(buttonVariants())}>
          New Project
        </Link>
      </div>
      <div className="mt-6">
        <ProjectsTable data={rows} />
      </div>
    </div>
  );
}
