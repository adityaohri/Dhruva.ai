-- Create profile_audit_activity table
create table if not exists public.profile_audit_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Activity classification
  activity_type text not null, -- gap_analysis / plan_created / plan_updated / action_completed / chat_message

  -- Gap analysis details
  target_role text,
  target_company text,
  target_industry text,
  gaps_found jsonb,         -- array/object of gaps
  strengths_found jsonb,    -- array/object of strengths
  benchmark_data_source text, -- e.g. pdl / cache / mixed

  -- Plan details
  plan_sections jsonb,              -- e.g. [{section: 'Work-Ex', actions: [...]}, ...]
  timeframe_weeks integer,
  actions jsonb,                    -- full list of actions in the plan
  completed_actions jsonb,          -- subset of actions marked complete
  completion_percentage numeric,    -- 0–100

  -- Chat context
  chat_history jsonb,               -- full message history
  chat_summary text,
  last_chat_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_audit_activity enable row level security;

-- RLS: users can only read/write their own rows
create policy "profile_audit_activity_select_own"
  on public.profile_audit_activity
  for select
  using (auth.uid() = user_id);

create policy "profile_audit_activity_insert_own"
  on public.profile_audit_activity
  for insert
  with check (auth.uid() = user_id);

create policy "profile_audit_activity_update_own"
  on public.profile_audit_activity
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profile_audit_activity_delete_own"
  on public.profile_audit_activity
  for delete
  using (auth.uid() = user_id);

create index if not exists profile_audit_activity_user_id_idx
  on public.profile_audit_activity (user_id);

create index if not exists profile_audit_activity_created_at_idx
  on public.profile_audit_activity (created_at);

create index if not exists profile_audit_activity_updated_at_idx
  on public.profile_audit_activity (updated_at);


-- Create opportunity_activity table
create table if not exists public.opportunity_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Activity classification
  activity_type text not null, -- job_match / signal / hidden_post

  -- Job details (formal postings and matches)
  job_id uuid,                 -- reference to jobs_index.id if applicable
  job_title text,
  job_company text,
  job_url text,
  job_source text,             -- e.g. jobs_index / external
  job_industry text,
  job_location text,
  job_experience_level text,

  -- Signal details
  signal_id uuid,              -- references signals_index.id
  signal_type text,
  signal_company text,
  signal_strength text,

  -- LinkedIn post details (hidden posts)
  linkedin_post_id uuid,       -- references linkedin_hiring_posts.id
  linkedin_company text,
  linkedin_role text,

  -- User action
  user_action text not null,   -- viewed / liked / wishlisted / applied / dismissed / clicked_post

  created_at timestamptz not null default now()
);

alter table public.opportunity_activity enable row level security;

create policy "opportunity_activity_select_own"
  on public.opportunity_activity
  for select
  using (auth.uid() = user_id);

create policy "opportunity_activity_insert_own"
  on public.opportunity_activity
  for insert
  with check (auth.uid() = user_id);

create policy "opportunity_activity_update_own"
  on public.opportunity_activity
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "opportunity_activity_delete_own"
  on public.opportunity_activity
  for delete
  using (auth.uid() = user_id);

create index if not exists opportunity_activity_user_id_idx
  on public.opportunity_activity (user_id);

create index if not exists opportunity_activity_created_at_idx
  on public.opportunity_activity (created_at);


-- Create outreach_activity table
create table if not exists public.outreach_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Activity classification
  activity_type text not null, -- outreach_drafted / outreach_sent / reply_received / chat_message

  -- Target person
  target_name text,
  target_title text,
  target_company text,
  target_linkedin_url text,
  target_email text,

  -- Outreach content
  outreach_type text,          -- email / linkedin / whatsapp
  outreach_subject text,
  outreach_body text,
  outreach_sent_at timestamptz,

  -- Signal context
  signal_id uuid,              -- references signals_index.id
  signal_type text,
  signal_context text,

  -- Reply tracking
  reply_received boolean,
  reply_content text,
  reply_timestamp timestamptz,
  reply_sentiment text,        -- positive / neutral / negative

  -- Bot chat context
  chat_history jsonb,
  chat_summary text,
  last_chat_at timestamptz,

  -- Status
  status text,                 -- drafted / sent / replied / followed_up / closed

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.outreach_activity enable row level security;

create policy "outreach_activity_select_own"
  on public.outreach_activity
  for select
  using (auth.uid() = user_id);

create policy "outreach_activity_insert_own"
  on public.outreach_activity
  for insert
  with check (auth.uid() = user_id);

create policy "outreach_activity_update_own"
  on public.outreach_activity
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "outreach_activity_delete_own"
  on public.outreach_activity
  for delete
  using (auth.uid() = user_id);

create index if not exists outreach_activity_user_id_idx
  on public.outreach_activity (user_id);

create index if not exists outreach_activity_created_at_idx
  on public.outreach_activity (created_at);

create index if not exists outreach_activity_updated_at_idx
  on public.outreach_activity (updated_at);


-- Create user_context_summary table
create table if not exists public.user_context_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Profile audit summary
  profile_audit_summary text,
  last_gap_role text,
  last_gap_company text,
  top_gaps text[],                 -- array of gap labels
  top_strengths text[],            -- array of strength labels
  active_plan_sections text[],     -- array of section names
  plan_completion_percentage numeric,
  profile_chat_summary text,

  -- Opportunity summary
  total_jobs_viewed integer default 0,
  total_jobs_liked integer default 0,
  total_jobs_wishlisted integer default 0,
  wishlisted_companies text[],
  wishlisted_roles text[],
  top_signal_types text[],
  hidden_posts_clicked integer default 0,
  opportunity_summary text,

  -- Outreach summary
  total_outreach_sent integer default 0,
  total_replies_received integer default 0,
  reply_rate_percentage numeric,
  companies_contacted text[],
  outreach_chat_summary text,
  last_outreach_at timestamptz,

  -- Master context
  master_context text,

  -- Rebuild tracking
  last_rebuilt_at timestamptz,
  rebuild_frequency_hours integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_context_summary_user_id_unique unique (user_id)
);

alter table public.user_context_summary enable row level security;

create policy "user_context_summary_select_own"
  on public.user_context_summary
  for select
  using (auth.uid() = user_id);

create policy "user_context_summary_insert_own"
  on public.user_context_summary
  for insert
  with check (auth.uid() = user_id);

create policy "user_context_summary_update_own"
  on public.user_context_summary
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_context_summary_delete_own"
  on public.user_context_summary
  for delete
  using (auth.uid() = user_id);

create index if not exists user_context_summary_user_id_idx
  on public.user_context_summary (user_id);

create index if not exists user_context_summary_created_at_idx
  on public.user_context_summary (created_at);

create index if not exists user_context_summary_updated_at_idx
  on public.user_context_summary (updated_at);

