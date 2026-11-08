# «Дредді розсуди»: план файлів і схема БД

Етап 3. Назва робоча: шлях `/decide`, назва в інтерфейсі після твого вибору. Коду ще немає.

## Потік

1. **Кнопка на головній** веде на `/decide/new`. Людина обирає: увійти або продовжити анонімно з випадковим ніком (наприклад «Тихий Борсук»). Потім пише питання і свою позицію. Отримує посилання-запрошення для другої сторони.
2. **Друга сторона відкриває посилання** і так само обирає вхід або анонімність. Бачить питання і позицію першої сторони, підтверджує формулювання питання або виправляє його, пише свою позицію. Якщо виправила, перша сторона одним натиском погоджує нове формулювання.
3. **Відповіді.** Обидві сторони бачать обидві позиції. Кожна має одну репліку у відповідь або натискає «Без репліки».
4. **Вердикт.** Коли обидві відповіли або пропустили, Дредді виносить вердикт. Для фактичних питань модель шукає в інтернеті. Вердикт показується карткою: коротка відповідь, пояснення, нюанс, джерела.
5. **Поширення.** Картку можна поширити, у неї є публічне посилання з OG-картинкою, без позицій сторін.
6. **Медіація.** Якщо `suggest_mediation = true`, під вердиктом є пропозиція створити обіцянку чи угоду і перейти в повноцінний арбітраж.
7. **Збереження.** Після вердикту аноніма запрошують зберегти спір: вхід, після якого спір прив'язується до акаунта. Хто вже увійшов, має спір збереженим одразу.
8. **Історія.** Для тих, хто увійшов, є сторінка `/decide` зі списком їхніх спорів.

Оновлення чату: опитування сервера кожні 5 секунд, поки сторінка відкрита. Realtime не потрібен.

## Схема БД (одна міграція)

```sql
create table public.quick_disputes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lang text not null default 'uk' check (lang in ('uk','en')),
  question text not null,
  question_proposed text,              -- правка формулювання від сторони B, чекає згоди A
  question_confirmed_at timestamptz,
  status text not null default 'awaiting_b'
    check (status in ('awaiting_b','awaiting_question','rebuttals','deciding','decided','expired')),
  invite_token text not null unique,    -- випадковий, у посиланні для B
  share_slug text unique,               -- публічна картка вердикту, з'являється після вердикту
  verdict jsonb,                        -- QuickVerdict, перевірений zod
  verdict_model text,
  input_tokens int,
  output_tokens int,
  web_searches int,
  decided_at timestamptz
);

create table public.quick_dispute_parties (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.quick_disputes(id) on delete cascade,
  role text not null check (role in ('A','B')),
  user_id uuid references auth.users(id) on delete set null,   -- null, поки сторона анонімна
  nickname text not null,                                      -- випадковий нік або ім'я з профілю
  secret_hash text,                                            -- sha256 токена з httpOnly-cookie аноніма
  position text,
  position_at timestamptz,
  rebuttal text,
  rebuttal_at timestamptz,
  rebuttal_skipped boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (dispute_id, role)
);

create index on public.quick_dispute_parties(user_id);

alter table public.quick_disputes enable row level security;
alter table public.quick_dispute_parties enable row level security;
-- Без політик: читає й пише тільки сервер із сервісним ключем, як judge_messages.
```

- **Анонім:** при вході в спір сервер дає випадковий токен у httpOnly-cookie, а в базі тримає тільки його хеш.
- **«Зберегти»:** людина входить, і сервер ставить `user_id` у рядок сторони, знайдений за хешем cookie.
- **Історія:** усі спори, де `quick_dispute_parties.user_id = я`.

## Файли

| Файл | Що |
|---|---|
| `supabase/migrations/<дата>_quick_disputes.sql` | Схема вище |
| `src/lib/ai/quickVerdict.ts` | `QuickVerdict` (zod) і `buildQuickVerdictPrompt` з референсу. Спільні правила (теги, `injection_attempt`, нейтральність, екранування) беруться з `judge.ts`, щоб не дублювати |
| `src/lib/ai/askQuickVerdict.ts` | Виклик моделі з веб-пошуком, перевірка відповіді через zod, облік вартості |
| `src/lib/quickDisputes/` | Завантаження спору, визначення сторони (`user_id` або cookie), генератор ніків, переходи статусів |
| `src/app/api/decide/route.ts` | POST: створити спір |
| `src/app/api/decide/[id]/route.ts` | GET: стан для сторони. POST з діями: `join`, `confirm_question`, `propose_question`, `accept_question`, `position`, `rebuttal`, `skip_rebuttal`, `claim` |
| `src/app/api/decide/history/route.ts` | GET: мої спори |
| `src/app/decide/new/page.tsx` | Вибір вхід/анонім, питання, позиція, посилання для другої сторони |
| `src/app/decide/[id]/page.tsx` | Спільний чат, вердикт, «Зберегти», пропозиція медіації |
| `src/app/decide/page.tsx` | Історія |
| `src/app/d/[slug]/page.tsx` + `src/app/api/og/decide/[slug]/route.tsx` | Публічна картка вердикту і OG-картинка |
| `src/app/page.tsx` | Кнопка на головній |
| `src/messages/{uk,en}.json` | Тексти, погоджую з тобою до того, як писати |
| `tests/quickVerdict.test.ts`, `scripts/judge-eval.ts` | Тести збірки промпту і живі кейси: нормальний спір, injection, багатослівна сторона, а також «питання смаку» і «міжособистісне» |

## Що треба вирішити до коду

1. **Назва.** Варіанти: «Хто правий?», «Спитай Дредді», «Суперечка на хвилину», «Дредді, вирішуй». Моя рекомендація: «Хто правий?» на кнопці, «Дредді розсуди» в чаті.
2. **Голос вердикту.** У референсі «дружній арбітр». В арбітражі Дредді суворий суддя. Рекомендую той самий голос, але без суворості до людей: картку поширюватимуть.
3. **Модель і пошук.** Зараз судді працюють на `claude-haiku-5-5`. Веб-пошук коштує окремо, приблизно $10 за 1000 пошуків, плюс токени. Рекомендую Haiku з пошуком і ліміт: до 3 пошуків на вердикт.
4. **Захист від зловживань.** Аноніми можуть створювати спори без обмежень, а кожен вердикт коштує грошей. Рекомендую ліміт на cookie або IP, наприклад 5 вердиктів на добу, і загальний денний ліміт.
5. **Строк життя.** Якщо друга сторона не прийшла, спір закривається як `expired`. Рекомендую 7 днів. Анонімні незбережені спори видаляються через 30 днів.
6. **Якщо хтось не відповідає на репліку.** Рекомендую: через 24 години після позицій будь-яка сторона може натиснути «Вирішувати без репліки».
