-- Drop email import related tables and enums
DROP TABLE IF EXISTS "pending_entities" CASCADE;
DROP TABLE IF EXISTS "email_imports" CASCADE;
DROP TABLE IF EXISTS "app_settings" CASCADE;
DROP TYPE IF EXISTS "EmailImportStatus";
