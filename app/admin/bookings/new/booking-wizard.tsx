"use client";

import { useActionState, useMemo, useState } from "react";
import { format } from "date-fns";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createBookingAction } from "@/lib/actions/bookings";
import { generateScheduleAction } from "@/lib/actions/bookings";
import { createCustomerInlineAction } from "@/lib/actions/customers";
import { roundCurrency } from "@/lib/installment-engine";

export interface FlatOption {
  id: string;
  flatNumber: string;
  floor: number;
  type: string;
  basePrice: number;
  projectName: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  email: string;
  /** The flat they currently hold, if any (e.g. "Dummy Pride 101") - helps tell apart customers who share a name. */
  flatLabel?: string | null;
}

interface ScheduleRow {
  type: string;
  status: string;
  dueDate: string; // ISO
  amount: number;
  paidAmount: number;
  paidDate: string | null;
}

const PLAN_TYPES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "HALF_YEARLY", label: "Half Yearly" },
  { value: "HYBRID", label: "Hybrid" },
];

const NEW_CUSTOMER = "__new__";

export function BookingWizard({
  flats,
  customers,
}: {
  flats: FlatOption[];
  customers: CustomerOption[];
}) {
  const [bookingDate] = useState(() => new Date());
  const [step, setStep] = useState<"terms" | "preview">("terms");

  const [flatId, setFlatId] = useState("");
  const [customerSelectValue, setCustomerSelectValue] = useState("");
  const [allCustomers, setAllCustomers] = useState(customers);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [totalPrice, setTotalPrice] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [planType, setPlanType] = useState<"MONTHLY" | "HALF_YEARLY" | "HYBRID">("MONTHLY");
  const [durationMonths, setDurationMonths] = useState("60");
  const [hybridHalfYearlyCount, setHybridHalfYearlyCount] = useState("2");

  const [genError, setGenError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);

  const [saveError, formAction, isSaving] = useActionState(createBookingAction, undefined);

  const selectedFlat = flats.find((f) => f.id === flatId);

  const remainingAmount = useMemo(() => {
    const total = Number(totalPrice) || 0;
    const advance = Number(advanceAmount) || 0;
    return roundCurrency(total - advance);
  }, [totalPrice, advanceAmount]);

  const previewSum = useMemo(
    () =>
      roundCurrency(
        schedule.filter((r) => r.type !== "ADVANCE").reduce((acc, r) => acc + r.amount, 0)
      ),
    [schedule]
  );
  const sumMatches = Math.abs(previewSum - remainingAmount) < 0.01;

  function handleFlatChange(value: string) {
    setFlatId(value);
    const flat = flats.find((f) => f.id === value);
    if (flat) setTotalPrice(String(flat.basePrice));
  }

  async function handleCreateCustomer() {
    setCustomerError(null);
    setCreatingCustomer(true);
    try {
      const result = await createCustomerInlineAction(newCustomer);
      if (result.error) {
        setCustomerError(result.error);
        return;
      }
      if (result.customer) {
        setAllCustomers((prev) => [...prev, result.customer]);
        setCustomerSelectValue(result.customer.id);
        setNewCustomer({ name: "", email: "", phone: "", password: "" });
      }
    } finally {
      setCreatingCustomer(false);
    }
  }

  async function handleGeneratePreview() {
    setGenError(null);

    if (!flatId) {
      setGenError("Please select a flat.");
      return;
    }
    if (!customerSelectValue || customerSelectValue === NEW_CUSTOMER) {
      setGenError("Please select a customer or create a new one.");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateScheduleAction({
        totalPrice,
        advanceAmount,
        planType,
        durationMonths,
        bookingDate,
        hybridHalfYearlyCount: planType === "HYBRID" ? hybridHalfYearlyCount : undefined,
      });

      if (result.error) {
        setGenError(result.error);
        return;
      }

      setSchedule(
        (result.schedule ?? []).map((row) => ({
          type: row.type,
          status: row.status,
          dueDate: new Date(row.dueDate).toISOString(),
          amount: row.amount,
          paidAmount: row.paidAmount,
          paidDate: row.paidDate ? new Date(row.paidDate).toISOString() : null,
        }))
      );
      setStep("preview");
    } finally {
      setGenerating(false);
    }
  }

  function updateAmount(index: number, value: string) {
    setSchedule((prev) =>
      prev.map((row, i) => (i === index ? { ...row, amount: Number(value) || 0 } : row))
    );
  }

  if (step === "terms") {
    return (
      <div className="flex max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Flat</Label>
          <Select
            value={flatId}
            onValueChange={(value) => {
              if (value) handleFlatChange(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose an available flat" />
            </SelectTrigger>
            <SelectContent>
              {flats.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.projectName} - {f.flatNumber} - {f.type} - Rs{" "}
                  {f.basePrice.toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Customer</Label>
          <Select
            value={customerSelectValue}
            onValueChange={(value) => {
              if (value) setCustomerSelectValue(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a customer" />
            </SelectTrigger>
            <SelectContent>
              {allCustomers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.email}){c.flatLabel ? ` - Flat ${c.flatLabel}` : ""}
                </SelectItem>
              ))}
              <SelectItem value={NEW_CUSTOMER}>+ Create New Customer</SelectItem>
            </SelectContent>
          </Select>

          {customerSelectValue === NEW_CUSTOMER && (
            <div className="mt-2 flex flex-col gap-3 rounded-md border p-4">
              <Input
                placeholder="Name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                placeholder="Email"
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
              />
              <Input
                placeholder="Phone (optional)"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((p) => ({ ...p, phone: e.target.value }))}
              />
              <Input
                placeholder="Password"
                type="password"
                value={newCustomer.password}
                onChange={(e) => setNewCustomer((p) => ({ ...p, password: e.target.value }))}
              />
              {customerError && <p className="text-sm text-destructive">{customerError}</p>}
              <Button type="button" onClick={handleCreateCustomer} disabled={creatingCustomer}>
                {creatingCustomer ? "Creating..." : "Create Customer"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label>Total Price (Rs)</Label>
            <Input
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Advance Amount (Rs)</Label>
            <Input
              type="number"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Plan Type</Label>
            <Select
              value={planType}
              onValueChange={(value) => {
                if (value === "MONTHLY" || value === "HALF_YEARLY" || value === "HYBRID") {
                  setPlanType(value);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_TYPES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Duration (months)</Label>
            <Input
              type="number"
              min={1}
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
            />
          </div>
          {planType === "HYBRID" && (
            <div className="flex flex-col gap-2">
              <Label>Number of half-yearly installments (every 6 months)</Label>
              <Input
                type="number"
                min={0}
                value={hybridHalfYearlyCount}
                onChange={(e) => setHybridHalfYearlyCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Monthly installments run from month 1 throughout the full duration. Every
                6th month gets a half-yearly installment instead of that month&apos;s
                monthly one - everything else stays monthly in parallel.
              </p>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Remaining amount (after advance): Rs {remainingAmount.toLocaleString()}
        </p>

        {genError && <p className="text-sm text-destructive">{genError}</p>}

        <div>
          <Button type="button" onClick={handleGeneratePreview} disabled={generating}>
            {generating ? "Generating..." : "Generate Preview"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="rounded-md border p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Flat:</span> {selectedFlat?.projectName}{" "}
          {selectedFlat?.flatNumber} ({selectedFlat?.type})
        </p>
        <p>
          <span className="text-muted-foreground">Total:</span> Rs{" "}
          {Number(totalPrice).toLocaleString()} -{" "}
          <span className="text-muted-foreground">Advance:</span> Rs{" "}
          {Number(advanceAmount).toLocaleString()} -{" "}
          <span className="text-muted-foreground">Remaining:</span> Rs{" "}
          {remainingAmount.toLocaleString()}
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount (Rs)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((row, index) => (
              <TableRow key={index}>
                <TableCell>{row.type}</TableCell>
                <TableCell>{format(new Date(row.dueDate), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  {row.type === "ADVANCE" ? (
                    row.amount.toLocaleString()
                  ) : (
                    <Input
                      type="number"
                      value={row.amount}
                      onChange={(e) => updateAmount(index, e.target.value)}
                      className="w-32"
                    />
                  )}
                </TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className={sumMatches ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
        Installments total: Rs {previewSum.toLocaleString()} / Rs{" "}
        {remainingAmount.toLocaleString()} {sumMatches ? "(matches)" : "(does not match)"}
      </p>

      <form action={formAction} className="flex items-center gap-3">
        <input type="hidden" name="flatId" value={flatId} />
        <input type="hidden" name="customerId" value={customerSelectValue} />
        <input type="hidden" name="totalPrice" value={totalPrice} />
        <input type="hidden" name="advanceAmount" value={advanceAmount} />
        <input type="hidden" name="planType" value={planType} />
        <input type="hidden" name="durationMonths" value={durationMonths} />
        <input type="hidden" name="bookingDate" value={bookingDate.toISOString()} />
        <input
          type="hidden"
          name="hybridHalfYearlyCount"
          value={planType === "HYBRID" ? hybridHalfYearlyCount : ""}
        />
        <input type="hidden" name="installments" value={JSON.stringify(schedule)} />

        <Button type="button" variant="outline" onClick={() => setStep("terms")}>
          Back
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Confirm & Save Booking"}
        </Button>
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </form>
    </div>
  );
}
