import { cn } from "@/lib/utils";

interface FlatItem {
  id: string;
  floor: number;
  flatNumber: string;
  type: string;
  status: string;
  basePrice: number;
}

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  BOOKED: "bg-amber-100 text-amber-800 border-amber-300",
  SOLD: "bg-red-100 text-red-800 border-red-300",
};

export function FlatGrid({ flats }: { flats: FlatItem[] }) {
  const floors = Array.from(new Set(flats.map((f) => f.floor))).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-6">
      {floors.map((floor) => {
        const floorFlats = flats
          .filter((f) => f.floor === floor)
          .sort((a, b) => a.flatNumber.localeCompare(b.flatNumber));

        return (
          <div key={floor}>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Floor {floor}</h3>
            <div className="flex flex-wrap gap-2">
              {floorFlats.map((flat) => (
                <div
                  key={flat.id}
                  className={cn(
                    "flex w-24 flex-col items-center rounded-md border px-2 py-2 text-xs",
                    STATUS_STYLES[flat.status]
                  )}
                  title={`${flat.type} - Rs ${flat.basePrice.toLocaleString()}`}
                >
                  <span className="font-semibold">{flat.flatNumber}</span>
                  <span className="text-[10px]">{flat.status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
