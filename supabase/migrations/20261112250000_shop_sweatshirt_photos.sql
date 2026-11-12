-- Клубный свитшот: фото и описание.
update public.shop_products set
  image_url = '/merch/sweatshirt-front.webp',
  gallery = array['/merch/sweatshirt-thumb.webp', '/merch/sweatshirt-side.webp'],
  description = jsonb_build_object(
    'cs', 'Černá mikina s potiskem Mafia Club Champions League vpředu a nápisem Protocol 4 · Respect · Trust · Focus · Responsibility na rukávu.',
    'en', 'Black sweatshirt with the Mafia Club Champions League print on the front and Protocol 4 · Respect · Trust · Focus · Responsibility on the sleeve.',
    'ru', 'Чёрный свитшот с принтом Mafia Club Champions League спереди и надписью Protocol 4 · Respect · Trust · Focus · Responsibility на рукаве.',
    'uk', 'Чорний світшот із принтом Mafia Club Champions League спереду та написом Protocol 4 · Respect · Trust · Focus · Responsibility на рукаві.')
where slug = 'klubova-mikina';
