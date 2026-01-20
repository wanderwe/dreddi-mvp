alter table promises
  add column stake_level text not null default 'normal',
  add column stake_reason text null;

alter table promises
  add constraint promises_stake_level_check
    check (stake_level in ('normal', 'high')),
  add constraint promises_stake_reason_check
    check (stake_reason is null or stake_reason in ('deadline', 'public', 'reputation_impact', 'history')),
  add constraint promises_stake_high_requires_reason
    check (stake_level = 'normal' or stake_reason is not null);

create index promises_stake_level_idx on promises (stake_level);
