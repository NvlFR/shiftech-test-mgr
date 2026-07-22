-- P2 Backup/Restore and Data Retention. Run after schema_017_p1_rpc_hardening.sql.
-- All destructive operations require an explicit confirmation flag.

create table if not exists retention_policies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  retention_days integer not null default 365 check (retention_days between 1 and 3650),
  attachment_retention_days integer check (attachment_retention_days is null or attachment_retention_days between 1 and 3650),
  enabled boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (project_id is not null or created_by is not null)
);
create unique index if not exists idx_retention_policies_project on retention_policies(project_id) where project_id is not null;
create unique index if not exists idx_retention_policies_global on retention_policies((project_id is null)) where project_id is null;
create index if not exists idx_retention_policies_enabled on retention_policies(enabled);
drop trigger if exists trg_retention_policies_updated_at on retention_policies;
create trigger trg_retention_policies_updated_at before update on retention_policies for each row execute function set_updated_at();

alter table retention_policies enable row level security;
create policy "retention policy access" on retention_policies for select
  using (is_admin() or (project_id is not null and has_project_access(project_id)));
create policy "retention policy insert" on retention_policies for insert
  with check (is_admin() or (project_id is not null and is_project_manager(project_id) and created_by = auth.uid()));
create policy "retention policy update" on retention_policies for update
  using (is_admin() or (project_id is not null and is_project_manager(project_id)))
  with check (is_admin() or (project_id is not null and is_project_manager(project_id)));
create policy "retention policy delete" on retention_policies for delete
  using (is_admin() or (project_id is not null and is_project_manager(project_id)));

create or replace function project_backup(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not is_approved() or not has_project_access(p_project_id) then
    raise exception 'not authorized';
  end if;
  select jsonb_build_object(
    'format', 'testmanager-project-backup', 'version', 1, 'exported_at', now(),
    'project', (select to_jsonb(p) from projects p where p.id = p_project_id),
    'modules', coalesce((select jsonb_agg(to_jsonb(m)) from modules m where m.project_id = p_project_id), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(to_jsonb(t)) from tags t where t.project_id = p_project_id), '[]'::jsonb),
    'test_cases', coalesce((select jsonb_agg(to_jsonb(t)) from test_cases t where t.project_id = p_project_id), '[]'::jsonb),
    'test_case_tags', coalesce((select jsonb_agg(to_jsonb(x)) from test_case_tags x join test_cases tc on tc.id=x.test_case_id where tc.project_id=p_project_id), '[]'::jsonb),
    'test_plans', coalesce((select jsonb_agg(to_jsonb(t)) from test_plans t where t.project_id = p_project_id), '[]'::jsonb),
    'test_plan_cases', coalesce((select jsonb_agg(to_jsonb(x)) from test_plan_cases x join test_plans tp on tp.id=x.test_plan_id where tp.project_id=p_project_id), '[]'::jsonb),
    'test_runs', coalesce((select jsonb_agg(to_jsonb(t)) from test_runs t join test_plans tp on tp.id=t.test_plan_id where tp.project_id=p_project_id), '[]'::jsonb),
    'test_results', coalesce((select jsonb_agg(to_jsonb(t)) from test_results t join test_runs tr on tr.id=t.test_run_id join test_plans tp on tp.id=tr.test_plan_id where tp.project_id=p_project_id), '[]'::jsonb),
    'issues', coalesce((select jsonb_agg(to_jsonb(i)) from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id join test_plans tp on tp.id=tr.test_plan_id where tp.project_id=p_project_id), '[]'::jsonb),
    'attachments', jsonb_build_object(
      'test', coalesce((select jsonb_agg(to_jsonb(a)) from attachments a where has_project_access(attachment_project_id(a.entity_kind, coalesce(a.test_case_id,a.test_run_id))) and attachment_project_id(a.entity_kind, coalesce(a.test_case_id,a.test_run_id))=p_project_id), '[]'::jsonb),
      'issue', coalesce((select jsonb_agg(to_jsonb(a)) from issue_attachments a where has_issue_access(a.issue_id) and exists (select 1 from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id join test_plans tp on tp.id=tr.test_plan_id where i.id=a.issue_id and tp.project_id=p_project_id)), '[]'::jsonb)
    )
  ) into result;
  return result;
