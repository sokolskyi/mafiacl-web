# Canon Report — mafiacl-web — 2026-11-24

## Summary
- Источники: 1 файл токенов (`src/app/globals.css`, блок `@theme`), 3 письменных документа (`CLAUDE.md`, `AGENTS.md`, `README.md` — разделов о дизайне в них нет), 1 прошлый дизайн-артефакт (Claude Design «MafiaCL — новая главная: 3 направления», 4 макета), история git полная.
- Сканер `scan_tokens.py`: 250 файлов в `src/`, `scan_complete: true`. Проект почти весь на классах Tailwind, поэтому частоты классов посчитаны отдельно grep-ом.
- Найдено правил: 14 в пяти группах (цвет, типографика, форма и отступы, компоненты, движение).
- Конфликтов: 5.
- Хрупких правил (одно упоминание): 3.
- Ограничения: визуально страницы на этом шаге не проверялись. Макеты Claude Design прочитаны только по названию и составу файлов: они относятся к главной, которая уже собрана (`8f8109e`).

## Decision register
| Finding ID | Scope | Decision status | Authority / exception | Source baseline |
| --- | --- | --- | --- | --- |
| color-brand | app/all | approved | `globals.css:9` «Фирменные цвета MafiaCL»; коммит `38ff13e` | sources.json |
| color-surface | app/cards+dialogs | unresolved | токены бордовые vs новые блоки почти чёрные | sources.json |
| color-gold | app/награды, Respect | unresolved | токена нет; amber и yellow вперемешку | sources.json |
| color-text-white | app/all | unresolved | токен «белый = кремовый» vs `#fff` в новом CSS | sources.json |
| type-display | app/заголовки | observed | `@theme --font-display` | sources.json |
| type-hero | app/главная | observed | `@theme --font-hero` «главная, плитки» | sources.json |
| type-h2 | app/секции | unresolved | два стиля заголовков разделов | sources.json |
| radius-button | app/кнопки | unresolved | `rounded` (4px) vs `rounded-full` | sources.json |
| radius-card | app/карточки | observed | `rounded` / `rounded-lg` / 0.9–1.25rem в CSS | sources.json |
| border-card | app/карточки | observed | `border-white/10` основной | sources.json |
| cta-primary | app/главные кнопки | unresolved | красная по умолчанию vs жёлтые в Respect и заказе | sources.json |
| touch-target | app/кнопки | observed | `min-h-11` (44px) основной | sources.json |
| motion-reduced | app/анимации | observed | везде через `prefers-reduced-motion` | sources.json |
| focus-ring | app/all | observed | `:focus-visible` кремовый, в новых окнах — жёлтый | sources.json |

## Color
| Value | Role / decision | Lives in | First appeared | Confidence |
| --- | --- | --- | --- | --- |
| `#E60000` / `#0B0B0B` / `#FDFFC2` | Фирменные красный, чёрный, кремовый | `globals.css:9` (комментарий), `globals.css:25-26,45` (`--color-white/black/red-600`) | `38ff13e` 2026-11-11 «Бордовый бархат» | Explicit |
| `#2a050b` → `#1c0308` | Фон «бордовый бархат», тёмные поверхности (`neutral-950..700` переопределены в бордовые) | `globals.css:14,29-32`; `bg-neutral-950/60` в 32 местах, `bg-neutral-900` в 42 | `38ff13e` | Explicit |
| `red-600` | Главная кнопка и плашки | `bg-red-600`: 53 кнопки/плашки; красное семейство: 279 классов в 63 файлах | `38ff13e` | Established by repetition |
| amber-* / yellow-* / `#fde68a` `#f59e0b` `#fcd34d` `#fbbf24` | (inferred) «золото» наград, Respect, чемпионов | `text-yellow-200` ×14, `text-amber-300` ×12, `text-yellow-300` ×9, `text-amber-400` ×8 в 26 файлах; в CSS `globals.css` `.hall-champion`, `.gala-winner`, `.rc-*` | Respect (`RespectAmount`), затем Зал славы 2026-11-24 | Conflicting |
| `rgb(10 10 10)` / `#0a0a0a` / `#0b0b0c` / `#050505` / `#111` | Фон новых карточек и окон | `globals.css:130` (окно Respect), `:317` (`.hall-season`), `:529,588` (просмотр фото), `:680` (мозаика), `:748` (`.gala-nom`) | 2026-11-23…24 | Conflicting |
| `#fff`, `#f5f5f5`, `#e5e5e5`, `#d4d4d4` | Белый текст в новых блоках | `globals.css:131,453,517,530,604,736` | 2026-11-23…24 | Conflicting |
| `#229ed9`, `#1f91c7`, `#1877f2` | Цвета Telegram и Facebook на кнопках входа | `AccountPanel.tsx`, `AdminGame.tsx`, `AdminHome.tsx` (scan: file_count 3) | — | Established by repetition (это бренды соцсетей, не наша палитра — нормально) |

