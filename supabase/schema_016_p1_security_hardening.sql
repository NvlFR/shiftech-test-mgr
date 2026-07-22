-- P1 security hardening. Run after schema_015_requirement_traceability.sql.
-- These helpers are used by RLS/triggers and must not be callable through
-- the anonymous REST RPC surface.

revoke execute on function public.can_manage_comments(uuid) from public, anon;
revoke execute on function public.comment_target_project_id(text, uuid) from public, anon;
revoke execute on function public.validate_comment_target_project() from public, anon;
revoke execute on function public.set_comment_updated_at() from public, anon;
revoke execute on function public.attachment_project_id(text, uuid) from public, anon;
revoke execute on function public.can_upload_attachment(text, uuid) from public, anon;
revoke execute on function public.can_delete_attachment(text, uuid) from public, anon;
revoke execute on function public.validate_requirement_link_project() from public, anon;
