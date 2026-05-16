
-- ===============================
-- ENUMS
-- ===============================
create type public.app_role as enum ('admin', 'host', 'user');

create type public.track_source as enum (
  'youtube', 'youtube_live', 'suno', 'udio', 'soundcloud', 'upload', 'external'
);

create type public.track_status as enum ('draft', 'published', 'removed');

create type public.event_type as enum (
  'live_listening_session',
  'song_competition',
  'community_meetup',
  'battle_night',
  'final_reveal_live',
  'radio_show',
  'challenge'
);

create type public.event_status as enum (
  'draft', 'scheduled', 'warmup', 'live', 'ended', 'replay', 'archived'
);

create type public.submission_status as enum (
  'pending', 'approved', 'rejected', 'needs_revision'
);

create type public.competition_status as enum (
  'draft', 'warmup', 'active', 'final_tallying', 'final_results_published', 'archived'
);

create type public.round_status as enum (
  'draft','warmup','submission_open','submission_closed','reviewing',
  'voting_anonymous','identity_reveal','voting_public','tallying',
  'round_results_published','completed'
);

create type public.author_visibility_mode as enum (
  'public_all_the_time','anonymous_until_round_end','anonymous_until_competition_end','anonymous_then_public_voting'
);

create type public.voter_visibility_mode as enum (
  'private_vote','public_voter_name','anonymous_to_public','admin_only'
);

create type public.vote_count_visibility as enum (
  'hidden_until_round_end','live_count','percentage_only','hidden_until_final_results'
);

create type public.advancement_rule as enum (
  'top_n','score_threshold','judge_pick','host_manual','mixed'
);

create type public.vote_phase_counting_mode as enum (
  'continuous_votes','reset_after_reveal','separate_phase_scores'
);

create type public.round_entry_status as enum (
  'pending','approved','rejected','advanced','eliminated','withdrawn'
);

-- ===============================
-- PROFILES
-- ===============================
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  website_url text,
  youtube_url text,
  instagram_url text,
  x_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_-]{2,32}$'),
  constraint bio_length check (char_length(coalesce(bio,'')) <= 500),
  constraint display_name_length check (char_length(display_name) between 1 and 60)
);

alter table public.profiles enable row level security;

create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = user_id);

-- ===============================
-- USER ROLES
-- ===============================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_self_read" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "user_roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===============================
-- TRACKS
-- ===============================
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  cover_url text,
  source_type track_source not null,
  source_url text,
  embed_url text,
  audio_file_url text,
  lyrics text,
  genre text,
  bpm int,
  ai_disclosure text,
  tools_used text,
  description text,
  rights_statement text,
  status track_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint title_length check (char_length(title) between 1 and 120),
  constraint lyrics_length check (char_length(coalesce(lyrics,'')) <= 10000),
  constraint description_length check (char_length(coalesce(description,'')) <= 2000)
);

create index on public.tracks(creator_id);
create index on public.tracks(status);
alter table public.tracks enable row level security;

create policy "tracks_public_read_published" on public.tracks for select using (status = 'published' or creator_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "tracks_owner_insert" on public.tracks for insert with check (auth.uid() = creator_id);
create policy "tracks_owner_update" on public.tracks for update using (auth.uid() = creator_id or public.has_role(auth.uid(),'admin'));
create policy "tracks_owner_delete" on public.tracks for delete using (auth.uid() = creator_id or public.has_role(auth.uid(),'admin'));

-- ===============================
-- EVENTS
-- ===============================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  cover_url text,
  type event_type not null,
  description text,
  status event_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  enable_warmup boolean not null default false,
  warmup_countdown_at timestamptz,
  show_warmup_countdown boolean not null default true,
  warmup_label text,
  warmup_description text,
  allow_follow_before_start boolean not null default true,
  allow_reminder_before_start boolean not null default true,
  youtube_url text,
  embed_url text,
  related_competition_id uuid,
  allow_song_submission boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint title_len check (char_length(title) between 1 and 140),
  constraint description_len check (char_length(coalesce(description,'')) <= 4000)
);

create index on public.events(status);
create index on public.events(starts_at);
alter table public.events enable row level security;

