-- Activity feed, comment mention notifications, and realtime publication.
-- Run after schema_031_structured_steps_custom_runs.sql.

alter table notifications add column if not exists comment_id uuid references comments(id) on delete cascade;
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in ('issue_assigned', 'issue_status_changed', 'comment_mentioned'));
create index if not exists idx_notifications_comment on notifications(comment_id) where comment_id is not null;

-- Keep activity project-scoped for custom runs and comments as well as plan runs.
create or replace function audit_log_project_id(p_table_name text, p_record_id uuid)
returns uuid as $$
declare result_project_id uuid;
begin
  case p_table_name
    when 'projects' then select id into result_project_id from projects where id = p_record_id;
    when 'test_plans' then select project_id into result_project_id from test_plans where id = p_record_id;
    when 'test_cases' then select project_id into result_project_id from test_cases where id = p_record_id;
    when 'modules' then select project_id into result_project_id from modules where id = p_record_id;
    when 'tags' then select project_id into result_project_id from tags where id = p_record_id;
    when 'test_runs' then select coalesce(tp.project_id, tr.custom_project_id) into result_project_id from test_runs tr left join test_plans tp on tp.id = tr.test_plan_id where tr.id = p_record_id;
    when 'test_results' then select coalesce(tp.project_id, tr.custom_project_id) into result_project_id from test_results r join test_runs tr on tr.id = r.test_run_id left join test_plans tp on tp.id = tr.test_plan_id where r.id = p_record_id;
    when 'issues' then select coalesce(tp.project_id, tr.custom_project_id) into result_project_id from issues i join test_results r on r.id = i.test_result_id join test_runs tr on tr.id = r.test_run_id left join test_plans tp on tp.id = tr.test_plan_id where i.id = p_record_id;
    when 'comments' then select project_id into result_project_id from comments where id = p_record_id;
    else result_project_id := null;
  end case;
  return result_project_id;
end;
$$ language plpgsql security definer set search_path = public stable;

create or replace function comment_target_project_id(p_target_type text, p_target_id uuid)
returns uuid as $$
  select case
    when p_target_type = 'test_case' then (select project_id from test_cases where id = p_target_id)
    when p_target_type = 'issue' then (
      select coalesce(tp.project_id, tr.custom_project_id)
      from issues i join test_results r on r.id = i.test_result_id join test_runs tr on tr.id = r.test_run_id left join test_plans tp on tp.id = tr.test_plan_id
      where i.id = p_target_id
    )
    else null
  end;
$$ language sql security definer set search_path = public stable;

create or replace function notify_comment_mentions()
returns trigger as $$
declare comment_row comments;
begin
  select * into comment_row from comments where id = new.comment_id;
  if comment_row.author_id is distinct from new.mentioned_user_id then
    insert into notifications(recipient_id, comment_id, kind, message)
    values (new.mentioned_user_id, new.comment_id, 'comment_mentioned', 'Anda disebut dalam komentar pada project ini.');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_comment_mention_notifications on comment_mentions;
create trigger trg_comment_mention_notifications after insert on comment_mentions
for each row execute function notify_comment_mentions();

-- Existing audit trigger covers the main domain tables. Add comments so the
-- project activity feed also captures collaboration events.
drop trigger if exists trg_audit_log_comments on comments;
create trigger trg_audit_log_comments after insert or update or delete on comments
for each row execute function write_audit_log();

alter table audit_logs replica identity full;
alter table comments replica identity full;
alter table notifications replica identity full;

do $$
declare table_name text;
begin
  foreach table_name in array array['audit_logs', 'comments', 'comment_mentions', 'notifications'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;
