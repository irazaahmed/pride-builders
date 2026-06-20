"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProjectAction } from "@/lib/actions/projects";

export function NewProjectForm() {
  const [error, formAction, isPending] = useActionState(createProjectAction, undefined);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" name="name" required placeholder="e.g. Pride Heights" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="totalFloors">Total floors</Label>
        <Input id="totalFloors" name="totalFloors" type="number" min={1} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Project"}
      </Button>
    </form>
  );
}
