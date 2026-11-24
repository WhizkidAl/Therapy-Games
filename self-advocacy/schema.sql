-- Self-advocacy: isolated records in the existing Track backend.
-- No existing participants, permissions or tracking tables are changed.
create table private.advocacy_spaces (
 id uuid primary key default gen_random_uuid(),
 label text not null check(length(trim(label)) between 1 and 120),
 owner_id uuid not null references auth.users(id),
 revision integer not null default 0,
 created_at timestamptz not null default now()
);
create table private.advocacy_members (
 space_id uuid not null references private.advocacy_spaces(id) on delete cascade,
 email text not null check(email=lower(trim(email)) and length(email) between 3 and 254),
 label text not null check(length(trim(label)) between 1 and 120),
 role text not null check(role in ('clinician','parent','ea','teacher')),
 can_write boolean not null default true,
 active boolean not null default true,
 primary key(space_id,email)
);
create table private.advocacy_entries (
 id uuid primary key,
 space_id uuid not null references private.advocacy_spaces(id) on delete cascade,
 revision integer not null,
 kind text not null check(kind in ('plan','try','review','comment','dismissal','access')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=20000),
 actor_id uuid not null references auth.users(id),
 actor_label text not null,
 actor_role text not null,
 created_at timestamptz not null default now(),
 unique(space_id,revision)
);
create index advocacy_spaces_owner_idx on private.advocacy_spaces(owner_id);
create index advocacy_members_email_idx on private.advocacy_members(email);
create index advocacy_entries_actor_idx on private.advocacy_entries(actor_id);
alter table private.advocacy_spaces enable row level security;
alter table private.advocacy_members enable row level security;
alter table private.advocacy_entries enable row level security;
revoke all on private.advocacy_spaces,private.advocacy_members,private.advocacy_entries from public,anon,authenticated;

create function private.advocacy_identity() returns text language sql stable security definer set search_path='' as $$
 select lower(u.email) from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false);
$$;
create function private.advocacy_role(sid uuid) returns text language sql stable security definer set search_path='' as $$
 select case when s.owner_id=auth.uid() then 'owner' else m.role end
 from private.advocacy_spaces s left join private.advocacy_members m on m.space_id=s.id and m.email=private.advocacy_identity() and m.active
 where s.id=sid and private.advocacy_identity() is not null and (s.owner_id=auth.uid() or m.email is not null);
$$;
create function private.advocacy_list() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('can_create',private.advocacy_identity() is not null and exists(select 1 from private.tracker_administrators where user_id=auth.uid()),
 'spaces',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'label',s.label,'role',private.advocacy_role(s.id)) order by s.label) from private.advocacy_spaces s where private.advocacy_role(s.id) is not null),'[]'::jsonb));
$$;
create function private.advocacy_create(p_label text) returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 if private.advocacy_identity() is null or not exists(select 1 from private.tracker_administrators where user_id=auth.uid()) then raise exception 'An authorised coordinator creates workspaces' using errcode='42501'; end if;
 if p_label is null or length(trim(p_label)) not between 1 and 120 then raise exception 'Enter a short workspace name'; end if;
 insert into private.advocacy_spaces(label,owner_id) values(trim(p_label),auth.uid()) returning id into sid; return sid;
