"use client";

import { useActionState, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordPaymentAction } from "@/lib/actions/payments";

export function RecordPaymentDialog({
  installmentId,
  remainingDue,
}: {
  installmentId: string;
  remainingDue: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, formAction, isPending] = useActionState(recordPaymentAction, undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        Record Payment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="installmentId" value={installmentId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount (Rs)</Label>
            <Input
              id="amount"
              type="number"
              name="amount"
              step="0.01"
              max={remainingDue}
              defaultValue={remainingDue}
              required
            />
            <p className="text-xs text-muted-foreground">
              Remaining due: Rs {remainingDue.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="paidDate">Payment Date</Label>
            <Input id="paidDate" type="date" name="paidDate" defaultValue={today} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" placeholder="e.g. paid via bank transfer" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
