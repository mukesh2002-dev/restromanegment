-- CreateEnum
CREATE TYPE "ServingUnit" AS ENUM ('PCS', 'PLATE', 'BOWL', 'GLASS', 'HALF', 'FULL', 'THALI', 'BOTTLE');

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "servingUnit" "ServingUnit" NOT NULL DEFAULT 'PLATE';