end;
$$;
revoke all on function project_backup(uuid) from public, anon;
grant execute on function project_backup(uuid) to authenticated;

create or replace function preview_project_restore(p_backup jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not is_approved() or p_backup->>'format' <> 'testmanager-project-backup' or (p_backup->>'version')::int <> 1 then
    raise exception 'invalid or unauthorized backup';
  end if;
  return jsonb_build_object('valid', true, 'project_name', p_backup->'project'->>'name',
    'modules', jsonb_array_length(coalesce(p_backup->'modules','[]'::jsonb)),
    'tags', jsonb_array_length(coalesce(p_backup->'tags','[]'::jsonb)),
    'test_cases', jsonb_array_length(coalesce(p_backup->'test_cases','[]'::jsonb)),
    'test_plans', jsonb_array_length(coalesce(p_backup->'test_plans','[]'::jsonb)),
    'test_runs', jsonb_array_length(coalesce(p_backup->'test_runs','[]'::jsonb)),
    'test_results', jsonb_array_length(coalesce(p_backup->'test_results','[]'::jsonb)),
    'issues', jsonb_array_length(coalesce(p_backup->'issues','[]'::jsonb)),
    'attachments', jsonb_array_length(coalesce(p_backup->'attachments'->'test','[]'::jsonb)) + jsonb_array_length(coalesce(p_backup->'attachments'->'issue','[]'::jsonb)));
end;
$$;
revoke all on function preview_project_restore(jsonb) from public, anon;
grant execute on function preview_project_restore(jsonb) to authenticated;

create or replace function restore_project_backup(p_project_id uuid, p_backup jsonb, p_confirm boolean default false, p_duplicate_mode text default 'skip')
returns jsonb language plpgsql security definer set search_path = public as $$
declare item jsonb; inserted_count integer := 0; skipped_count integer := 0;
begin
  if not p_confirm or p_duplicate_mode not in ('skip') then raise exception 'explicit confirmation and safe duplicate mode required'; end if;
  if not is_approved() or not is_project_manager(p_project_id) or p_backup->>'format' <> 'testmanager-project-backup' then raise exception 'not authorized or invalid backup'; end if;
  if not exists (select 1 from projects where id=p_project_id) then raise exception 'target project not found'; end if;
  -- The function is one database transaction. Existing IDs are skipped and all children
  -- are scoped to the selected target project; no source project can escape the scope.
  for item in select * from jsonb_array_elements(coalesce(p_backup->'modules','[]')) loop
    insert into modules(id, project_id, name, created_at, updated_at) values ((item->>'id')::uuid,p_project_id,item->>'name',coalesce((item->>'created_at')::timestamptz,now()),coalesce((item->>'updated_at')::timestamptz,now())) on conflict (id) do nothing;
    if found then inserted_count:=inserted_count+1; else skipped_count:=skipped_count+1; end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'tags','[]')) loop
    insert into tags(id, project_id, name, created_at) values ((item->>'id')::uuid,p_project_id,item->>'name',coalesce((item->>'created_at')::timestamptz,now())) on conflict (id) do nothing;
    if found then inserted_count:=inserted_count+1; else skipped_count:=skipped_count+1; end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'test_cases','[]')) loop
    insert into test_cases(id,project_id,module_id,code,title,objective,preconditions,steps,expected_result,priority,status,notes,created_at,updated_at) values ((item->>'id')::uuid,p_project_id,nullif(item->>'module_id','')::uuid,item->>'code',item->>'title',item->>'objective',item->>'preconditions',item->>'steps',item->>'expected_result',item->>'priority',item->>'status',item->>'notes',coalesce((item->>'created_at')::timestamptz,now()),coalesce((item->>'updated_at')::timestamptz,now())) on conflict (id) do nothing;
    if found then inserted_count:=inserted_count+1; else skipped_count:=skipped_count+1; end if;
  end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'test_case_tags','[]')) loop insert into test_case_tags(test_case_id,tag_id) select (item->>'test_case_id')::uuid,(item->>'tag_id')::uuid where exists(select 1 from test_cases where id=(item->>'test_case_id')::uuid and project_id=p_project_id) and exists(select 1 from tags where id=(item->>'tag_id')::uuid and project_id=p_project_id) on conflict do nothing; end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'test_plans','[]')) loop insert into test_plans(id,project_id,code,name,description,status,created_at,updated_at) values ((item->>'id')::uuid,p_project_id,item->>'code',item->>'name',item->>'description',item->>'status',coalesce((item->>'created_at')::timestamptz,now()),coalesce((item->>'updated_at')::timestamptz,now())) on conflict (id) do nothing; end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'test_plan_cases','[]')) loop insert into test_plan_cases(id,test_plan_id,test_case_id,"order") select (item->>'id')::uuid,(item->>'test_plan_id')::uuid,(item->>'test_case_id')::uuid,(item->>'order')::int where exists(select 1 from test_plans where id=(item->>'test_plan_id')::uuid and project_id=p_project_id) and exists(select 1 from test_cases where id=(item->>'test_case_id')::uuid and project_id=p_project_id) on conflict do nothing; end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'test_runs','[]')) loop insert into test_runs(id,test_plan_id,code,name,status,started_at,completed_at,created_at,updated_at) select (item->>'id')::uuid,(item->>'test_plan_id')::uuid,item->>'code',item->>'name',item->>'status',(item->>'started_at')::timestamptz,nullif(item->>'completed_at','')::timestamptz,coalesce((item->>'created_at')::timestamptz,now()),coalesce((item->>'updated_at')::timestamptz,now()) where exists(select 1 from test_plans where id=(item->>'test_plan_id')::uuid and project_id=p_project_id) on conflict do nothing; end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'test_results','[]')) loop insert into test_results(id,test_run_id,test_case_id,tester_id,status,executed_at,notes,created_at,updated_at) select (item->>'id')::uuid,(item->>'test_run_id')::uuid,(item->>'test_case_id')::uuid,nullif(item->>'tester_id','')::uuid,item->>'status',nullif(item->>'executed_at','')::timestamptz,item->>'notes',coalesce((item->>'created_at')::timestamptz,now()),coalesce((item->>'updated_at')::timestamptz,now()) where exists(select 1 from test_runs tr join test_plans tp on tp.id=tr.test_plan_id where tr.id=(item->>'test_run_id')::uuid and tp.project_id=p_project_id) on conflict do nothing; end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'issues','[]')) loop insert into issues(id,test_result_id,code,title,description,actual_result,expected_result,priority,status,assigned_to,created_at,updated_at) select (item->>'id')::uuid,(item->>'test_result_id')::uuid,item->>'code',item->>'title',item->>'description',item->>'actual_result',item->>'expected_result',item->>'priority',item->>'status',nullif(item->>'assigned_to','')::uuid,coalesce((item->>'created_at')::timestamptz,now()),coalesce((item->>'updated_at')::timestamptz,now()) where exists(select 1 from test_results r join test_runs tr on tr.id=r.test_run_id join test_plans tp on tp.id=tr.test_plan_id where r.id=(item->>'test_result_id')::uuid and tp.project_id=p_project_id) on conflict do nothing; end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'attachments'->'test','[]')) loop insert into attachments(id,entity_kind,test_case_id,test_run_id,file_name,storage_path,mime_type,size_bytes,uploaded_by,created_at) select (item->>'id')::uuid,item->>'entity_kind',nullif(item->>'test_case_id','')::uuid,nullif(item->>'test_run_id','')::uuid,item->>'file_name',item->>'storage_path',item->>'mime_type',(item->>'size_bytes')::bigint,nullif(item->>'uploaded_by','')::uuid,coalesce((item->>'created_at')::timestamptz,now()) where (item->>'entity_kind'='test_case' and exists(select 1 from test_cases where id=(item->>'test_case_id')::uuid and project_id=p_project_id)) or (item->>'entity_kind'='test_run' and exists(select 1 from test_runs tr join test_plans tp on tp.id=tr.test_plan_id where tr.id=(item->>'test_run_id')::uuid and tp.project_id=p_project_id)) on conflict do nothing; end loop;
  for item in select * from jsonb_array_elements(coalesce(p_backup->'attachments'->'issue','[]')) loop insert into issue_attachments(id,issue_id,file_name,storage_path,mime_type,size_bytes,uploaded_by,created_at) select (item->>'id')::uuid,(item->>'issue_id')::uuid,item->>'file_name',item->>'storage_path',item->>'mime_type',(item->>'size_bytes')::bigint,nullif(item->>'uploaded_by','')::uuid,coalesce((item->>'created_at')::timestamptz,now()) where exists(select 1 from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id join test_plans tp on tp.id=tr.test_plan_id where i.id=(item->>'issue_id')::uuid and tp.project_id=p_project_id) on conflict do nothing; end loop;
  insert into audit_logs(table_name,record_id,action,changed_by,new_data) values ('projects',p_project_id,'updated',auth.uid(),jsonb_build_object('operation','restore','inserted',inserted_count,'skipped',skipped_count));
  return jsonb_build_object('inserted',inserted_count,'skipped',skipped_count,'project_id',p_project_id);
