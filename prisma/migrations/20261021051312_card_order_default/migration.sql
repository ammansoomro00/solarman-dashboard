-- AlterTable
ALTER TABLE "public"."Preference" ALTER COLUMN "overviewCards" SET DEFAULT ARRAY['flow', 'battery', 'today', 'curve', 'week', 'savings']::TEXT[];
