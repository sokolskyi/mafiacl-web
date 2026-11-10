-- Чат Telegram привязывает только бот (одноразовый код). Игрок не может вписать чужой chat_id сам.
revoke update (telegram_chat_id) on public.profile_private from authenticated;
