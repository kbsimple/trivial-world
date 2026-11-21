CREATE TABLE "spike_probe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
