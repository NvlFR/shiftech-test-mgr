-- PW-15: include structured manual steps in the local codegen Test Case payload.
-- Run manually after schema_066_pw14_runner_codegen.sql.

create or replace function list_runner_codegen_test_cases(p_token text)
returns jsonb as $$
declare v_runner automation_runners%rowtype;
begin
  select * into v_runner from automation_runners
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and active = true;
  if not found then raise exception 'INVALID_RUNNER_TOKEN'; end if;

  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', tc.id,
    'code', tc.code,
    'title', tc.title,
    'script_ref', script.script_ref,
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'step_number', step.step_number,
        'action', step.action,
        'expected_result', step.expected_result
      ) order by step.step_number)
      from test_case_steps step
      where step.test_case_id = tc.id
    ), '[]'::jsonb)
  ) order by tc.code), '[]'::jsonb)
  from test_cases tc
  left join automation_scripts script on script.test_case_id = tc.id
  where tc.project_id = v_runner.project_id and tc.status = 'active');
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on function list_runner_codegen_test_cases(text) from public;
grant execute on function list_runner_codegen_test_cases(text) to anon;