## Typography
| Value | Role / decision | Lives in | First appeared | Confidence |
| --- | --- | --- | --- | --- |
| Manrope (основной), Inter (запасной) | Текст | `globals.css:20` `--font-sans` | `8f8109e` | Explicit |
| Sofia Sans Condensed, `font-display` + uppercase | Заголовки разделов | `globals.css:21`; `font-display` 55× в `.tsx` | `38ff13e` | Explicit |
| Unbounded, `font-hero` | Крупные заголовки главной | `globals.css:22-23` («главная, плитки»); `page.tsx:110,243`, `Tile.tsx:70` | `8f8109e` | Explicit (только главная) |
| h2: `text-xl font-bold` vs `font-display text-3xl font-extrabold uppercase` | Заголовок раздела страницы | первый — 38 мест, второй — 15 (`text-3xl`/`text-4xl`) | — | Conflicting |

## Spacing / Layout
| Value | Role / decision | Lives in | First appeared | Confidence |
| --- | --- | --- | --- | --- |
| `rounded` (4px) | Карточки, кнопки форм, таблицы | 209 классов; `rounded border border-white/10` в 20+ блоках | — | Established by repetition |
| `rounded-full` | Крупные кнопки-призывы, бейджи | 84 класса; `inline-flex min-h-12 … rounded-full bg-red-600 px-7` (главная, корпоративы) | — | Conflicting с `rounded` для той же роли |
| `rounded-lg` / 0.9–1.25rem | Новые карточки и окна | `rounded-lg` 62; в CSS `.hall-season` 1.25rem, `.rc-dialog` 1.25rem, `.gala-nom` 0.9rem, `.hall-lightbox` 1rem | 2026-11-23…24 | Observed (три шкалы скругления) |
| `border-white/10` (`/15`, `/20`) | Рамка карточек и разделителей | 80 / 54 / 30 использований | — | Established by repetition |
| `min-h-11` (44px) | Минимальная высота кнопок | 56 мест; `min-h-12` 22, `min-h-10` 7 | — | Established by repetition |
| `max-w-6xl px-4 py-16` | Ширина и поля страницы | страницы `about/*`, `gala` и др. | — | Observed |

## Motion / Interaction
| Value | Role / decision | Lives in | First appeared | Confidence |
| --- | --- | --- | --- | --- |
| Анимации только при `prefers-reduced-motion: no-preference` | Уважение к «уменьшить движение» | `globals.css` `.rc-*`, `.hall-*`, `.mosaic-*`, `.gala-nom`; `RespectCelebration.tsx`, `RespectBalance.tsx` | 2026-11-23 | Established by repetition |
| `:focus-visible` кремовая обводка 2px | Фокус с клавиатуры | `globals.css:92-95` | `38ff13e` | Explicit |
| Жёлтая обводка фокуса `#fcd34d` | Фокус в новых блоках | `globals.css` `.hall-main`, `.hall-polaroid`, `.hall-lb-btn`, `.mosaic-tile` | 2026-11-24 | Single-mention (одна волна правок) |

