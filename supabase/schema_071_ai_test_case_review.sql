-- E2E-05: persistent human-review batches for AI-generated test cases.
-- Run manually after schema_070_ai_test_case_drafts.sql.

alter table test_cases
  add column if not exists ai_batch_id uuid,
  add column if not exists review_decision text,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table test_cases drop constraint if exists test_cases_review_decision_check;
alter table test_cases add constraint test_cases_review_decision_check
  check (review_decision is null or review_decision in ('approved', 'rejected'));

create index if not exists idx_test_cases_ai_review_queue
  on test_cases(project_id, ai_batch_id, created_at)
  where source = 'ai' and status = 'draft' and review_decision is null;

create or replace function review_ai_test_cases(p_test_case_ids uuid[], p_decision text)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Keputusan review tidak valid';
  end if;
  if coalesce(array_length(p_test_case_ids, 1), 0) = 0 then
    raise exception 'Pilih minimal satu test case';
  end if;

  update test_cases
  set status = case when p_decision = 'approved' then 'active' else 'archived' end,
      review_decision = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = any(p_test_case_ids)
    and source = 'ai'
    and status = 'draft'
    and review_decision is null;

  get diagnostics v_updated = row_count;
  if v_updated <> array_length(p_test_case_ids, 1) then
    raise exception 'Sebagian test case tidak lagi menunggu review';
  end if;
  return v_updated;
end;
$$;

revoke all on function review_ai_test_cases(uuid[], text) from public, anon;
grant execute on function review_ai_test_cases(uuid[], text) to authenticated;
