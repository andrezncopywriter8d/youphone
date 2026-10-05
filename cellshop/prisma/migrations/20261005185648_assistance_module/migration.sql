-- CreateEnum
CREATE TYPE "ServiceOrderStatus" AS ENUM ('ENTRY', 'WAITING_DIAGNOSIS', 'WAITING_APPROVAL', 'WAITING_PART', 'IN_REPAIR', 'IN_TESTING', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServicePriority" AS ENUM ('NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "ChecklistPhase" AS ENUM ('ENTRY', 'FINAL');

-- CreateEnum
CREATE TYPE "ChecklistResult" AS ENUM ('OK', 'DEFECTIVE', 'NOT_TESTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'SENT', 'APPROVED', 'REFUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuoteItemType" AS ENUM ('SERVICE', 'PART');

-- CreateEnum
CREATE TYPE "PartMovementType" AS ENUM ('ENTRY', 'EXIT', 'RESERVE', 'CONSUME_IN_SERVICE_ORDER', 'RETURN', 'ADJUSTMENT', 'LOSS', 'DEFECT', 'WARRANTY');

-- CreateEnum
CREATE TYPE "ServiceOrderPartStatus" AS ENUM ('RESERVED', 'USED', 'RETURNED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServicePaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TECHNICIAN';

-- CreateTable
CREATE TABLE "Technician" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "technicianId" TEXT,
    "warrantySourceId" TEXT,
    "status" "ServiceOrderStatus" NOT NULL DEFAULT 'ENTRY',
    "priority" "ServicePriority" NOT NULL DEFAULT 'NORMAL',
    "category" TEXT NOT NULL DEFAULT 'Smartphone',
    "brand" TEXT NOT NULL DEFAULT 'Apple',
    "model" TEXT NOT NULL,
    "color" TEXT,
    "capacity" TEXT,
    "imei" TEXT,
    "imei2" TEXT,
    "serial" TEXT,
    "modelNumber" TEXT,
    "unlockPassword" TEXT,
    "accessories" TEXT,
    "deviceNotes" TEXT,
    "reportedIssues" TEXT[],
    "customerDescription" TEXT,
    "internalNote" TEXT,
    "expectedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "paymentStatus" "ServicePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "totalServices" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalParts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCharged" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "warrantyDays" INTEGER,
    "warrantyStartAt" TIMESTAMP(3),
    "warrantyEndAt" TIMESTAMP(3),
    "warrantyNotes" TEXT,
    "deliveredBy" TEXT,
    "pickedUpBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrderHistory" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "ServiceOrderStatus",
    "newStatus" "ServiceOrderStatus",
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceOrderHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceChecklistItem" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "phase" "ChecklistPhase" NOT NULL,
    "item" TEXT NOT NULL,
    "result" "ChecklistResult" NOT NULL DEFAULT 'NOT_TESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDiagnostic" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "technicianId" TEXT,
    "diagnosedById" TEXT,
    "foundIssue" TEXT NOT NULL,
    "probableCause" TEXT,
    "recommendedService" TEXT,
    "technicalNote" TEXT,
    "estimatedTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDiagnostic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceQuote" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "subtotalParts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotalServices" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "margin" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvalMethod" TEXT,
    "responsibleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "partId" TEXT,
    "type" "QuoteItemType" NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ServiceQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "compatibleModel" TEXT,
    "quality" TEXT,
    "supplier" TEXT,
    "cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartCompatibility" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "model" TEXT NOT NULL,

    CONSTRAINT "PartCompatibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartMovement" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "serviceOrderId" TEXT,
    "type" "PartMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrderPart" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "ServiceOrderPartStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOrderPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOrderPayment" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceOrderPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAttachment" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'photo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Technician_name_idx" ON "Technician"("name");

-- CreateIndex
CREATE INDEX "Technician_active_idx" ON "Technician"("active");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_number_key" ON "ServiceOrder"("number");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOrder_publicToken_key" ON "ServiceOrder"("publicToken");

-- CreateIndex
CREATE INDEX "ServiceOrder_status_idx" ON "ServiceOrder"("status");

-- CreateIndex
CREATE INDEX "ServiceOrder_priority_idx" ON "ServiceOrder"("priority");

-- CreateIndex
CREATE INDEX "ServiceOrder_customerId_idx" ON "ServiceOrder"("customerId");

-- CreateIndex
CREATE INDEX "ServiceOrder_technicianId_idx" ON "ServiceOrder"("technicianId");

-- CreateIndex
CREATE INDEX "ServiceOrder_createdAt_idx" ON "ServiceOrder"("createdAt");

-- CreateIndex
CREATE INDEX "ServiceOrder_expectedAt_idx" ON "ServiceOrder"("expectedAt");

-- CreateIndex
CREATE INDEX "ServiceOrder_imei_idx" ON "ServiceOrder"("imei");

-- CreateIndex
CREATE INDEX "ServiceOrder_serial_idx" ON "ServiceOrder"("serial");

-- CreateIndex
CREATE INDEX "ServiceOrder_model_idx" ON "ServiceOrder"("model");

-- CreateIndex
CREATE INDEX "ServiceOrderHistory_serviceOrderId_createdAt_idx" ON "ServiceOrderHistory"("serviceOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceOrderHistory_userId_idx" ON "ServiceOrderHistory"("userId");

-- CreateIndex
CREATE INDEX "ServiceChecklistItem_serviceOrderId_phase_idx" ON "ServiceChecklistItem"("serviceOrderId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceChecklistItem_serviceOrderId_phase_item_key" ON "ServiceChecklistItem"("serviceOrderId", "phase", "item");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDiagnostic_serviceOrderId_key" ON "ServiceDiagnostic"("serviceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceQuote_serviceOrderId_key" ON "ServiceQuote"("serviceOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Part_sku_key" ON "Part"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Part_barcode_key" ON "Part"("barcode");

-- CreateIndex
CREATE INDEX "Part_name_idx" ON "Part"("name");

-- CreateIndex
CREATE INDEX "Part_category_idx" ON "Part"("category");

-- CreateIndex
CREATE INDEX "Part_compatibleModel_idx" ON "Part"("compatibleModel");

-- CreateIndex
CREATE INDEX "PartCompatibility_model_idx" ON "PartCompatibility"("model");

-- CreateIndex
CREATE UNIQUE INDEX "PartCompatibility_partId_model_key" ON "PartCompatibility"("partId", "model");

-- CreateIndex
CREATE INDEX "PartMovement_partId_createdAt_idx" ON "PartMovement"("partId", "createdAt");

-- CreateIndex
CREATE INDEX "PartMovement_serviceOrderId_idx" ON "PartMovement"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ServiceOrderPart_serviceOrderId_idx" ON "ServiceOrderPart"("serviceOrderId");

-- CreateIndex
CREATE INDEX "ServiceOrderPart_partId_idx" ON "ServiceOrderPart"("partId");

-- CreateIndex
CREATE INDEX "ServiceOrderPayment_serviceOrderId_createdAt_idx" ON "ServiceOrderPayment"("serviceOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceAttachment_serviceOrderId_idx" ON "ServiceAttachment"("serviceOrderId");

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_warrantySourceId_fkey" FOREIGN KEY ("warrantySourceId") REFERENCES "ServiceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderHistory" ADD CONSTRAINT "ServiceOrderHistory_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderHistory" ADD CONSTRAINT "ServiceOrderHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceChecklistItem" ADD CONSTRAINT "ServiceChecklistItem_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDiagnostic" ADD CONSTRAINT "ServiceDiagnostic_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDiagnostic" ADD CONSTRAINT "ServiceDiagnostic_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDiagnostic" ADD CONSTRAINT "ServiceDiagnostic_diagnosedById_fkey" FOREIGN KEY ("diagnosedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuote" ADD CONSTRAINT "ServiceQuote_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuoteItem" ADD CONSTRAINT "ServiceQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ServiceQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceQuoteItem" ADD CONSTRAINT "ServiceQuoteItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartCompatibility" ADD CONSTRAINT "PartCompatibility_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartMovement" ADD CONSTRAINT "PartMovement_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderPart" ADD CONSTRAINT "ServiceOrderPart_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderPart" ADD CONSTRAINT "ServiceOrderPart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderPayment" ADD CONSTRAINT "ServiceOrderPayment_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceOrderPayment" ADD CONSTRAINT "ServiceOrderPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAttachment" ADD CONSTRAINT "ServiceAttachment_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
