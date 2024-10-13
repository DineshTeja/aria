create table "public"."new_doctors" (
    "id" uuid not null default gen_random_uuid(),
    "first_name" text,
    "last_name" text,
    "credentials" text,
    "link" text not null,
    "locality" text,
    "locality_url" text,
    "region" text,
    "region_url" text,
    "speciality" text,
    "speciality_link" text,
    "photo_url" text
);


alter table "public"."pdf_knowledge" add column "content" text;

CREATE UNIQUE INDEX new_doctors_pkey ON public.new_doctors USING btree (id);

alter table "public"."new_doctors" add constraint "new_doctors_pkey" PRIMARY KEY using index "new_doctors_pkey";

alter table "public"."new_doctors" add constraint "new_doctors_link_check" CHECK ((link ~* '^https?://'::text)) not valid;

alter table "public"."new_doctors" validate constraint "new_doctors_link_check";

alter table "public"."new_doctors" add constraint "new_doctors_locality_url_check" CHECK ((locality_url ~* '^https?://'::text)) not valid;

alter table "public"."new_doctors" validate constraint "new_doctors_locality_url_check";

alter table "public"."new_doctors" add constraint "new_doctors_photo_url_check" CHECK ((photo_url ~* '^https?://'::text)) not valid;

alter table "public"."new_doctors" validate constraint "new_doctors_photo_url_check";

alter table "public"."new_doctors" add constraint "new_doctors_region_url_check" CHECK ((region_url ~* '^https?://'::text)) not valid;

alter table "public"."new_doctors" validate constraint "new_doctors_region_url_check";

alter table "public"."new_doctors" add constraint "new_doctors_speciality_link_check" CHECK ((speciality_link ~* '^https?://'::text)) not valid;

alter table "public"."new_doctors" validate constraint "new_doctors_speciality_link_check";

grant delete on table "public"."new_doctors" to "anon";

grant insert on table "public"."new_doctors" to "anon";

grant references on table "public"."new_doctors" to "anon";

grant select on table "public"."new_doctors" to "anon";

grant trigger on table "public"."new_doctors" to "anon";

grant truncate on table "public"."new_doctors" to "anon";

grant update on table "public"."new_doctors" to "anon";

grant delete on table "public"."new_doctors" to "authenticated";

grant insert on table "public"."new_doctors" to "authenticated";

grant references on table "public"."new_doctors" to "authenticated";

grant select on table "public"."new_doctors" to "authenticated";

grant trigger on table "public"."new_doctors" to "authenticated";

grant truncate on table "public"."new_doctors" to "authenticated";

grant update on table "public"."new_doctors" to "authenticated";

grant delete on table "public"."new_doctors" to "service_role";

grant insert on table "public"."new_doctors" to "service_role";

grant references on table "public"."new_doctors" to "service_role";

grant select on table "public"."new_doctors" to "service_role";

grant trigger on table "public"."new_doctors" to "service_role";

grant truncate on table "public"."new_doctors" to "service_role";

grant update on table "public"."new_doctors" to "service_role";


