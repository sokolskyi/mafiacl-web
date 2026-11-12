-- Корпоративы: новые форматы — вечеринка с друзьями, девичник/мальчишник, мероприятие «под ключ».
alter table public.corporate_requests drop constraint if exists corporate_requests_format_check;
alter table public.corporate_requests add constraint corporate_requests_format_check
  check (format in ('teambuilding', 'party', 'birthday', 'friends', 'hens', 'turnkey', 'office', 'club', 'other'));
alter table public.testimonials drop constraint if exists testimonials_event_type_check;
alter table public.testimonials add constraint testimonials_event_type_check
  check (event_type in ('teambuilding', 'party', 'birthday', 'friends', 'hens', 'turnkey', 'office', 'club', 'other'));
