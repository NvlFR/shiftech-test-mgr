-- Separate explicitly rejected users from newly registered users awaiting review.
-- Run after schema_040_notification_delete_policy.sql.

alter table profiles drop constraint if exists profiles_role_check;

alter table profiles
  add constraint profiles_role_check
  check (role in ('pending', 'rejected', 'user', 'admin'));
