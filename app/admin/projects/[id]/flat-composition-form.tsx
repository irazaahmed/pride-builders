"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateFlatsAction } from "@/lib/actions/projects";

const FLAT_TYPES = [
  { value: "TWO_BED_DD", label: "2 Bed DD" },
  { value: "TWO_BED_LAUNCH", label: "2 Bed Launch" },
  { value: "ONE_BED_LAUNCH", label: "1 Bed Launch" },
];

interface Row {
  type: string;
  count: string;
  basePrice: string;
}

export function FlatCompositionForm({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[]>([{ type: "TWO_BED_DD", count: "", basePrice: "" }]);
  const [error, formAction, isPending] = useActionState(generateFlatsAction, undefined);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { type: "TWO_BED_DD", count: "", basePrice: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const compositionJson = JSON.stringify(
    rows.map((r) => ({
      type: r.type,
      count: Number(r.count),
      basePrice: Number(r.basePrice),
    }))
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="composition" value={compositionJson} />

      <p className="text-sm text-muted-foreground">
        This flat structure will repeat on every floor.
      </p>

      {rows.map((row, index) => (
        <div key={index} className="flex items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label>Flat type</Label>
            <Select
              value={row.type}
              onValueChange={(value) => {
                if (value) updateRow(index, { type: value });
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLAT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Count per floor</Label>
            <Input
              type="number"
              min={1}
              value={row.count}
              onChange={(e) => updateRow(index, { count: e.target.value })}
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Base price (Rs)</Label>
            <Input
              type="number"
              min={0}
              value={row.basePrice}
              onChange={(e) => updateRow(index, { basePrice: e.target.value })}
              className="w-40"
            />
          </div>
          {rows.length > 1 && (
            <Button type="button" variant="ghost" onClick={() => removeRow(index)}>
              Remove
            </Button>
          )}
        </div>
      ))}

      <div>
        <Button type="button" variant="outline" onClick={addRow}>
          + Add flat type
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Generating..." : "Generate Flats"}
        </Button>
      </div>
    </form>
  );
}