create policy "events_public_read" on public.events for select using (status <> 'draft' or host_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "events_host_insert" on public.events for insert with check (auth.uid() = host_id);
create policy "events_host_update" on public.events for update using (auth.uid() = host_id or public.has_role(auth.uid(),'admin'));
create policy "events_host_delete" on public.events for delete using (auth.uid() = host_id or public.has_role(auth.uid(),'admin'));

-- ===============================
-- COMPETITIONS
-- ===============================
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  slug text not null unique,
  cover_url text,
  theme text,
  description text,
  rules text,
  status competition_status not null default 'draft',
  enable_warmup boolean not null default false,
  warmup_countdown_at timestamptz,
  show_warmup_countdown boolean not null default true,
  warmup_label text,
  warmup_description text,
  allow_early_submission boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint title_len check (char_length(title) between 1 and 140)
);

alter table public.events add constraint events_related_competition_fk
  foreign key (related_competition_id) references public.competitions(id) on delete set null;

create index on public.competitions(status);
alter table public.competitions enable row level security;

create policy "competitions_public_read" on public.competitions for select using (status <> 'draft' or host_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "competitions_host_insert" on public.competitions for insert with check (auth.uid() = host_id);
create policy "competitions_host_update" on public.competitions for update using (auth.uid() = host_id or public.has_role(auth.uid(),'admin'));
create policy "competitions_host_delete" on public.competitions for delete using (auth.uid() = host_id or public.has_role(auth.uid(),'admin'));

-- ===============================
-- COMPETITION ROUNDS
-- ===============================
create table public.competition_rounds (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  round_number int not null,
  title text not null,
  description text,
  status round_status not null default 'draft',
  author_visibility_mode author_visibility_mode not null default 'public_all_the_time',
  voter_visibility_mode voter_visibility_mode not null default 'private_vote',
  vote_count_visibility vote_count_visibility not null default 'hidden_until_round_end',
  advancement_rule advancement_rule not null default 'top_n',
  advancement_count int default 5,
  public_vote_weight numeric not null default 1,
  judge_score_weight numeric not null default 0,
  allow_self_vote boolean not null default false,
  max_votes_per_user int not null default 1,
  reset_votes_from_previous_round boolean not null default true,
  vote_phase_counting_mode vote_phase_counting_mode not null default 'continuous_votes',
  submission_start_at timestamptz,
  submission_end_at timestamptz,
  voting_start_at timestamptz,
  voting_end_at timestamptz,
  reveal_at timestamptz,
  results_publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, round_number)
);

alter table public.competition_rounds enable row level security;

