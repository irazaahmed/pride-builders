import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { FlatGrid } from "@/components/flat-grid";
import { FlatCompositionForm } from "./flat-composition-form";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { flats: { orderBy: [{ floor: "asc" }, { flatNumber: "asc" }] } },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <Badge variant="outline">{project.status}</Badge>
      </div>
      <p className="mt-1 text-muted-foreground">
        {project.totalFloors} floors - {project.flats.length} flats
      </p>

      <div className="mt-8">
        {project.flats.length === 0 ? (
          <FlatCompositionForm projectId={project.id} />
        ) : (
          <>
            <div className="mb-4 flex gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-emerald-400 bg-emerald-200" />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-200" />
                Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm border border-red-400 bg-red-200" />
                Sold
              </span>
            </div>
            <FlatGrid flats={project.flats} />
          </>
        )}
      </div>
    </div>
  );
}
