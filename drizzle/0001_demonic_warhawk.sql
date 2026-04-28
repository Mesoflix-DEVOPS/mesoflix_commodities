CREATE TABLE "campaign_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"ip_address" text,
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"unique_code" text NOT NULL,
	"short_url" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "campaign_assignments_unique_code_unique" UNIQUE("unique_code")
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"landing_page_url" text DEFAULT '/register' NOT NULL,
	"resources" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "capital_accounts" ADD COLUMN IF NOT EXISTS "selected_real_account_id" text;--> statement-breakpoint
ALTER TABLE "capital_accounts" ADD COLUMN IF NOT EXISTS "selected_demo_account_id" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "onboarding_status" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "meet_link" text;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_assignment_id_campaign_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."campaign_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_analytics_assignment_id_idx" ON "campaign_analytics" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_assignments_campaign_id_idx" ON "campaign_assignments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_assignments_staff_id_idx" ON "campaign_assignments" USING btree ("staff_id");