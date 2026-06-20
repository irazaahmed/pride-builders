import type { FlatType } from "@/app/generated/prisma/client";

export interface FlatComposition {
  type: FlatType;
  count: number;
  basePrice: number;
}

export interface GeneratedFlat {
  floor: number;
  flatNumber: string;
  type: FlatType;
  basePrice: number;
}

/**
 * Applies the same flat-type composition to every floor of a project.
 * Flat numbers follow floor*100 + sequence, e.g. floor 1 -> 101..110, floor 2 -> 201..210.
 */
export function generateFlats(
  totalFloors: number,
  composition: FlatComposition[]
): GeneratedFlat[] {
  const flats: GeneratedFlat[] = [];

  for (let floor = 1; floor <= totalFloors; floor++) {
    let seq = 1;
    for (const { type, count, basePrice } of composition) {
      for (let i = 0; i < count; i++) {
        flats.push({
          floor,
          flatNumber: `${floor}${String(seq).padStart(2, "0")}`,
          type,
          basePrice,
        });
        seq++;
      }
    }
  }

  return flats;
}
