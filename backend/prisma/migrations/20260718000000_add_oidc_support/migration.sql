-- Add OIDC subject identifier for OAuth/OIDC single sign-on
ALTER TABLE "users" ADD COLUMN "oidc_subject" VARCHAR(500);

-- One external identity maps to exactly one user
CREATE UNIQUE INDEX "users_oidc_subject_key" ON "users"("oidc_subject");
