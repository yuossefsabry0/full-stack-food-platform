-- AlterTable: optional customer note ("Other Details") on orders.
-- Nullable so all historical rows stay valid; shown to chef + delivery.
ALTER TABLE `orders` ADD COLUMN `otherDetails` VARCHAR(500) NULL;
