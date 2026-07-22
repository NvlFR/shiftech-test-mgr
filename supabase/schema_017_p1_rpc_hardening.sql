-- Remove authenticated RPC access from P1 RLS/trigger helpers.

revoke execute on function public.can_manage_comments(uuid) from authenticated;
revoke execute on function public.comment_target_project_id(text, uuid) from authenticated;
revoke execute on function public.validate_comment_target_project() from authenticated;
revoke execute on function public.set_comment_updated_at() from authenticated;
revoke execute on function public.attachment_project_id(text, uuid) from authenticated;
revoke execute on function public.can_upload_attachment(text, uuid) from authenticated;
revoke execute on function public.can_delete_attachment(text, uuid) from authenticated;
revoke execute on function public.validate_requirement_link_project() from authenticated;
