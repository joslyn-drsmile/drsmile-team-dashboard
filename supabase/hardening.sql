-- Supabase 2026 hardening: explicit Data API grants and private RLS helpers.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_member_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.id
  from public.members m
  where auth.uid() is not null
    and m.active
    and lower(m.email) = lower(auth.jwt() ->> 'email')
  limit 1
$$;

create or replace function private.is_dashboard_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.members m
    where m.id = private.current_member_id() and m.is_owner and m.active
  )
$$;

create or replace function private.has_menu_permission(menu_name text, action_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    private.is_dashboard_owner() or exists (
      select 1 from public.menu_permissions p
      where p.member_id = private.current_member_id()
        and p.menu = menu_name
        and case action_name
          when 'view' then p.can_view
          when 'add' then p.can_add
          when 'edit' then p.can_edit
          when 'delete' then p.can_delete
          else false
        end
    )
  )
$$;

revoke all on function private.current_member_id() from public, anon;
revoke all on function private.is_dashboard_owner() from public, anon;
revoke all on function private.has_menu_permission(text, text) from public, anon;
grant execute on function private.current_member_id() to authenticated;
grant execute on function private.is_dashboard_owner() to authenticated;
grant execute on function private.has_menu_permission(text, text) to authenticated;

drop policy if exists "members_read_self_or_owner" on public.members;
create policy "members_read_self_or_owner" on public.members for select to authenticated
using (id = (select private.current_member_id()) or (select private.is_dashboard_owner()));
drop policy if exists "members_owner_insert" on public.members;
create policy "members_owner_insert" on public.members for insert to authenticated with check ((select private.is_dashboard_owner()));
drop policy if exists "members_owner_update" on public.members;
create policy "members_owner_update" on public.members for update to authenticated using ((select private.is_dashboard_owner())) with check ((select private.is_dashboard_owner()));
drop policy if exists "members_owner_delete" on public.members;
create policy "members_owner_delete" on public.members for delete to authenticated using ((select private.is_dashboard_owner()) and not is_owner);

drop policy if exists "permissions_read_self_or_owner" on public.menu_permissions;
create policy "permissions_read_self_or_owner" on public.menu_permissions for select to authenticated
using (member_id = (select private.current_member_id()) or (select private.is_dashboard_owner()));
drop policy if exists "permissions_owner_insert" on public.menu_permissions;
create policy "permissions_owner_insert" on public.menu_permissions for insert to authenticated with check ((select private.is_dashboard_owner()));
drop policy if exists "permissions_owner_update" on public.menu_permissions;
create policy "permissions_owner_update" on public.menu_permissions for update to authenticated using ((select private.is_dashboard_owner())) with check ((select private.is_dashboard_owner()));
drop policy if exists "permissions_owner_delete" on public.menu_permissions;
create policy "permissions_owner_delete" on public.menu_permissions for delete to authenticated using ((select private.is_dashboard_owner()));

drop policy if exists "records_menu_read" on public.records;
create policy "records_menu_read" on public.records for select to authenticated using ((select private.has_menu_permission(section, 'view')));
drop policy if exists "records_menu_add" on public.records;
create policy "records_menu_add" on public.records for insert to authenticated with check ((select private.has_menu_permission(section, 'add')));
drop policy if exists "records_menu_edit" on public.records;
create policy "records_menu_edit" on public.records for update to authenticated using ((select private.has_menu_permission(section, 'edit'))) with check ((select private.has_menu_permission(section, 'edit')));
drop policy if exists "records_menu_delete" on public.records;
create policy "records_menu_delete" on public.records for delete to authenticated using ((select private.has_menu_permission(section, 'delete')));

drop policy if exists "settings_products_read" on public.dashboard_settings;
create policy "settings_products_read" on public.dashboard_settings for select to authenticated using ((select private.has_menu_permission('products', 'view')));
drop policy if exists "settings_products_insert" on public.dashboard_settings;
create policy "settings_products_insert" on public.dashboard_settings for insert to authenticated with check ((select private.has_menu_permission('products', 'add')));
drop policy if exists "settings_products_update" on public.dashboard_settings;
create policy "settings_products_update" on public.dashboard_settings for update to authenticated using ((select private.has_menu_permission('products', 'edit'))) with check ((select private.has_menu_permission('products', 'edit')));

drop policy if exists "dashboard_images_upload" on storage.objects;
create policy "dashboard_images_upload" on storage.objects for insert to authenticated with check (bucket_id = 'dashboard-images' and (select private.current_member_id()) is not null);
drop policy if exists "dashboard_images_update" on storage.objects;
create policy "dashboard_images_update" on storage.objects for update to authenticated using (bucket_id = 'dashboard-images' and (select private.current_member_id()) is not null) with check (bucket_id = 'dashboard-images' and (select private.current_member_id()) is not null);
drop policy if exists "dashboard_images_delete" on storage.objects;
create policy "dashboard_images_delete" on storage.objects for delete to authenticated using (bucket_id = 'dashboard-images' and (select private.is_dashboard_owner()));

grant select, insert, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.menu_permissions to authenticated;
grant select, insert, update, delete on public.records to authenticated;
grant select, insert, update, delete on public.dashboard_settings to authenticated;
grant usage, select on sequence public.records_id_seq to authenticated;
revoke all on public.members, public.menu_permissions, public.records, public.dashboard_settings from anon;

create index if not exists members_active_email_idx on public.members (lower(email)) where active and email is not null;

drop function if exists public.has_menu_permission(text, text);
drop function if exists public.is_dashboard_owner();
drop function if exists public.current_member_id();

commit;
