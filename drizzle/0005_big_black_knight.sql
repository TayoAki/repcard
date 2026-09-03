ALTER TABLE "profiles" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "referred_by" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_referred_by_user_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_referralCode_unique" UNIQUE("referral_code");