end $$;
create function private.advocacy_load(p_space uuid,p_before integer default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r text:=private.advocacy_role(p_space); result jsonb;
begin
 if r is null then raise exception 'This workspace is not shared with your account' using errcode='42501'; end if;
 select jsonb_build_object('id',s.id,'label',s.label,'revision',s.revision,'role',r,
 'can_write',r='owner' or coalesce((select can_write from private.advocacy_members where space_id=s.id and email=private.advocacy_identity() and active),false),
 'plan',(select payload from private.advocacy_entries where space_id=s.id and kind='plan' order by revision desc limit 1),
 'team',coalesce((select jsonb_agg(jsonb_build_object('label',label,'role',role,'can_write',can_write,'active',active,'email',case when r='owner' then email else null end) order by label) from private.advocacy_members where space_id=s.id and (active or r='owner')),'[]'::jsonb),
 'entries',coalesce((select jsonb_agg(to_jsonb(e)-'actor_id' order by e.revision desc) from (select * from private.advocacy_entries where space_id=s.id and (p_before is null or revision<p_before) order by revision desc limit 100) e),'[]'::jsonb)) into result from private.advocacy_spaces s where s.id=p_space;
 return result;
end $$;
create function private.advocacy_save(p_space uuid,p_kind text,p_payload jsonb,p_expected integer,p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r text:=private.advocacy_role(p_space); rev integer; old private.advocacy_entries; actor text;
begin
 if r is null then raise exception 'Workspace access required' using errcode='42501'; end if;
 if r<>'owner' and not exists(select 1 from private.advocacy_members where space_id=p_space and email=private.advocacy_identity() and active and can_write) then raise exception 'This account has view-only access' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('plan','try','review','comment','dismissal') or p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>20000 or p_id is null then raise exception 'Invalid entry'; end if;
 if p_kind='plan' and r not in ('owner','clinician') then raise exception 'The speech pathologist or coordinator saves the agreed plan. Add your suggestions as a comment.' using errcode='42501'; end if;
 select revision into rev from private.advocacy_spaces where id=p_space for update;
 select * into old from private.advocacy_entries where id=p_id;
 if found then
  if old.space_id=p_space and old.actor_id=auth.uid() and old.kind=p_kind and old.payload=p_payload then return jsonb_build_object('id',old.id,'revision',rev,'saved_revision',old.revision); end if;
  raise exception 'Entry identifier already used';
 end if;
 if p_expected is null or p_expected<>rev then raise exception 'A newer update is available. Your text is still here. Reload the saved record before trying again.' using errcode='40001'; end if;
 actor:=case when r='owner' then 'Coordinator' else (select label from private.advocacy_members where space_id=p_space and email=private.advocacy_identity()) end;
 insert into private.advocacy_entries(id,space_id,revision,kind,payload,actor_id,actor_label,actor_role) values(p_id,p_space,rev+1,p_kind,p_payload,auth.uid(),actor,r);
 update private.advocacy_spaces set revision=rev+1 where id=p_space;
 return jsonb_build_object('id',p_id,'revision',rev+1,'saved_revision',rev+1);
end $$;
create function private.advocacy_member(p_space uuid,p_email text,p_label text,p_role text,p_write boolean,p_active boolean,p_expected integer) returns void language plpgsql security definer set search_path='' as $$
declare rev integer; address text:=lower(trim(p_email));
begin
 if private.advocacy_role(p_space) is distinct from 'owner' then raise exception 'Only the coordinator changes access' using errcode='42501'; end if;
 if address is null or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(address)>254 or p_label is null or length(trim(p_label)) not between 1 and 120 or p_role is null or p_role not in ('clinician','parent','ea','teacher') or p_write is null or p_active is null then raise exception 'Check the name, email and role'; end if;
 if address=private.advocacy_identity() then raise exception 'The coordinator already has access'; end if;
 select revision into rev from private.advocacy_spaces where id=p_space for update;
 if p_expected is null or p_expected<>rev then raise exception 'Refresh before changing access' using errcode='40001'; end if;
 insert into private.advocacy_members(space_id,email,label,role,can_write,active) values(p_space,address,trim(p_label),p_role,p_write,p_active) on conflict(space_id,email) do update set label=excluded.label,role=excluded.role,can_write=excluded.can_write,active=excluded.active;
 insert into private.advocacy_entries(id,space_id,revision,kind,payload,actor_id,actor_label,actor_role) values(gen_random_uuid(),p_space,rev+1,'access',jsonb_build_object('person',trim(p_label),'role',p_role,'access',case when not p_active then 'Removed' when p_write then 'Can contribute' else 'View only' end),auth.uid(),'Coordinator','owner');
 update private.advocacy_spaces set revision=rev+1 where id=p_space;
end $$;

create function public.advocacy_list() returns jsonb language sql stable security invoker set search_path='' as $$select private.advocacy_list()$$;
create function public.advocacy_create(p_label text) returns uuid language sql security invoker set search_path='' as $$select private.advocacy_create(p_label)$$;
create function public.advocacy_load(p_space uuid,p_before integer default null) returns jsonb language sql stable security invoker set search_path='' as $$select private.advocacy_load(p_space,p_before)$$;
create function public.advocacy_save(p_space uuid,p_kind text,p_payload jsonb,p_expected integer,p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.advocacy_save(p_space,p_kind,p_payload,p_expected,p_id)$$;
create function public.advocacy_member(p_space uuid,p_email text,p_label text,p_role text,p_write boolean,p_active boolean,p_expected integer) returns void language sql security invoker set search_path='' as $$select private.advocacy_member(p_space,p_email,p_label,p_role,p_write,p_active,p_expected)$$;

revoke all on function private.advocacy_identity(),private.advocacy_role(uuid),private.advocacy_list(),private.advocacy_create(text),private.advocacy_load(uuid,integer),private.advocacy_save(uuid,text,jsonb,integer,uuid),private.advocacy_member(uuid,text,text,text,boolean,boolean,integer) from public,anon,authenticated;
revoke all on function public.advocacy_list(),public.advocacy_create(text),public.advocacy_load(uuid,integer),public.advocacy_save(uuid,text,jsonb,integer,uuid),public.advocacy_member(uuid,text,text,text,boolean,boolean,integer) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.advocacy_list(),private.advocacy_create(text),private.advocacy_load(uuid,integer),private.advocacy_save(uuid,text,jsonb,integer,uuid),private.advocacy_member(uuid,text,text,text,boolean,boolean,integer) to authenticated;
grant execute on function public.advocacy_list(),public.advocacy_create(text),public.advocacy_load(uuid,integer),public.advocacy_save(uuid,text,jsonb,integer,uuid),public.advocacy_member(uuid,text,text,text,boolean,boolean,integer) to authenticated;

