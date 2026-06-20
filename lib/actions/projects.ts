"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { generateFlats } from "@/lib/flat-generator";
import { FlatType } from "@/app/generated/prisma/client";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project ka naam likhain."),
  totalFloors: z.coerce.number().int().min(1, "Kam az kam 1 floor honi chahiye.").max(200),
});

export async function createProjectAction(
  _prevState: string | undefined,
  formData: FormData
) {
  await requireAdmin();

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    totalFloors: formData.get("totalFloors"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const project = await prisma.project.create({
    data: parsed.data,
  });

  redirect(`/admin/projects/${project.id}`);
}

const compositionRowSchema = z.object({
  type: z.enum(FlatType),
  count: z.coerce.number().int().min(1),
  basePrice: z.coerce.number().positive(),
});

const generateFlatsSchema = z.object({
  projectId: z.string().min(1),
  composition: z.array(compositionRowSchema).min(1, "Kam az kam ek flat type add karein."),
});

export async function generateFlatsAction(
  _prevState: string | undefined,
  formData: FormData
) {
  await requireAdmin();

  let compositionJson: unknown;
  try {
    const raw = formData.get("composition");
    compositionJson = JSON.parse(typeof raw === "string" ? raw : "[]");
  } catch {
    return "Flat structure ka format ghalat hai.";
  }

  const parsed = generateFlatsSchema.safeParse({
    projectId: formData.get("projectId"),
    composition: compositionJson,
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    include: { _count: { select: { flats: true } } },
  });

  if (!project) {
    return "Project nahi mila.";
  }

  if (project._count.flats > 0) {
    return "Is project ke flats pehle hi generate ho chuke hain.";
  }

  const generated = generateFlats(project.totalFloors, parsed.data.composition);

  await prisma.flat.createMany({
    data: generated.map((flat) => ({
      ...flat,
      projectId: project.id,
    })),
  });

  redirect(`/admin/projects/${project.id}`);
}
