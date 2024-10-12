
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

CREATE TYPE "public"."category" AS ENUM (
    'cardiovascular',
    'respiratory',
    'gastrointestinal',
    'neurological',
    'endocrine',
    'hematological',
    'infectious',
    'musculoskeletal',
    'autoimmune',
    'cancer'
);

ALTER TYPE "public"."category" OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) RETURNS TABLE("tag" "text", "summary" "text", "article" "text", "category" "public"."category", "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  -- Select the relevant document fields and calculate similarity based on cosine similarity
  select
    d.tag,                             -- Return the tag field
    d.summary,                         -- Return the summary field
    d.article,                         -- Return the article field
    d.category,                        -- Return the category field
    1 - (d.embedding <=> query_embedding) as similarity  -- Calculate cosine similarity
  from knowledge d
  -- Filter by similarity threshold, only return results with similarity >= threshold
  where (1 - (d.embedding <=> query_embedding)) >= match_threshold
  -- Order by highest cosine similarity first (descending)
  order by similarity desc
  -- Limit the number of returned results to match_count
  limit match_count;
$$;

ALTER FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."knowledge" (
    "tag" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "article" "text",
    "embedding" "extensions"."vector"(1536),
    "category" "public"."category"
);

ALTER TABLE "public"."knowledge" OWNER TO "postgres";

ALTER TABLE ONLY "public"."knowledge"
    ADD CONSTRAINT "knowledge_pkey" PRIMARY KEY ("tag");

CREATE INDEX "knowledge_embedding_idx" ON "public"."knowledge" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');

CREATE INDEX "knowledge_embedding_idx1" ON "public"."knowledge" USING "ivfflat" ("embedding" "extensions"."vector_cosine_ops") WITH ("lists"='100');

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON TABLE "public"."knowledge" TO "anon";
GRANT ALL ON TABLE "public"."knowledge" TO "authenticated";
GRANT ALL ON TABLE "public"."knowledge" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
