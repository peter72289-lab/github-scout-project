-- GitHub Scout — Supabase schema v2
-- Run in the Supabase SQL editor. Service-role key is used by Netlify
-- functions only; RLS denies all anon access by default.

create extension if not exists pgcrypto;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists magic_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists magic_links_token_idx on magic_links (token_hash);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_token_idx on sessions (token_hash);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'operator',       -- operator | director | unresolved (command is retired; see netlify/functions/lib/plans.js)
  status text not null default 'active',        -- active | trialing | past_due | canceled | needs_review (plan could not be resolved from the Stripe session)
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_account_idx on subscriptions (account_id, status);

create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  store_url text,
  depth text not null default 'teaser',
  report jsonb not null,
  detected_count int not null default 0,
  evidence_score int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists scans_account_idx on scans (account_id, created_at desc);

create table if not exists usage (
  account_id uuid not null references accounts(id) on delete cascade,
  period text not null,                          -- 'YYYY-MM'
  used int not null default 0,
  primary key (account_id, period)
);

create table if not exists rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Stripe event idempotency: a webhook may deliver the same event more than once.
create table if not exists stripe_events (
  id text primary key,                           -- Stripe event id (evt_...)
  type text,
  processed_at timestamptz not null default now()
);

-- Atomic monthly quota increment. Returns {allowed, used}.
create or replace function usage_increment(p_account_id uuid, p_period text, p_max int)
returns json language plpgsql as $$
declare v_used int;
begin
  insert into usage (account_id, period, used) values (p_account_id, p_period, 1)
  on conflict (account_id, period) do update set used = usage.used + 1
  returning used into v_used;
  if v_used > p_max then
    update usage set used = used - 1 where account_id = p_account_id and period = p_period;
    return json_build_object('allowed', false, 'used', v_used - 1);
  end if;
  return json_build_object('allowed', true, 'used', v_used);
end $$;

-- Atomic shared rate limit (fixed window). Returns {allowed, remaining}.
create or replace function rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns json language plpgsql as $$
declare v_count int; v_start timestamptz;
begin
  insert into rate_limits (key, count, window_start) values (p_key, 1, now())
  on conflict (key) do update set
    count = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rate_limits.count + 1 end,
    window_start = case when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now() else rate_limits.window_start end
  returning count into v_count;
  return json_build_object('allowed', v_count <= p_max, 'remaining', greatest(0, p_max - v_count));
end $$;

-- Lock everything down: functions use the service role; no anon access.
alter table accounts enable row level security;
alter table magic_links enable row level security;
alter table sessions enable row level security;
alter table subscriptions enable row level security;
alter table scans enable row level security;
alter table usage enable row level security;
alter table rate_limits enable row level security;
alter table stripe_events enable row level security;

-- Housekeeping (run periodically or via pg_cron):
--   delete from magic_links where expires_at < now() - interval '1 day';
--   delete from sessions where expires_at < now();
--   delete from rate_limits where window_start < now() - interval '1 hour';
