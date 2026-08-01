-- PW-14: expose Test Case selection and script mapping to the local codegen CLI.
-- Run manually after schema_065_pw13_manual_test_retry.sql.

create or replace function list_runner_codegen_test_cases(p_token text)
returns jsonb as $$
declare v_runner automation_runners%rowtype;
begin
  select * into v_runner from automation_runners
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and active = true;
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', tc.id, 'code', tc.code, 'title', tc.title, 'script_ref', script.script_ref
  ) order by tc.code), '[]'::jsonb)
  from test_cases tc
  left join automation_scripts script on script.test_case_id = tc.id
  where tc.project_id = v_runner.project_id and tc.status = 'active');
end;
$$ language plpgsql security definer set search_path = public, extensions;

create or replace function attach_runner_codegen_script(p_token text, p_test_case_id uuid, p_script_ref text)
returns jsonb as $$
declare v_runner automation_runners%rowtype; v_script automation_scripts%rowtype;
begin
  select * into v_runner from automation_runners
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and active = true;
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;
  if char_length(trim(coalesce(p_script_ref, ''))) not between 1 and 500 then raise exception 'INVALID_SCRIPT_REF'; end if;
  if not exists(select 1 from test_cases where id = p_test_case_id and project_id = v_runner.project_id and status = 'active') then
    raise exception 'TEST_CASE_NOT_FOUND';
  end if;

  insert into automation_scripts(project_id, test_case_id, script_ref, runner_labels, created_by)
  values(v_runner.project_id, p_test_case_id, trim(p_script_ref), '{}', v_runner.created_by)
  on conflict(test_case_id) do update set script_ref = excluded.script_ref
  returning * into v_script;
  return jsonb_build_object('test_case_id', v_script.test_case_id, 'script_ref', v_script.script_ref);
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on function list_runner_codegen_test_cases(text), attach_runner_codegen_script(text, uuid, text) from public;
grant execute on function list_runner_codegen_test_cases(text), attach_runner_codegen_script(text, uuid, text) to anon;
