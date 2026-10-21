-- CreateEnum
CREATE TYPE "public"."DataSource" AS ENUM ('SOLARMAN', 'DEMO');

-- CreateEnum
CREATE TYPE "public"."DeviceKind" AS ENUM ('INVERTER', 'BATTERY', 'LOGGER', 'METER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DeviceStatus" AS ENUM ('ONLINE', 'WARNING', 'OFFLINE');

-- CreateEnum
CREATE TYPE "public"."NoticeLevel" AS ENUM ('INFO', 'WARNING', 'FAULT');

-- CreateTable
CREATE TABLE "public"."Station" (
    "id" SERIAL NOT NULL,
    "source" "public"."DataSource" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityKw" DOUBLE PRECISION NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "operatingSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LiveStatus" (
    "stationId" INTEGER NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "solarW" DOUBLE PRECISION NOT NULL,
    "homeW" DOUBLE PRECISION NOT NULL,
    "batteryW" DOUBLE PRECISION NOT NULL,
    "gridW" DOUBLE PRECISION NOT NULL,
    "batteryPct" DOUBLE PRECISION,
    "gridAvailable" BOOLEAN,
    "todaySolarKwh" DOUBLE PRECISION,
    "todayHomeKwh" DOUBLE PRECISION,
    "todayBoughtKwh" DOUBLE PRECISION,
    "todaySoldKwh" DOUBLE PRECISION,
    "todayChargedKwh" DOUBLE PRECISION,
    "todayDischargedKwh" DOUBLE PRECISION,
    "lifetimeSolarKwh" DOUBLE PRECISION,
    "lifetimeBoughtKwh" DOUBLE PRECISION,
    "lifetimeSoldKwh" DOUBLE PRECISION,
    "inverterTempC" DOUBLE PRECISION,
    "batteryTempC" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveStatus_pkey" PRIMARY KEY ("stationId")
);

-- CreateTable
CREATE TABLE "public"."PowerSample" (
    "stationId" INTEGER NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "solarW" DOUBLE PRECISION NOT NULL,
    "homeW" DOUBLE PRECISION NOT NULL,
    "batteryW" DOUBLE PRECISION NOT NULL,
    "gridW" DOUBLE PRECISION NOT NULL,
    "batteryPct" DOUBLE PRECISION,

    CONSTRAINT "PowerSample_pkey" PRIMARY KEY ("stationId","measuredAt")
);

-- CreateTable
CREATE TABLE "public"."DailyEnergy" (
    "stationId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "solarKwh" DOUBLE PRECISION NOT NULL,
    "homeKwh" DOUBLE PRECISION NOT NULL,
    "boughtKwh" DOUBLE PRECISION NOT NULL,
    "soldKwh" DOUBLE PRECISION NOT NULL,
    "chargedKwh" DOUBLE PRECISION NOT NULL,
    "dischargedKwh" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyEnergy_pkey" PRIMARY KEY ("stationId","date")
);

-- CreateTable
CREATE TABLE "public"."MonthlyEnergy" (
    "stationId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "solarKwh" DOUBLE PRECISION NOT NULL,
    "homeKwh" DOUBLE PRECISION NOT NULL,
    "boughtKwh" DOUBLE PRECISION NOT NULL,
    "soldKwh" DOUBLE PRECISION NOT NULL,
    "chargedKwh" DOUBLE PRECISION NOT NULL,
    "dischargedKwh" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyEnergy_pkey" PRIMARY KEY ("stationId","year","month")
);

-- CreateTable
CREATE TABLE "public"."Device" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "serial" TEXT NOT NULL,
    "kind" "public"."DeviceKind" NOT NULL,
    "status" "public"."DeviceStatus" NOT NULL,
    "model" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "details" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notice" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "level" "public"."NoticeLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncState" (
    "stationId" INTEGER NOT NULL,
    "task" TEXT NOT NULL,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("stationId","task")
);

-- CreateTable
CREATE TABLE "public"."Preference" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pricePerUnit" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "sellPricePerUnit" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "co2KgPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "overviewCards" TEXT[] DEFAULT ARRAY['flow', 'battery', 'today', 'curve', 'savings', 'week']::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Station_source_externalId_key" ON "public"."Station"("source", "externalId");

-- CreateIndex
CREATE INDEX "PowerSample_stationId_measuredAt_idx" ON "public"."PowerSample"("stationId", "measuredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Device_stationId_serial_key" ON "public"."Device"("stationId", "serial");

-- CreateIndex
CREATE INDEX "Notice_stationId_occurredAt_idx" ON "public"."Notice"("stationId", "occurredAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Notice_stationId_dedupeKey_key" ON "public"."Notice"("stationId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "public"."LiveStatus" ADD CONSTRAINT "LiveStatus_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PowerSample" ADD CONSTRAINT "PowerSample_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DailyEnergy" ADD CONSTRAINT "DailyEnergy_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyEnergy" ADD CONSTRAINT "MonthlyEnergy_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Device" ADD CONSTRAINT "Device_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notice" ADD CONSTRAINT "Notice_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncState" ADD CONSTRAINT "SyncState_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
