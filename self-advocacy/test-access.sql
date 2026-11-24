begin;
-- Synthetic users and workspace are rolled back with this transaction.
select set_config('test.owner',gen_random_uuid()::text,true),set_config('test.parent',gen_random_uuid()::text,true),set_config('test.stranger',gen_random_uuid()::text,true);
insert into auth.users(id,aud,role,email,email_confirmed_at,created_at,updated_at)
select current_setting('test.owner')::uuid,'authenticated','authenticated','sa-owner-'||current_setting('test.owner')||'@example.invalid',now(),now(),now()
union all select current_setting('test.parent')::uuid,'authenticated','authenticated','sa-parent-'||current_setting('test.parent')||'@example.invalid',now(),now(),now()
union all select current_setting('test.stranger')::uuid,'authenticated','authenticated','sa-stranger-'||current_setting('test.stranger')||'@example.invalid',now(),now(),now();
insert into private.tracker_administrators(user_id) values(current_setting('test.owner')::uuid);
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
select set_config('test.space',public.advocacy_create('SYNTHETIC ACCESS TEST')::text,true);
select set_config('test.entry',gen_random_uuid()::text,true);
select public.advocacy_save(current_setting('test.space')::uuid,'plan','{"message":"Please check","child_view":"Synthetic only"}',0,current_setting('test.entry')::uuid);
-- Idempotent network retry must not create a duplicate.
select public.advocacy_save(current_setting('test.space')::uuid,'plan','{"message":"Please check","child_view":"Synthetic only"}',0,current_setting('test.entry')::uuid);
do $$begin
 if (public.advocacy_load(current_setting('test.space')::uuid)->>'revision')::int<>1 then raise exception 'FAIL duplicate save'; end if;
 if public.advocacy_load(current_setting('test.space')::uuid)->'plan'->>'message'<>'Please check' then raise exception 'FAIL read back'; end if;
 begin perform public.advocacy_save(current_setting('test.space')::uuid,'comment','{"comment":"stale"}',0,gen_random_uuid());raise exception 'FAIL stale update permitted';exception when serialization_failure then null;end;
 begin perform * from private.advocacy_spaces;raise exception 'FAIL direct table read';exception when insufficient_privilege then null;end;
end$$;
select public.advocacy_member(current_setting('test.space')::uuid,'sa-parent-'||current_setting('test.parent')||'@example.invalid','Synthetic parent','parent',false,true,1);
select set_config('request.jwt.claim.sub',current_setting('test.parent'),true);
do $$begin
 if public.advocacy_load(current_setting('test.space')::uuid)->'plan'->>'message'<>'Please check' then raise exception 'FAIL shared read'; end if;
 if public.advocacy_load(current_setting('test.space')::uuid)->'team'->0->>'email' is not null then raise exception 'FAIL supporter email exposed'; end if;
 begin perform public.advocacy_save(current_setting('test.space')::uuid,'comment','{"comment":"view only"}',2,gen_random_uuid());raise exception 'FAIL view-only write';exception when insufficient_privilege then null;end;
 begin perform public.advocacy_create('Forbidden');raise exception 'FAIL parent create';exception when insufficient_privilege then null;end;
 begin perform public.advocacy_member(current_setting('test.space')::uuid,'other@example.invalid','Other','clinician',true,true,2);raise exception 'FAIL parent grant';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
select public.advocacy_member(current_setting('test.space')::uuid,'sa-parent-'||current_setting('test.parent')||'@example.invalid','Synthetic parent','parent',true,true,2);
select set_config('request.jwt.claim.sub',current_setting('test.parent'),true);
select public.advocacy_save(current_setting('test.space')::uuid,'review','{"situation":"Synthetic","outcome":"A little"}',3,gen_random_uuid());
do $$begin
 begin perform public.advocacy_save(current_setting('test.space')::uuid,'plan','{"message":"overwrite"}',4,gen_random_uuid());raise exception 'FAIL parent changed plan';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('test.stranger'),true);
do $$begin
 if jsonb_array_length(public.advocacy_list()->'spaces')<>0 then raise exception 'FAIL unrelated visibility'; end if;
 begin perform public.advocacy_load(current_setting('test.space')::uuid);raise exception 'FAIL unrelated read';exception when insufficient_privilege then null;end;
 begin perform public.advocacy_save(current_setting('test.space')::uuid,'comment','{"comment":"forged"}',4,gen_random_uuid());raise exception 'FAIL unrelated write';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
select public.advocacy_member(current_setting('test.space')::uuid,'sa-parent-'||current_setting('test.parent')||'@example.invalid','Synthetic parent','parent',true,false,4);
select set_config('request.jwt.claim.sub',current_setting('test.parent'),true);
do $$begin
 begin perform public.advocacy_load(current_setting('test.space')::uuid);raise exception 'FAIL revoked read';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform public.advocacy_list();raise exception 'FAIL anonymous function access';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
select 'PASS: save/read, retry, conflicts, parent view/contribution, plan restriction, unrelated-user denial, revocation, anonymous denial. All synthetic records rolled back.' as result;

