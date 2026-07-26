-- Storage for automation artifacts (screenshot/video/trace/log).
-- Object path convention: {project_id}/{job_id}/{filename}
--
-- Uploads are performed by the Local Runner using short-lived SIGNED UPLOAD URLs
-- minted by the `automation-artifacts` Edge Function (service role, server-side).
-- Therefore no INSERT policy is granted to anon/authenticated here; only project
-- members may READ objects so the UI can generate signed download URLs.

insert into storage.buckets (id, name, public)
values ('automation-artifacts', 'automation-artifacts', false)
on conflict (id) do update set public = false;

drop policy if exists "automation artifacts storage select" on storage.objects;
create policy "automation artifacts storage select" on storage.objects
  for select using (
    bucket_id = 'automation-artifacts'
    and has_project_access((split_part(name, '/', 1))::uuid)
  );
