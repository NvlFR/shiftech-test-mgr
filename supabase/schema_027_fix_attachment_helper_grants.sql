-- Fix: attachment RLS helper functions lost EXECUTE for the `authenticated`
-- role (an over-broad revoke in earlier hardening). They are SECURITY DEFINER
-- and are called INSIDE the RLS policies on `attachments` and `storage.objects`
-- (test-attachments bucket), which evaluate as the calling role — so the caller
-- must hold EXECUTE. Without it, any authenticated read/write touching those
-- policies fails with "permission denied for function attachment_project_id".
--
-- These mirror the other RLS helpers (has_project_access, has_issue_access, ...)
-- which are already executable by authenticated. They return only a project id
-- or a boolean and enforce access themselves, so granting EXECUTE is safe.

grant execute on function public.attachment_project_id(text, uuid) to authenticated;
grant execute on function public.can_upload_attachment(text, uuid) to authenticated;
grant execute on function public.can_delete_attachment(text, uuid) to authenticated;
