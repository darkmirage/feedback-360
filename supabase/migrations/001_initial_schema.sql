-- ============================================
-- ENUMS
-- ============================================

create type review_cycle_status as enum (
  'draft',
  'active',
  'closed',
  'results_published'
);

create type relationship_type as enum (
  'self',
  'peer',
  'direct_report',
  'manager'
);

create type user_role as enum (
  'admin',
  'user'
);

-- ============================================
-- TABLES
-- ============================================

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table review_cycles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status review_cycle_status not null default 'draft',
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  review_cycle_id uuid not null references review_cycles(id) on delete cascade,
  question_text text not null,
  question_order int not null,
  is_open_ended boolean not null default true,
  is_rating boolean not null default false,
  created_at timestamptz not null default now()
);

create table review_assignments (
  id uuid primary key default gen_random_uuid(),
  review_cycle_id uuid not null references review_cycles(id) on delete cascade,
  reviewer_id uuid not null references users(id),
  subject_id uuid not null references users(id),
  relationship relationship_type not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(review_cycle_id, reviewer_id, subject_id)
);

create table responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references review_assignments(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  open_text text,
  rating_value int check (rating_value between 1 and 5),
  updated_at timestamptz not null default now(),
  unique(assignment_id, question_id)
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_assignments_cycle on review_assignments(review_cycle_id);
create index idx_assignments_reviewer on review_assignments(reviewer_id);
create index idx_assignments_subject on review_assignments(subject_id);
create index idx_responses_assignment on responses(assignment_id);
create index idx_questions_cycle on questions(review_cycle_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_review_cycles_updated
  before update on review_cycles
  for each row execute function update_updated_at();

create trigger trg_responses_updated
  before update on responses
  for each row execute function update_updated_at();

-- ============================================
-- USER SYNC TRIGGER (auth.users -> public.users)
-- ============================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table users enable row level security;
alter table review_cycles enable row level security;
alter table questions enable row level security;
alter table review_assignments enable row level security;
alter table responses enable row level security;

-- Helper: check if current user is admin
create or replace function is_admin()
returns boolean as $$
  select exists(
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- USERS
create policy "users_select" on users for select using (true);
create policy "users_insert" on users for insert with check (is_admin());
create policy "users_update" on users for update using (is_admin());

-- REVIEW_CYCLES
create policy "cycles_select" on review_cycles for select using (true);
create policy "cycles_insert" on review_cycles for insert with check (is_admin());
create policy "cycles_update" on review_cycles for update using (is_admin());
create policy "cycles_delete" on review_cycles for delete using (is_admin());

-- QUESTIONS
create policy "questions_select" on questions for select using (true);
create policy "questions_insert" on questions for insert with check (is_admin());
create policy "questions_update" on questions for update using (is_admin());
create policy "questions_delete" on questions for delete using (is_admin());

-- REVIEW_ASSIGNMENTS
create policy "assignments_select" on review_assignments for select using (
  auth.uid() = reviewer_id or is_admin()
);
create policy "assignments_insert" on review_assignments for insert with check (is_admin());
create policy "assignments_update" on review_assignments for update using (is_admin());
create policy "assignments_delete" on review_assignments for delete using (is_admin());

-- RESPONSES
create policy "responses_select" on responses for select using (
  exists(
    select 1 from review_assignments ra
    where ra.id = responses.assignment_id
    and (ra.reviewer_id = auth.uid() or is_admin())
  )
);
create policy "responses_insert" on responses for insert with check (
  exists(
    select 1 from review_assignments ra
    join review_cycles rc on rc.id = ra.review_cycle_id
    where ra.id = assignment_id
    and ra.reviewer_id = auth.uid()
    and rc.status = 'active'
  )
);
create policy "responses_update" on responses for update using (
  exists(
    select 1 from review_assignments ra
    join review_cycles rc on rc.id = ra.review_cycle_id
    where ra.id = responses.assignment_id
    and ra.reviewer_id = auth.uid()
    and rc.status = 'active'
  )
);
