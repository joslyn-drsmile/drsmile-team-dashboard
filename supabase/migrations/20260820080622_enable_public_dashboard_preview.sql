-- Temporary no-login mode. Anyone with the public site URL can edit shared data.
-- Remove these policies and anon grants before restoring authenticated team access.

begin;

alter table public.members enable row level security;
alter table public.menu_permissions enable row level security;
alter table public.records enable row level security;
alter table public.dashboard_settings enable row level security;

grant select, insert, update, delete on public.members to anon;
grant select, insert, update, delete on public.menu_permissions to anon;
grant select, insert, update, delete on public.records to anon;
grant select, insert, update, delete on public.dashboard_settings to anon;
grant usage, select on sequence public.records_id_seq to anon;

drop policy if exists "public_preview_members_read" on public.members;
create policy "public_preview_members_read" on public.members for select to anon using (true);
drop policy if exists "public_preview_members_insert" on public.members;
create policy "public_preview_members_insert" on public.members for insert to anon with check (id <> 'admin-joslyn' and not is_owner);
drop policy if exists "public_preview_members_update" on public.members;
create policy "public_preview_members_update" on public.members for update to anon using (id <> 'admin-joslyn') with check (id <> 'admin-joslyn' and not is_owner);
drop policy if exists "public_preview_members_delete" on public.members;
create policy "public_preview_members_delete" on public.members for delete to anon using (id <> 'admin-joslyn');

drop policy if exists "public_preview_permissions_read" on public.menu_permissions;
create policy "public_preview_permissions_read" on public.menu_permissions for select to anon using (true);
drop policy if exists "public_preview_permissions_insert" on public.menu_permissions;
create policy "public_preview_permissions_insert" on public.menu_permissions for insert to anon with check (member_id <> 'admin-joslyn');
drop policy if exists "public_preview_permissions_update" on public.menu_permissions;
create policy "public_preview_permissions_update" on public.menu_permissions for update to anon using (member_id <> 'admin-joslyn') with check (member_id <> 'admin-joslyn');
drop policy if exists "public_preview_permissions_delete" on public.menu_permissions;
create policy "public_preview_permissions_delete" on public.menu_permissions for delete to anon using (member_id <> 'admin-joslyn');

drop policy if exists "public_preview_records_all" on public.records;
create policy "public_preview_records_all" on public.records for all to anon using (true) with check (true);

drop policy if exists "public_preview_settings_all" on public.dashboard_settings;
create policy "public_preview_settings_all" on public.dashboard_settings for all to anon using (true) with check (true);

drop policy if exists "public_preview_images_insert" on storage.objects;
create policy "public_preview_images_insert" on storage.objects for insert to anon with check (bucket_id = 'dashboard-images');
drop policy if exists "public_preview_images_update" on storage.objects;
create policy "public_preview_images_update" on storage.objects for update to anon using (bucket_id = 'dashboard-images') with check (bucket_id = 'dashboard-images');
drop policy if exists "public_preview_images_delete" on storage.objects;
create policy "public_preview_images_delete" on storage.objects for delete to anon using (bucket_id = 'dashboard-images');

commit;
