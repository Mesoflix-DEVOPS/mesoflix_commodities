CREATE TABLE "automation_deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"engine_id" text NOT NULL,
	"commodity" text NOT NULL,
	"allocated_capital" text NOT NULL,
	"risk_multiplier" text DEFAULT '1.0',
	"stop_loss_cap" text NOT NULL,
	"status" text DEFAULT 'Running',
	"mode" text DEFAULT 'demo',
	"pnl" text DEFAULT '0',
	"target_profit" text,
	"daily_stop_loss" text,
	"risk_level" text DEFAULT 'Balanced',
	"last_decision_reason" text,
	"metrics" text,
	"cooldown_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"deployment_id" uuid,
	"engine_id" text NOT NULL,
	"deal_id" text NOT NULL,
	"epic" text NOT NULL,
	"direction" text NOT NULL,
	"size" text NOT NULL,
	"open_price" text,
	"close_price" text,
	"pnl" text NOT NULL,
	"status" text DEFAULT 'Open',
	"mode" text DEFAULT 'demo',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "automation_trades_deal_id_unique" UNIQUE("deal_id")
);
--> statement-breakpoint
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
CREATE TABLE "closed_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"deal_id" text NOT NULL,
	"epic" text NOT NULL,
	"direction" text NOT NULL,
	"size" text NOT NULL,
	"open_price" text,
	"close_price" text,
	"pnl" text NOT NULL,
	"mode" text DEFAULT 'demo',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "closed_trades_deal_id_unique" UNIQUE("deal_id")
);
--> statement-breakpoint
CREATE TABLE "learn_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"youtube_url" text NOT NULL,
	"thumbnail_url" text,
	"category" text DEFAULT 'Beginner' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"is_done" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "capital_accounts" ADD COLUMN "selected_real_account_id" text;--> statement-breakpoint
ALTER TABLE "capital_accounts" ADD COLUMN "selected_demo_account_id" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "onboarding_status" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "meet_link" text;--> statement-breakpoint
ALTER TABLE "automation_deployments" ADD CONSTRAINT "automation_deployments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_trades" ADD CONSTRAINT "automation_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_trades" ADD CONSTRAINT "automation_trades_deployment_id_automation_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."automation_deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_assignment_id_campaign_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."campaign_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_assignments" ADD CONSTRAINT "campaign_assignments_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closed_trades" ADD CONSTRAINT "closed_trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_class_id_learn_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."learn_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_class_id_learn_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."learn_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_deployments_user_id_idx" ON "automation_deployments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "automation_trades_user_id_idx" ON "automation_trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_analytics_assignment_id_idx" ON "campaign_analytics" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "campaign_assignments_campaign_id_idx" ON "campaign_assignments" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_assignments_staff_id_idx" ON "campaign_assignments" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "closed_trades_user_id_idx" ON "closed_trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "capital_accounts_user_id_idx" ON "capital_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "engine_settings_user_id_idx" ON "engine_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "platform_trades_user_id_idx" ON "platform_trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "tickets_user_id_idx" ON "tickets" USING btree ("user_id");