create policy "rounds_public_read" on public.competition_rounds for select using (
  status <> 'draft' or exists (select 1 from public.competitions c where c.id = competition_id and (c.host_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "rounds_host_manage" on public.competition_rounds for all using (
  exists (select 1 from public.competitions c where c.id = competition_id and (c.host_id = auth.uid() or public.has_role(auth.uid(),'admin')))
) with check (
  exists (select 1 from public.competitions c where c.id = competition_id and (c.host_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);

-- ===============================
-- EVENT SUBMISSIONS
-- ===============================
create table public.event_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  status submission_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text,
  unique (event_id, track_id)
);

alter table public.event_submissions enable row level security;

create policy "event_subs_read" on public.event_submissions for select using (
  status = 'approved' or creator_id = auth.uid()
  or exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "event_subs_creator_insert" on public.event_submissions for insert with check (auth.uid() = creator_id);
create policy "event_subs_host_update" on public.event_submissions for update using (
  exists (select 1 from public.events e where e.id = event_id and e.host_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "event_subs_owner_withdraw" on public.event_submissions for delete using (
  creator_id = auth.uid() or public.has_role(auth.uid(),'admin')
);

-- ===============================
-- ROUND ENTRIES
-- ===============================
create table public.round_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.competition_rounds(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  source_entry_id uuid references public.round_entries(id) on delete set null,
  anonymous_code text,
  status round_entry_status not null default 'pending',
  seed_number int,
  public_vote_count int not null default 0,
  judge_average_score numeric,
  final_score numeric,
  rank int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (round_id, track_id)
);

create index on public.round_entries(round_id);
alter table public.round_entries enable row level security;

-- Readable to all once approved (the API layer filters anonymous fields)
create policy "round_entries_read" on public.round_entries for select using (
  status in ('approved','advanced','eliminated')
  or creator_id = auth.uid()
  or exists (select 1 from public.competitions c where c.id = competition_id and (c.host_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "round_entries_creator_insert" on public.round_entries for insert with check (auth.uid() = creator_id);
create policy "round_entries_host_update" on public.round_entries for update using (
  exists (select 1 from public.competitions c where c.id = competition_id and (c.host_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "round_entries_owner_withdraw" on public.round_entries for delete using (
  creator_id = auth.uid() or public.has_role(auth.uid(),'admin')
);

-- ===============================
-- VOTES
-- ===============================
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  round_id uuid not null references public.competition_rounds(id) on delete cascade,
  round_entry_id uuid not null references public.round_entries(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  vote_weight numeric not null default 1,
  visibility_mode voter_visibility_mode not null default 'private_vote',
  created_at timestamptz not null default now()
);

create index on public.votes(round_id);
create index on public.votes(round_entry_id);
create index on public.votes(voter_id);

alter table public.votes enable row level security;

create policy "votes_voter_read_own" on public.votes for select using (
  voter_id = auth.uid()
  or visibility_mode = 'public_voter_name'
  or exists (select 1 from public.competitions c where c.id = competition_id and (c.host_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "votes_authenticated_insert" on public.votes for insert with check (auth.uid() = voter_id);
create policy "votes_self_delete" on public.votes for delete using (voter_id = auth.uid());

-- ===============================
-- FOLLOWS / REMINDERS / FAVORITES
-- ===============================
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('event','competition','profile')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
alter table public.follows enable row level security;
create policy "follows_self_all" on public.follows for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('event','competition','round')),
  target_id uuid not null,
  remind_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
alter table public.reminders enable row level security;
create policy "reminders_self_all" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('track','event','competition')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);
alter table public.favorites enable row level security;
create policy "favorites_self_all" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===============================
-- NOTIFICATIONS
-- ===============================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  target_type text,
  target_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "notifications_self_read" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_self_update" on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_self_delete" on public.notifications for delete using (auth.uid() = user_id);

-- ===============================
-- REPORTS
-- ===============================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reason_len check (char_length(reason) between 1 and 1000)
);
alter table public.reports enable row level security;
create policy "reports_create" on public.reports for insert with check (auth.uid() = reporter_id);
create policy "reports_admin_read" on public.reports for select using (public.has_role(auth.uid(),'admin') or reporter_id = auth.uid());
create policy "reports_admin_update" on public.reports for update using (public.has_role(auth.uid(),'admin'));

-- ===============================
-- AUDIT LOGS
-- ===============================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create policy "audit_admin_read" on public.audit_logs for select using (public.has_role(auth.uid(),'admin'));

-- ===============================
-- TRIGGERS: updated_at
-- ===============================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_tracks_updated before update on public.tracks for each row execute function public.set_updated_at();
create trigger trg_events_updated before update on public.events for each row execute function public.set_updated_at();
create trigger trg_competitions_updated before update on public.competitions for each row execute function public.set_updated_at();
create trigger trg_rounds_updated before update on public.competition_rounds for each row execute function public.set_updated_at();
create trigger trg_round_entries_updated before update on public.round_entries for each row execute function public.set_updated_at();
create trigger trg_reports_updated before update on public.reports for each row execute function public.set_updated_at();

-- ===============================
-- TRIGGER: auto profile + role on new user
-- ===============================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_username text;
  v_display text;
begin
  v_username := coalesce(
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_-]', '', 'g'), ''),
    'user_' || substr(new.id::text, 1, 8)
  );
  -- guarantee unique
  while exists (select 1 from public.profiles where username = v_username) loop
    v_username := v_username || '_' || substr(md5(random()::text),1,4);
  end loop;

  v_display := coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', v_username);

  insert into public.profiles (user_id, username, display_name, avatar_url)
  values (new.id, v_username, v_display, new.raw_user_meta_data->>'avatar_url');

  insert into public.user_roles (user_id, role) values (new.id, 'user');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
