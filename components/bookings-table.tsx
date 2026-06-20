"use client";

import Link from "next/link";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface BookingRow {
  id: string;
  flatLabel: string;
  customerName: string;
  totalPrice: number;
  status: string;
  bookingDate: string;
}

const columns: ColumnDef<BookingRow>[] = [
  {
    accessorKey: "flatLabel",
    header: "Flat",
    cell: ({ row }) => (
      <Link
        href={`/admin/bookings/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.flatLabel}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "Customer" },
  {
    accessorKey: "totalPrice",
    header: "Total Price",
    cell: ({ row }) => `Rs ${row.original.totalPrice.toLocaleString()}`,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
  },
  {
    accessorKey: "bookingDate",
    header: "Booking Date",
  },
];

export function BookingsTable({ data }: { data: BookingRow[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No bookings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
