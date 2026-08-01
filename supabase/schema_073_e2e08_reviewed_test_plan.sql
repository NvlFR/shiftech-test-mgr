-- E2E-08: form an explicitly approved Test Plan from human-reviewed AI cases.
-- Run manually after schema_072_e2e07_close_approval_bypass.sql.

alter table test_plans
  add column if not exists approved_by uuid references profiles(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table test_plans drop constraint if exists test_plans_approval_metadata_check;
alter table test_plans add constraint test_plans_approval_metadata_check
  check ((approved_by is null and approved_at is null) or (approved_by is not null and approved_at is not null)) not valid;

create or replace function create_approved_test_plan_from_reviewed_cases(
  p_project_id uuid,
  p_name text,
  p_description text,
  p_test_case_ids uuid[],
  p_explicit_approval boolean
)
returns test_plans
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_plan test_plans%rowtype;
  v_case_count integer;
begin
  if p_explicit_approval is distinct from true then
    raise exception 'Persetujuan Test Plan harus diberikan secara eksplisit';
  end if;
  if auth.uid() is null then raise exception 'Sesi user diperlukan untuk menyetujui Test Plan'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Nama Test Plan tidak boleh kosong'; end if;
  if coalesce(array_length(p_test_case_ids, 1), 0) = 0 then raise exception 'Pilih minimal satu test case'; end if;
  if array_length(p_test_case_ids, 1) <> (select count(distinct id) from unnest(p_test_case_ids) as ids(id)) then
    raise exception 'Test case duplikat tidak diperbolehkan';
  end if;

  select count(*) into v_case_count
  from test_cases
  where id = any(p_test_case_ids)
    and project_id = p_project_id
    and source = 'ai'
    and status = 'active'
    and review_decision = 'approved'
    and reviewed_by is not null
    and reviewed_at is not null;

  if v_case_count <> array_length(p_test_case_ids, 1) then
    raise exception 'Test Plan hanya dapat dibentuk dari test case AI yang lolos review';
  end if;

  insert into test_plans(project_id, name, description, status, created_by, approved_by, approved_at)
  values (p_project_id, trim(p_name), nullif(trim(p_description), ''), 'active', auth.uid(), auth.uid(), now())
  returning * into v_plan;

  insert into test_plan_cases(test_plan_id, test_case_id, "order")
  select v_plan.id, ids.id, ids.ordinality - 1
  from unnest(p_test_case_ids) with ordinality as ids(id, ordinality);

  return v_plan;
end;
$$;

revoke all on function create_approved_test_plan_from_reviewed_cases(uuid, text, text, uuid[], boolean) from public, anon;
grant execute on function create_approved_test_plan_from_reviewed_cases(uuid, text, text, uuid[], boolean) to authenticated;

create or replace function approve_test_plan(p_test_plan_id uuid, p_explicit_approval boolean)
returns test_plans
language plpgsql
security invoker
set search_path = public
as $$
declare v_plan test_plans%rowtype;
begin
  if p_explicit_approval is distinct from true then
    raise exception 'Persetujuan Test Plan harus diberikan secara eksplisit';
  end if;
  if auth.uid() is null then raise exception 'Sesi user diperlukan untuk menyetujui Test Plan'; end if;

  update test_plans
  set status = 'active', approved_by = auth.uid(), approved_at = now()
  where id = p_test_plan_id and status <> 'active'
  returning * into v_plan;
  if not found then raise exception 'Test Plan tidak ditemukan atau sudah aktif'; end if;
  return v_plan;
end;
$$;

revoke all on function approve_test_plan(uuid, boolean) from public, anon;
grant execute on function approve_test_plan(uuid, boolean) to authenticated;
