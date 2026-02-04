alter table promises
  add column if not exists promise_mode text not null default 'deal';

alter table promises
  drop constraint if exists promises_promise_mode_check;

alter table promises
  add constraint promises_promise_mode_check
  check (promise_mode in ('deal', 'request'));

update promises
set promise_mode = case
  when promise_type = 'assignment' then 'request'
  when promise_type = 'deal' then 'deal'
  else 'deal'
end
where promise_mode is null
  or promise_mode not in ('deal', 'request');
