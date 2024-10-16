create sequence "public"."pdf_knowledge_id_seq";

alter table "public"."knowledge" drop constraint "knowledge_pkey";

drop index if exists "public"."knowledge_embedding_idx1";

drop index if exists "public"."knowledge_pkey";

create table "public"."doctors" (
    "id" bigint generated by default as identity not null,
    "name" text not null,
    "city" text,
    "state" text,
    "specialty" text,
    "bio" text
);


create table "public"."pdf_knowledge" (
    "id" integer not null default nextval('pdf_knowledge_id_seq'::regclass),
    "file_name" text not null,
    "file_path" text not null,
    "summary" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
);


alter table "public"."knowledge" add column "id" uuid not null default gen_random_uuid();

alter table "public"."knowledge" add column "url" text;

alter sequence "public"."pdf_knowledge_id_seq" owned by "public"."pdf_knowledge"."id";

CREATE UNIQUE INDEX doctors_pkey ON public.doctors USING btree (id);

CREATE UNIQUE INDEX pdf_knowledge_pkey ON public.pdf_knowledge USING btree (id);

CREATE UNIQUE INDEX knowledge_pkey ON public.knowledge USING btree (id);

alter table "public"."doctors" add constraint "doctors_pkey" PRIMARY KEY using index "doctors_pkey";

alter table "public"."pdf_knowledge" add constraint "pdf_knowledge_pkey" PRIMARY KEY using index "pdf_knowledge_pkey";

alter table "public"."knowledge" add constraint "knowledge_pkey" PRIMARY KEY using index "knowledge_pkey";

grant delete on table "public"."doctors" to "anon";

grant insert on table "public"."doctors" to "anon";

grant references on table "public"."doctors" to "anon";

grant select on table "public"."doctors" to "anon";

grant trigger on table "public"."doctors" to "anon";

grant truncate on table "public"."doctors" to "anon";

grant update on table "public"."doctors" to "anon";

grant delete on table "public"."doctors" to "authenticated";

grant insert on table "public"."doctors" to "authenticated";

grant references on table "public"."doctors" to "authenticated";

grant select on table "public"."doctors" to "authenticated";

grant trigger on table "public"."doctors" to "authenticated";

grant truncate on table "public"."doctors" to "authenticated";

grant update on table "public"."doctors" to "authenticated";

grant delete on table "public"."doctors" to "service_role";

grant insert on table "public"."doctors" to "service_role";

grant references on table "public"."doctors" to "service_role";

grant select on table "public"."doctors" to "service_role";

grant trigger on table "public"."doctors" to "service_role";

grant truncate on table "public"."doctors" to "service_role";

grant update on table "public"."doctors" to "service_role";

grant delete on table "public"."pdf_knowledge" to "anon";

grant insert on table "public"."pdf_knowledge" to "anon";

grant references on table "public"."pdf_knowledge" to "anon";

grant select on table "public"."pdf_knowledge" to "anon";

grant trigger on table "public"."pdf_knowledge" to "anon";

grant truncate on table "public"."pdf_knowledge" to "anon";

grant update on table "public"."pdf_knowledge" to "anon";

grant delete on table "public"."pdf_knowledge" to "authenticated";

grant insert on table "public"."pdf_knowledge" to "authenticated";

grant references on table "public"."pdf_knowledge" to "authenticated";

grant select on table "public"."pdf_knowledge" to "authenticated";

grant trigger on table "public"."pdf_knowledge" to "authenticated";

grant truncate on table "public"."pdf_knowledge" to "authenticated";

grant update on table "public"."pdf_knowledge" to "authenticated";

grant delete on table "public"."pdf_knowledge" to "service_role";

grant insert on table "public"."pdf_knowledge" to "service_role";

grant references on table "public"."pdf_knowledge" to "service_role";

grant select on table "public"."pdf_knowledge" to "service_role";

grant trigger on table "public"."pdf_knowledge" to "service_role";

grant truncate on table "public"."pdf_knowledge" to "service_role";

grant update on table "public"."pdf_knowledge" to "service_role";


