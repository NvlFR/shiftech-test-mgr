-- P1 collaboration: duplicate support and comments/mentions.
-- Run after all existing schema files, including project roles.

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  target_type text not null check (target_type in ('test_case', 'issue')),
  target_id uuid not null,
  author_id uuid not null references profiles(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_comments_target on comments (target_type, target_id, created_at desc);
create index if not exists idx_comments_project on comments (project_id, created_at desc);

create table if not exists comment_mentions (
  comment_id uuid not null references comments(id) on delete cascade,
  mentioned_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, mentioned_user_id)
);

create index if not exists idx_comment_mentions_user on comment_mentions (mentioned_user_id, created_at desc);

create or replace function can_manage_comments(p_project_id uuid)
returns boolean as $$
  select is_admin() or exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and role in ('manager', 'supervisor')
  );
$$ language sql security definer set search_path = public stable;

create or replace function comment_target_project_id(p_target_type text, p_target_id uuid)
returns uuid as $$
  select case
    when p_target_type = 'test_case' then (select project_id from test_cases where id = p_target_id)
    when p_target_type = 'issue' then (
      select tp.project_id
      from issues i
      join test_results r on r.id = i.test_result_id
      join test_runs tr on tr.id = r.test_run_id
      join test_plans tp on tp.id = tr.test_plan_id
      where i.id = p_target_id
    )
    else null
  end;
$$ language sql security definer set search_path = public stable;

create or replace function validate_comment_target_project()
returns trigger as $$
begin
  if comment_target_project_id(new.target_type, new.target_id) is distinct from new.project_id then
    raise exception 'Comment target harus berada pada project yang sama';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_validate_comment_target_project on comments;
create trigger trg_validate_comment_target_project
before insert or update on comments
for each row execute function validate_comment_target_project();

create or replace function set_comment_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_comments_updated_at on comments;
create trigger trg_comments_updated_at before update on comments
for each row execute function set_comment_updated_at();

alter table comments enable row level security;
alter table comment_mentions enable row level security;

drop policy if exists "project members - comments select" on comments;
create policy "project members - comments select" on comments for select
  using (has_project_access(project_id));
drop policy if exists "project members - comments insert" on comments;
create policy "project members - comments insert" on comments for insert
  with check (has_project_access(project_id) and author_id = auth.uid());
drop policy if exists "comment authors - comments update" on comments;
create policy "comment authors - comments update" on comments for update
  using (author_id = auth.uid() or can_manage_comments(project_id))
  with check (author_id = auth.uid() or can_manage_comments(project_id));
drop policy if exists "comment authors - comments delete" on comments;
create policy "comment authors - comments delete" on comments for delete
  using (author_id = auth.uid() or can_manage_comments(project_id));

drop policy if exists "project members - comment mentions select" on comment_mentions;
create policy "project members - comment mentions select" on comment_mentions for select
  using (exists (select 1 from comments c where c.id = comment_id and has_project_access(c.project_id)));
drop policy if exists "comment authors - comment mentions insert" on comment_mentions;
create policy "comment authors - comment mentions insert" on comment_mentions for insert
  with check (exists (
    select 1 from comments c
    join profiles p on p.id = mentioned_user_id
    where c.id = comment_id and c.author_id = auth.uid() and p.deleted_at is null and p.role in ('user', 'admin')
  ));
drop policy if exists "comment authors - comment mentions delete" on comment_mentions;
create policy "comment authors - comment mentions delete" on comment_mentions for delete
  using (exists (select 1 from comments c where c.id = comment_id and (c.author_id = auth.uid() or can_manage_comments(c.project_id))));