## Component Patterns & Naming
| Value | Role / decision | Lives in | First appeared | Confidence |
| --- | --- | --- | --- | --- |
| Кнопка формы `min-h-11 rounded bg-red-600 px-4 font-semibold hover:bg-red-500` | Главная кнопка в формах и админке | 13 + 3 одинаковых строк (`AliasesAdmin.tsx:32` и др.) | — | Established by repetition |
| Жёлтая кнопка `bg-yellow-400/500 text-black` | Действие с Respect | `RespectCelebration.tsx:122`, `shop/orders/[id]/page.tsx:123` | 2026-11 | Conflicting с красной главной кнопкой |
| Карточки на чистом CSS (`.hall-*`, `.gala-*`, `.rc-*`, `.mosaic-*`) | Новые «витринные» блоки | `globals.css:122-782` (≈660 строк) | 2026-11-23…24 | Observed — второй способ оформления рядом с классами Tailwind |

## Conflicts
- **Поверхности: бордовый или почти чёрный.** Токены задают тёмные поверхности бордовыми (`globals.css:29-32`, «Тёмные поверхности — оттенки бордового»). Новые блоки Зала славы, Gala Night, окна Respect и просмотра фото используют нейтральный чёрный `rgb(10 10 10)` / `#0a0a0a` (`globals.css:130,317,529,588,680,748`). На практике остальной сайт бордовый, а витринные блоки — чёрные островки. Решать: оставить чёрный как «сцену» для фото или перевести на `neutral-950`.
- **Золото без токена.** Золото есть в двух семействах Tailwind (`amber` и `yellow`) и в четырёх ручных hex (`#fde68a`, `#f59e0b`, `#fcd34d`, `#fbbf24`). Respect — жёлтый (`text-yellow-200`, `respect/page.tsx:48,63,123`), Зал славы и Gala — янтарный (`HallArchive.tsx:91`, `.hall-champion`). Фирменная палитра (`globals.css:9`) золота не содержит. Нужно решение: вводим ли «золото» как четвёртый цвет бренда и какой один оттенок.
- **Белый: кремовый или чистый.** Токен делает белый кремовым (`--color-white: #fdffc2`, `globals.css:25`). Новый CSS пишет чистый `#fff`/`#f5f5f5` (`globals.css:131,530,604,736`), и `::selection` тоже `#ffffff` (`:90`). На бордовом фоне чистый белый заметно холоднее остального текста.
- **Форма главной кнопки.** Одна и та же роль «главное действие, красная» — то `rounded` (34 кнопки), то `rounded-full` (19, крупные призывы на публичных страницах). Похоже на неписаное правило «пилюля — на витрине, прямоугольник — в формах», но нигде не записано.
- **Заголовок раздела.** `text-xl font-bold` (38 мест, в основном кабинет и админка) против `font-display … uppercase` (15 мест, публичные страницы). Опять похоже на «витрина vs рабочие экраны», но не зафиксировано.

## Fragile / Single-Mention Canon
- **Жёлтая обводка фокуса** — только в блоках Зала славы и Gala (`globals.css`, 2026-11-24); везде остальное — кремовая (`globals.css:92-95`).
- **Жёлтая кнопка для Respect** — два места (`RespectCelebration.tsx:122`, `shop/orders/[id]/page.tsx:123`), правила нет.
- **`font-hero` (Unbounded)** — только главная (`page.tsx:110,243`, `Tile.tsx:70`); на других страницах заголовки Sofia Sans. Если главная остаётся «особенной» — это нормально, но стоит записать.

## Document Relevance
| Document | Status | Why | Proposed disposition |
| --- | --- | --- | --- |
| `src/app/globals.css` (`@theme` + комментарий о бренде) | Current, неполный | Палитра и шрифты верны, но нет золота, правил поверхностей, кнопок и заголовков | Update: добавить токен золота и, по решению, поверхность «сцены» |
| `CLAUDE.md` | Stale в части дизайна | Карта проекта есть, раздела «Дизайн» нет — правила живут только в коде | Update: добавить раздел «Дизайн-правила» после решений по конфликтам |
| `README.md` | Current (без дизайна) | Дизайна не касается | Keep |
| Claude Design «MafiaCL — новая главная: 3 направления» | Stale | Главная уже собрана по одному направлению (`8f8109e`); артефакт остался как набор вариантов | Keep как история, пометить, какое направление выбрано |
