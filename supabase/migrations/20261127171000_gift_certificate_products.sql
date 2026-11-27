-- Подарочные сертификаты на 1, 3 и 5 игровых вечеров (300 Kč за вечер; цены можно поменять в админке).
-- Готовый товар «Dárkový poukaz na hru» (мерч, без заказов) становится сертификатом на 1 вечер.
update public.shop_products set
  kind = 'certificate', certificate_evenings = 1, sort = 35, image_url = '/merch/gift-certificate-1.webp',
  name = '{"cs":"Dárkový poukaz — 1 večer","ru":"Подарочный сертификат — 1 вечер","uk":"Подарунковий сертифікат — 1 вечір","en":"Gift certificate — 1 night"}'::jsonb,
  description = '{"cs":"Jeden herní večer v klubu MafiaCL. Napíšete jméno obdarovaného, od koho a přání — po zaplacení si stáhnete PDF k vytištění nebo poslání. Platí 12 měsíců.","ru":"Один игровой вечер в клубе MafiaCL. Впишите имя получателя, от кого и пожелание — после оплаты скачаете PDF, чтобы распечатать или отправить. Действует 12 месяцев.","uk":"Один ігровий вечір у клубі MafiaCL. Впишіть ім''я отримувача, від кого й побажання — після оплати завантажите PDF, щоб роздрукувати чи надіслати. Діє 12 місяців.","en":"One game night at MafiaCL. Enter the recipient''s name, who it''s from and a message — after payment download a PDF to print or send. Valid for 12 months."}'::jsonb
where slug = 'darkovy-poukaz' and kind = 'merch';

with c as (select id from public.clubs where slug = 'mafiacl-prague'),
p as (
  insert into public.shop_products (club_id, slug, kind, certificate_evenings, name, description, price_czk, image_url, ask_nickname, ask_color, active, sort)
  select c.id, v.slug, 'certificate', v.n, v.name::jsonb, v.descr::jsonb, v.price, v.img, false, false, true, v.sort
  from c, (values
    ('darkovy-poukaz-3', 3, 900, 36, '/merch/gift-certificate-3.webp',
      '{"cs":"Dárkový poukaz — 3 večery","ru":"Подарочный сертификат — 3 вечера","uk":"Подарунковий сертифікат — 3 вечори","en":"Gift certificate — 3 nights"}',
      '{"cs":"Tři herní večery v klubu MafiaCL — lze využít v různé dny. Napíšete jméno obdarovaného, od koho a přání — po zaplacení si stáhnete PDF k vytištění nebo poslání. Platí 12 měsíců.","ru":"Три игровых вечера в клубе MafiaCL — можно в разные дни. Впишите имя получателя, от кого и пожелание — после оплаты скачаете PDF, чтобы распечатать или отправить. Действует 12 месяцев.","uk":"Три ігрові вечори у клубі MafiaCL — можна в різні дні. Впишіть ім''я отримувача, від кого й побажання — після оплати завантажите PDF, щоб роздрукувати чи надіслати. Діє 12 місяців.","en":"Three game nights at MafiaCL, on any days. Enter the recipient''s name, who it''s from and a message — after payment download a PDF to print or send. Valid for 12 months."}'),
    ('darkovy-poukaz-5', 5, 1500, 37, '/merch/gift-certificate-5.webp',
      '{"cs":"Dárkový poukaz — 5 večerů","ru":"Подарочный сертификат — 5 вечеров","uk":"Подарунковий сертифікат — 5 вечорів","en":"Gift certificate — 5 nights"}',
      '{"cs":"Pět herních večerů v klubu MafiaCL — lze využít v různé dny. Napíšete jméno obdarovaného, od koho a přání — po zaplacení si stáhnete PDF k vytištění nebo poslání. Platí 12 měsíců.","ru":"Пять игровых вечеров в клубе MafiaCL — можно в разные дни. Впишите имя получателя, от кого и пожелание — после оплаты скачаете PDF, чтобы распечатать или отправить. Действует 12 месяцев.","uk":"П''ять ігрових вечорів у клубі MafiaCL — можна в різні дні. Впишіть ім''я отримувача, від кого й побажання — після оплати завантажите PDF, щоб роздрукувати чи надіслати. Діє 12 місяців.","en":"Five game nights at MafiaCL, on any days. Enter the recipient''s name, who it''s from and a message — after payment download a PDF to print or send. Valid for 12 months."}')
  ) as v (slug, n, price, sort, img, name, descr)
  on conflict do nothing
  returning id
)
insert into public.shop_variants (product_id, label, stock, sort)
select id, '', null, 10 from p;
