-- AlterTable
ALTER TABLE "users" ADD COLUMN "llm_api_key" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "llm_base_url" VARCHAR(500);
ALTER TABLE "users" ADD COLUMN "llm_model" VARCHAR(200);
