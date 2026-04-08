alter table public.feedback
  drop constraint if exists feedback_message_check;

alter table public.feedback
  drop constraint if exists feedback_message_length_check;

alter table public.feedback
  add constraint feedback_message_length_check
  check (length(btrim(message)) >= 5);
