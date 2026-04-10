alter table promises
  add column if not exists disputed_by uuid references auth.users(id);

alter table promises
  drop constraint if exists promises_dispute_code_valid;

alter table promises
  add constraint promises_dispute_code_valid
  check (disputed_code is null or disputed_code in ('not_completed','partial','late','other','not_delivered'));
