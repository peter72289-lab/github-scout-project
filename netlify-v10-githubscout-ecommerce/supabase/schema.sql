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

-- PII-free record of what the detection engine did, one row per scan, written
-- for anonymous and signed-in scans alike (netlify/functions/lib/telemetry.js).
-- Deliberately NOT linked to accounts or scans: there is no key here that joins
-- back to a customer. `store_hash` is an HMAC-SHA256 of the normalized
-- storefront hostname keyed with SCAN_TELEMETRY_SALT, and is null when that
-- secret is unset — never a bare digest, which a domain list would reverse.
-- Retained 24 months, purged daily by netlify/functions/cleanup-scheduled.js.
-- See docs/DATA-RETENTION.md.
create table if not exists scan_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  rules_version text,                            -- lib/rules.js RULES_VERSION at scan time
  depth text not null default 'teaser',          -- teaser | full (what was served)
  store_hash text,                               -- keyed hostname digest, or null
  shopify_confirmed boolean not null default false,
  crawl_ok boolean not null default false,
  crawl_blocked boolean not null default false,
  blocked_by text,                               -- bot-protection vendor, when named
  blocked_reason text,                           -- http-status | challenge-page | low-success-ratio
  pages_fetched int not null default 0,          -- count only; the URLs are not stored
  sources_live int not null default 0,
  sources_succeeded int not null default 0,
  source_results jsonb not null default '[]'::jsonb,   -- [{id, ok}] per source, no detail strings
  detections jsonb not null default '[]'::jsonb,       -- [{id, strength, confidence}], no evidence trails
  detected_count int not null default 0,
  strength_counts jsonb not null default '{}'::jsonb,
  savings_suppressed_reason text,
  duration_ms int
);
create index if not exists scan_events_occurred_idx on scan_events (occurred_at desc);
create index if not exists scan_events_store_idx on scan_events (store_hash, occurred_at desc);

-- Ground truth: a customer telling us a detection was right or wrong. This is
-- the one signal no competitor can collect for this ruleset, so unlike
-- scan_events it is deliberately identified — an anonymous verdict is spam.
-- One row per (account, scan, signature): the unique constraint makes the
-- endpoint idempotent, so changing an answer updates rather than duplicates.
-- Cascades away with the account on erasure (netlify/functions/account-delete.js).
create table if not exists detection_feedback (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  scan_id uuid not null references scans(id) on delete cascade,
  signature_id text not null,                    -- lib/rules.js appSignatures[].id
  verdict text not null,                         -- correct | incorrect | unsure
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, scan_id, signature_id)
);
create index if not exists detection_feedback_signature_idx on detection_feedback (signature_id, verdict);

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

-- Release a reservation taken by usage_increment for a scan that produced no
-- evidence (blocked or failed crawl). See netlify/functions/operator-url-scan.js
-- reserveQuota() for why the credit is taken up front and released here rather
-- than checked first: usage_increment must stay the single atomic gate.
-- Floored at zero so a replayed or duplicated release can never mint credits.
-- Returns {released, used}.
create or replace function usage_decrement(p_account_id uuid, p_period text)
returns json language plpgsql as $$
declare v_used int;
begin
  update usage set used = greatest(0, used - 1)
  where account_id = p_account_id and period = p_period
  returning used into v_used;
  if v_used is null then
    return json_build_object('released', false, 'used', 0);
  end if;
  return json_build_object('released', true, 'used', v_used);
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
alter table scan_events enable row level security;
alter table detection_feedback enable row level security;
alter table usage enable row level security;
alter table rate_limits enable row level security;
alter table stripe_events enable row level security;

-- Housekeeping (run periodically or via pg_cron):
--   delete from magic_links where expires_at < now() - interval '1 day';
--   delete from sessions where expires_at < now();
--   delete from rate_limits where window_start < now() - interval '1 hour';
--   delete from scan_events where occurred_at < now() - interval '24 months';
-- netlify/functions/cleanup-scheduled.js already runs all four daily.
