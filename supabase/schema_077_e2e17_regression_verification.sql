-- E2E-17: verify a resolved Issue from a completed selective regression run.
-- Run after schema_076_e2e15_regression_selection.sql. Do not run automatically.

alter table issues
  add column if not exists verified_test_run_id uuid references test_runs(id) on delete set null;

create index if not exists idx_issues_verified_test_run
  on issues(verified_test_run_id) where verified_test_run_id is not null;

create or replace function mcp_verify_regression(
  p_token text,
  p_project_id uuid,
  p_issue_id uuid,
  p_test_run_id uuid
)
returns jsonb as $$
declare
  v_issue issues%rowtype;
  v_previous_result test_results%rowtype;
  v_new_result test_results%rowtype;
  v_run test_runs%rowtype;
  v_author uuid;
  v_comment comments%rowtype;
  v_body text;
begin
  if not mcp_automation_write_allowed(p_token, p_project_id) then
    raise exception 'MCP_WRITE_FORBIDDEN';
  end if;

  select issue.* into v_issue
    from issues issue
    join test_results previous_result on previous_result.id = issue.test_result_id
    join test_runs previous_run on previous_run.id = previous_result.test_run_id
    left join test_plans previous_plan on previous_plan.id = previous_run.test_plan_id
   where issue.id = p_issue_id and issue.status = 'resolved'
     and previous_result.status = 'fail'
     and coalesce(previous_plan.project_id, previous_run.custom_project_id) = p_project_id
   for update of issue;
  if not found then raise exception 'RESOLVED_ISSUE_NOT_FOUND'; end if;
  select * into v_previous_result from test_results where id = v_issue.test_result_id;

  select * into v_run from test_runs
   where id = p_test_run_id and status = 'completed' and custom_project_id = p_project_id
     and exists (
       select 1 from audit_logs audit
        where audit.table_name = 'mcp.automation.rerun_failed'
          and audit.record_id = p_test_run_id and audit.project_id = p_project_id
          and audit.new_data->>'issue_id' = p_issue_id::text
     )
   for update;
  if not found then raise exception 'COMPLETED_REGRESSION_RUN_NOT_FOUND'; end if;

  select * into v_new_result from test_results
   where test_run_id = v_run.id and test_case_id = v_previous_result.test_case_id;
  if not found or v_new_result.status not in ('pass', 'fail') then
    raise exception 'REGRESSION_RESULT_NOT_VERIFIABLE';
  end if;

  select created_by into v_author from api_tokens
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and revoked_at is null;

  if v_new_result.status = 'pass' then
    update issues
       set status = 'verified', verified_test_run_id = v_run.id
     where id = v_issue.id;
    insert into audit_logs(table_name, record_id, project_id, action, changed_by, new_data)
    values('mcp.automation.verify_regression', v_issue.id, p_project_id, 'updated', v_author,
      jsonb_build_object('agent_action', 'issue_verified', 'issue_id', v_issue.id,
        'test_run_id', v_run.id, 'test_run_code', v_run.code,
        'test_result_id', v_new_result.id, 'result', 'pass'));
    return jsonb_build_object('issue_id', v_issue.id, 'status', 'verified',
      'outcome', 'verified', 'verified_test_run_id', v_run.id,
      'verified_test_run_code', v_run.code, 'test_result_id', v_new_result.id);
  end if;

  v_body := concat(
    'Regression verification failed; Issue reopened.', E'\n\n',
    'Previous failure', E'\n',
    '- Test Result: ', v_previous_result.id, E'\n',
    '- Actual: ', coalesce(nullif(v_issue.actual_result, ''), nullif(v_previous_result.notes, ''), '(not recorded)'), E'\n',
    '- Evidence: ', coalesce(v_previous_result.automation_artifacts::text, '[]'), E'\n\n',
    'New regression failure', E'\n',
    '- Test Run: ', v_run.code, ' (', v_run.id, ')', E'\n',
    '- Test Result: ', v_new_result.id, E'\n',
    '- Actual: ', coalesce(nullif(v_new_result.notes, ''), '(not recorded)'), E'\n',
    '- Evidence: ', coalesce(v_new_result.automation_artifacts::text, '[]'), E'\n\n',
    'Comparison', E'\n',
    case
      when coalesce(v_previous_result.notes, '') = coalesce(v_new_result.notes, '')
        then '- Failure notes are unchanged from the previous failure.'
      else '- Failure notes differ; compare the actual results and artifact bundles above.'
    end
  );
  if char_length(v_body) > 5000 then v_body := left(v_body, 4997) || '...'; end if;

  update issues set status = 'open', verified_test_run_id = null where id = v_issue.id;
  insert into comments(project_id, target_type, target_id, author_id, body)
  values(p_project_id, 'issue', v_issue.id, v_author, v_body)
  returning * into v_comment;
  insert into audit_logs(table_name, record_id, project_id, action, changed_by, new_data)
  values('mcp.automation.verify_regression', v_issue.id, p_project_id, 'updated', v_author,
    jsonb_build_object('agent_action', 'regression_failed', 'issue_id', v_issue.id,
      'test_run_id', v_run.id, 'test_run_code', v_run.code,
      'test_result_id', v_new_result.id, 'result', 'fail', 'comment_id', v_comment.id));
  return jsonb_build_object('issue_id', v_issue.id, 'status', 'open',
    'outcome', 'reopened', 'test_run_id', v_run.id,
    'test_run_code', v_run.code, 'test_result_id', v_new_result.id,
    'comment_id', v_comment.id);
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on function mcp_verify_regression(text, uuid, uuid, uuid) from public;
grant execute on function mcp_verify_regression(text, uuid, uuid, uuid) to anon;

comment on column issues.verified_test_run_id is
  'Completed regression Test Run that proved the Issue verification.';
