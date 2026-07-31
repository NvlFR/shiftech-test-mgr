-- Allow invited users to read only basic project metadata for their invitation UI.
drop policy if exists "invited users - projects select" on projects;
create policy "invited users - projects select" on projects for select
  using (exists (
    select 1 from project_members
    where project_id = id and user_id = auth.uid() and status = 'invited'
  ));