end;
$$;
revoke all on function restore_project_backup(uuid,jsonb,boolean,text) from public, anon;
grant execute on function restore_project_backup(uuid,jsonb,boolean,text) to authenticated;

create or replace function preview_retention_cleanup(p_project_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare days integer; cutoff timestamptz;
begin
  if not is_approved() or (p_project_id is null and not is_admin()) or (p_project_id is not null and not has_project_access(p_project_id)) then raise exception 'not authorized'; end if;
  select coalesce((select attachment_retention_days from retention_policies where project_id=p_project_id and enabled), (select attachment_retention_days from retention_policies where project_id is null and enabled), 365) into days;
  cutoff:=now() - make_interval(days=>days);
  return jsonb_build_object('project_id',p_project_id,'attachment_cutoff',cutoff,'test_attachment_count',(select count(*) from attachments a where a.created_at<cutoff and (p_project_id is null or attachment_project_id(a.entity_kind,coalesce(a.test_case_id,a.test_run_id))=p_project_id)),'issue_attachment_count',(select count(*) from issue_attachments a where a.created_at<cutoff and (p_project_id is null or exists(select 1 from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id join test_plans tp on tp.id=tr.test_plan_id where i.id=a.issue_id and tp.project_id=p_project_id))));
end;
$$;
revoke all on function preview_retention_cleanup(uuid) from public, anon;
grant execute on function preview_retention_cleanup(uuid) to authenticated;

create or replace function cleanup_retention(p_project_id uuid, p_confirm boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare days integer; cutoff timestamptz; test_count integer; issue_count integer;
begin
  if not p_confirm then raise exception 'explicit confirmation required'; end if;
  if not is_approved() or (p_project_id is null and not is_admin()) or (p_project_id is not null and not is_project_manager(p_project_id)) then raise exception 'not authorized'; end if;
  select coalesce((select attachment_retention_days from retention_policies where project_id=p_project_id and enabled), (select attachment_retention_days from retention_policies where project_id is null and enabled), 365) into days;
  cutoff:=now()-make_interval(days=>days);
  delete from storage.objects o where (o.bucket_id='test-attachments' and exists(select 1 from attachments a where a.storage_path=o.name and a.created_at<cutoff and (p_project_id is null or attachment_project_id(a.entity_kind,coalesce(a.test_case_id,a.test_run_id))=p_project_id))) or (o.bucket_id='issue-attachments' and exists(select 1 from issue_attachments a where a.storage_path=o.name and a.created_at<cutoff and (p_project_id is null or exists(select 1 from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id join test_plans tp on tp.id=tr.test_plan_id where i.id=a.issue_id and tp.project_id=p_project_id))));
  delete from attachments a where a.created_at<cutoff and (p_project_id is null or attachment_project_id(a.entity_kind,coalesce(a.test_case_id,a.test_run_id))=p_project_id); get diagnostics test_count=row_count;
  delete from issue_attachments a where a.created_at<cutoff and (p_project_id is null or exists(select 1 from issues i join test_results r on r.id=i.test_result_id join test_runs tr on tr.id=r.test_run_id join test_plans tp on tp.id=tr.test_plan_id where i.id=a.issue_id and tp.project_id=p_project_id)); get diagnostics issue_count=row_count;
  insert into audit_logs(table_name,record_id,action,changed_by,new_data) values ('retention_cleanup',p_project_id,'deleted',auth.uid(),jsonb_build_object('cutoff',cutoff,'test_attachments',test_count,'issue_attachments',issue_count));
  return jsonb_build_object('test_attachments',test_count,'issue_attachments',issue_count,'cutoff',cutoff);
end;
$$;
revoke all on function cleanup_retention(uuid,boolean) from public, anon;
grant execute on function cleanup_retention(uuid,boolean) to authenticated;
