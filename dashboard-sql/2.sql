-- add an "active" flag (defaults false)
-- allows multiple collections to be active at the same time
alter table public.collections add column active boolean default false;
