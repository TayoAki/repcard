ALTER TABLE "workout_sessions" DROP CONSTRAINT "workout_sessions_workout_id_workouts_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_sessions" ALTER COLUMN "workout_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;