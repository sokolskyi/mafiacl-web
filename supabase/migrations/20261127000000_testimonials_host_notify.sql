-- Уведомление ведущему об отзыве, где его выбрали: когда отзыв опубликован (после проверки администрацией).
-- published_at — когда отзыв впервые стал виден; host_notified_at — когда ведущему ушло сообщение в Telegram.
alter table public.testimonials
  add column published_at timestamptz,
  add column host_notified_at timestamptz;
update public.testimonials set published_at = created_at where active and published_at is null;

create or replace function private.testimonials_publish_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.active and new.published_at is null then
    new.published_at := now();
  end if;
  -- Сменили ведущего — новому ведущему тоже нужно сообщение.
  if tg_op = 'UPDATE' and new.host_id is distinct from old.host_id then
    new.host_notified_at := null;
  end if;
  return new;
end $$;

create trigger testimonials_publish_stamp
  before insert or update on public.testimonials
  for each row execute function private.testimonials_publish_stamp();

grant select (published_at) on public.testimonials to anon, authenticated;

-- Когда ведущий последний раз смотрел «Отзывы о вас» в кабинете (читает и пишет только сервер).
alter table public.profile_private add column if not exists reviews_seen_at timestamptz;
