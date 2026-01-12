alter table promises add column if not exists due_precision text not null default 'date';

alter table promises add constraint promises_due_precision_valid
  check (due_precision in ('date', 'datetime'));
