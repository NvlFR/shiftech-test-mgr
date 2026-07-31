-- Keep every notification operation scoped to an approved recipient and allow
-- that recipient to dismiss their own notifications.
-- Run after schema_039_issue_editor_metadata.sql.

drop policy if exists "users read own notifications" on notifications;
create policy "users read own notifications"
on notifications
for select
using (recipient_id = auth.uid() and is_approved());

drop policy if exists "users update own notifications" on notifications;
create policy "users update own notifications"
on notifications
for update
using (recipient_id = auth.uid() and is_approved())
with check (recipient_id = auth.uid() and is_approved());

drop policy if exists "users delete own notifications" on notifications;
create policy "users delete own notifications"
on notifications
for delete
using (recipient_id = auth.uid() and is_approved());
