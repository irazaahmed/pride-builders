-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "FlatType" AS ENUM ('ONE_BED_LAUNCH', 'TWO_BED_LAUNCH', 'TWO_BED_DD');

-- CreateEnum
CREATE TYPE "FlatStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'SOLD');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('MONTHLY', 'HALF_YEARLY', 'HYBRID');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InstallmentType" AS ENUM ('ADVANCE', 'MONTHLY', 'HALF_YEARLY');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalFloors" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flat" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "flatNumber" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "type" "FlatType" NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "status" "FlatStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "Flat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "flatId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "advanceAmount" DOUBLE PRECISION NOT NULL,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "planType" "PlanType" NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BookingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "InstallmentType" NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidDate" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Flat_projectId_flatNumber_key" ON "Flat"("projectId", "flatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_flatId_key" ON "Booking"("flatId");

-- AddForeignKey
ALTER TABLE "Flat" ADD CONSTRAINT "Flat_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
