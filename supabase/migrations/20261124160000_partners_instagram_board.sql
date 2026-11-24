-- Партнёры: вторая ссылка — Instagram (например, страница филиала в Праге).
alter table public.partners
  add column instagram_url text check (instagram_url is null or instagram_url ~ '^https://(www\.)?instagram\.com/[^\s]+$');

-- Партнёр Board — международное сообщество владельцев бизнеса, пражский филиал.
insert into public.partners (club_id, name, url, instagram_url, logo_url, description, sort)
select c.id, 'Board', 'https://board.business/', 'https://www.instagram.com/board.praha/', '/partners/board.webp',
  jsonb_build_object(
    'cs', 'Mezinárodní komunita majitelů firem: přes 2 300 podnikatelů po celém světě. Networking, mastermindy, mentoři a obchodní setkání — s pobočkou v Praze.',
    'ru', 'Международное сообщество владельцев бизнеса: больше 2 300 предпринимателей по всему миру. Нетворкинг, мастермайнды, менторы и деловые встречи — есть филиал в Праге.',
    'uk', 'Міжнародна спільнота власників бізнесу: понад 2 300 підприємців по всьому світу. Нетворкінг, мастермайнди, ментори й ділові зустрічі — є філія в Празі.',
    'en', 'An international community of business owners: 2,300+ entrepreneurs around the world. Networking, masterminds, mentors and business meetups — with a branch in Prague.'
  ),
  50
from public.clubs c
where c.slug = 'mafiacl-prague'
  and not exists (select 1 from public.partners p where p.club_id = c.id and p.name = 'Board');
