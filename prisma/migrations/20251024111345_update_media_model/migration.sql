/*
  Warnings:

  - You are about to drop the column `method` on the `media` table. All the data in the column will be lost.
  - You are about to drop the column `mime` on the `media` table. All the data in the column will be lost.
  - Added the required column `filename` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mime_type` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_name` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "media" DROP COLUMN "method",
DROP COLUMN "mime",
ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "metadata" TEXT,
ADD COLUMN     "mime_type" TEXT NOT NULL,
ADD COLUMN     "original_name" TEXT NOT NULL,
ADD COLUMN     "path" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL;
