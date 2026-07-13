# Мобильная адаптация RisuAI — исследование + план

> Подход: **адаптивный веб (CSS / responsive)**, не нативная сборка.
> Фокус: **навигация и layout** + **чат-UX и ввод**.
> Источник данных: deep-research (26 источников, 204 утверждения) + анализ кодовой базы.
> Дата: 2026-06.

---

## 0. TL;DR

**Хорошая новость:** в RisuAI **уже есть мобильный каркас** — его не нужно строить с нуля, нужно достроить недостающие примитивы и отполировать два целевых потока.

Что уже есть:
- `$MobileGUI` (store) переключает на отдельный layout: [MobileHeader](../src/lib/Mobile/MobileHeader.svelte) → [MobileBody](../src/lib/Mobile/MobileBody.svelte) → [MobileFooter](../src/lib/Mobile/MobileFooter.svelte) в [App.svelte](../src/App.svelte).
- `$DynamicGUI` (брейкпоинт `innerWidth <= 1024`) переводит сайдбар в overlay-режим.
- Есть тема `waifuMobile` в [ChatScreen.svelte](../src/lib/ChatScreens/ChatScreen.svelte), резайз-бокс с тач-событиями, разрозненные JS-проверки `innerWidth < 768 / < 640`.

Чего критически не хватает (это и есть ядро работы):

| # | Пробел | Симптом на телефоне |
|---|--------|---------------------|
| 1 | `100vh` вместо `dvh/svh` | Контент уезжает под адресную строку, «прыжки» при скролле |
| 2 | Нет `viewport-fit=cover` + `env(safe-area-inset-*)` | UI под «чёлкой» / home-indicator на iPhone |
| 3 | Нет обработки виртуальной клавиатуры (`visualViewport`) | Клавиатура перекрывает поле ввода чата |
| 4 | Нет `overscroll-behavior` | Скролл «протекает» из списка сообщений на body, pull-to-refresh |
| 5 | Действия над сообщениями на `:hover` | Кнопки недоступны на тач-устройствах |
| 6 | Нет тач-целей 24–48px и `@media (pointer: coarse)` | Мелкие кнопки, промахи |

**Стратегия:** mobile-first CSS поверх существующего каркаса → добавить недостающие примитивы (фундамент) → отполировать навигацию/layout → отполировать чат-ввод → верифицировать на реальных устройствах. Реализацию вести через `/ui-ux-pro-max`.

---

## Статус реализации (Phase 1 + 2)

✅ **Phase 1 (фундамент)** и **Phase 2 (навигация/layout)** реализованы, `svelte-check` 0/0. Прошли адверсариальное ревью (5 измерений, верификация находок).

**⚠️ Ключевое уточнение архитектуры (нашло ревью):** у RisuAI **два** мобильных пути:
1. **Дефолтный `$DynamicGUI`** (`innerWidth <= 1024`, пересчёт на resize): адаптивный десктоп-layout — Sidebar становится overlay-drawer + ChatScreen. **Именно его видит большинство пользователей на телефоне.**
2. **Бета `$MobileGUI`** (`db.betaMobileGUI && innerWidth <= 800`, ставится один раз в bootstrap): отдельный MobileHeader/Body/Footer. **По умолчанию выключен.**

→ **Phase 3 и далее целить в дефолтный `$DynamicGUI`-путь** (Sidebar overlay + ChatScreen + DefaultChatScreen), а не в бета-компоненты. Высоту приложения регулирует **существующая система** `db.heightMode → --risu-height-size` (auto/vh/dvh/svh/lvh) — использовать её, не плодить параллельную.

> **Примечание (актуализация):** с тех пор `$MobileGUI` стал дефолтным шеллом на `<768px` (не бета-флагом), поэтому Phase 3 реализована поверх мобильного шелла + `DefaultChatScreen`.

---

## Статус реализации (Phase 3 — чат-UX, ChatGPT-уровень)

✅ Реализовано (`svelte-check` 0/0, прод-сборка зелёная, e2e-смоук на 390×844):

- **Стриминг без remount:** `Chats.svelte` держит стабильную идентичность сообщений (hash без `message.data`) и обновляет реактивные пропсы на месте — токены дописываются в существующий компонент, без пере-парсинга/мигания картинок; автопривязка к низу через `flex-col-reverse` (заменила 700ms-таймаут).
- **Bottom sheets:** `PopupList` на `$isPhone` рендерится нижней шторкой (бэкдроп, ручка, тач-ряды ≥44px) — все меню действий сообщений получили мобильный вид автоматически; `longtouch.ts` поддерживает touch (отмена по движению, подавление синтетического клика, вибрация).
- **Композер:** пилюля с ограничением высоты (max-h-40 + внутренний скролл), круглая кнопка-стрелка отправки, кнопка «стоп» (квадрат в круге поверх стадий генерации), индикатор «печатает» (три точки), круглая кнопка прокрутки вниз с бейджем непрочитанного, чипы саджестов горизонтальной лентой.
- **Навигация:** внутричатовое меню — overlay-drawer поверх чата (контекст не теряется); шапка чата: аватар + имя + название чата (тап → конфиг персонажа) + быстрый «новый чат»; список персонажей в стиле мессенджера (превью последнего сообщения, относительное время, FAB с safe-area); стартовая вкладка — Персонажи (conversation-first); хаптика на табы/отправку/шторки (`ts/gui/haptics.ts`).
- **Полировка:** анимация появления сообщений (с `prefers-reduced-motion`), увеличенные тач-цели `.chat-controls` на телефоне, `no-scrollbar` утилита.

**Живые примитивы:** `--safe-*`, `--kb-inset` (+ `ts/mobileKeyboard.ts`), `--touch-min` + `.risu-touch-target` (opt-in), сторы `isPhone`/`isTablet`, `overscroll-contain`+`max-width:88vw` на сайдбаре, `waifu`→`waifuMobile` на телефоне.

**Откатили в ревью (3 само-внесённых регресса):** `viewport-fit=cover` (коллизия с чёлкой на дефолтном пути — вернуть в Phase 3, когда панель ввода начнёт учитывать `--safe-bottom`); глобальное `@media(pointer:coarse){min-height:44px}` (unlayered → перебивало Tailwind `.min-h-8`, ломало компактные кнопки и инлайн-`<Help>` — теперь только opt-in `.risu-touch-target`); инлайн `height:var(--app-h)` (конфликт с heightMode — вернулись к `h-full`).

---

# ЧАСТЬ A. Исследование веб-практик (с источниками)

> ⚠️ Фаза адверсариальной проверки в deep-research не доработала (воркфлоу завис), поэтому утверждения извлечены, но не «отголосованы» автоматически. Ниже к ключевым пунктам добавлены **пометки верификации** там, где источники устарели.

## A1. Единицы высоты вьюпорта: `vh` → `svh / lvh / dvh`

- `100vh` на мобильных **багует**: не учитывает показ/скрытие адресной строки, поэтому `100vh`-элемент выше реально видимой области → контент обрезается и «прыгает» при скролле. [web.dev][12] [terluin][22] [madoromi][18]
- Новые единицы (Interop 2022):
  - **`svh`** — *small*: высота, когда панели браузера развёрнуты (минимальная стабильная). Для UI, который **никогда не должен прятаться**.
  - **`lvh`** — *large*: высота, когда панели свёрнуты (максимальная стабильная).
  - **`dvh`** — *dynamic*: динамически между `svh` и `lvh`. Для элементов, которые **должны адаптироваться**. [web.dev][12] [ishadeed][25]
- **Каверза производительности:** `dvh` пересчитывается throttled (не 60fps) — возможны рывки/лейаут-сдвиги при скролле. Где важна стабильность — берите `svh`. [web.dev][12] [madoromi][18]
- **Клавиатура НЕ входит в UA UI** → `dvh` **не сжимается** при появлении клавиатуры. Клавиатуру нужно обрабатывать отдельно (см. A3). [web.dev][12]
- Поддержка движков: **Chrome/Edge 108+, Firefox 101+, Safari 15.4+**. ✅ *(верифицировано — соответствует Baseline 2023; на 2026 повсеместно)*. [terluin][22]
- **iOS-квирк:** до фикса в WebKit (коммит 270652@main, ноябрь 2023) `svh` и `dvh` на iOS Safari были **равны** и менялись вместе. Старые версии iOS показывают этот баг. [webkit#261185][24]
- Фолбэк: оставляйте `vh` как запасной (`height: 100vh; height: 100dvh;`) для старых рантаймов. [madoromi][18]

**Вывод для RisuAI:** заменить `100vh` на `100dvh` для скроллящегося контейнера чата; `svh` — для фиксированных шапки/подвала, которые не должны прыгать.

## A2. Safe-area / «чёлка»: `viewport-fit=cover` + `env(safe-area-inset-*)`

- Чтобы значения `safe-area-inset-*` стали **ненулевыми**, обязателен `viewport-fit=cover` в meta viewport. Без него браузер сам резервирует место (и даёт меньший вьюпорт). [polypane][10]
- Четыре переменные: `env(safe-area-inset-top/right/bottom/left)` — применять как padding/позиционирование. [polypane][10]
- Инсеты содержат **только размер системного UI** (чёлка, home-indicator, dynamic island), без «воздуха» — добавляйте отступ через `calc()`: `calc(env(safe-area-inset-bottom) + 1rem)`. [polypane][10]
- `env()` поддерживает фолбэк вторым аргументом: `env(safe-area-inset-top, 0px)`. [polypane][10]
- ⚠️ **Ловушка разработки:** десктоп-браузеры и device-emulation в Chrome всегда дают `safe-area-inset = 0` → баги safe-area не видны в эмуляторе, нужен реальный девайс. [polypane][10]
- Фиксированные/плавающие элементы (шапки, нав-бары, кнопки чата) позиционировать **внутри** safe-area через инсеты. [polypane][10]

## A3. Виртуальная клавиатура — самая болезненная часть мобильного чата

Три механизма (по убыванию надёжности/совместимости):

1. **`interactive-widget` в meta viewport** — управляет реакцией вьюпорта на клавиатуру: `resizes-visual` (по умолчанию), `resizes-content` (ресайзит и layout-вьюпорт → меняет значения `vh/dvh`), `overlays-content`. Поддержка: **Chrome 108+, Firefox 132+; Safari — нет**. [bram.us][1]
2. **VisualViewport API** (`window.visualViewport`, события `resize`/`scroll`) — **рекомендованный** способ детектить клавиатуру на iOS Safari и репозиционировать нижние панели. Поддержка: все крупные браузеры, кроме legacy Edge/IE11 (с iOS 13). [tkte.ch][4] [franciscomoretti][2]
3. **VirtualKeyboard API** (`navigator.virtualKeyboard.overlaysContent = true` + CSS `env(keyboard-inset-*)`) — **только Chromium 94+**, не iOS Safari. [bram.us][1]

**iOS Safari — ключевые квирки (⚠️ обязательно учесть):**
- При открытой клавиатуре Safari **не уважает `position: fixed`** — фиксированные элементы ведут себя как `static` и уезжают со скроллом. [saricden][5] [medium][26]
- iOS Safari **не уменьшает высоту вьюпорта и не шлёт `resize`** при открытии клавиатуры (с iOS 8.2) → JS-детект по resize не работает; ловите `focus`/`blur` инпута + VisualViewport. [tkte.ch][4]
- Хардкод высоты клавиатуры (~270px) — **хрупкий**: ломается при аппаратной клавиатуре. Не использовать. [saricden][5]

**Практика:** чистый CSS `position: fixed; bottom: 0` рендерится глаже JS-подхода — используйте VisualViewport только как фолбэк/поверх. [franciscomoretti][2]
**⚠️ Svelte-нюанс:** `svelte/reactivity/window` **не** даёт реактивной обёртки над `visualViewport` — нужен свой store/action. [svelte.dev][15]

## A4. Overscroll / scroll chaining: `overscroll-behavior`

- `overscroll-behavior-y: contain` на контейнере списка сообщений **останавливает «протекание» скролла** на body, когда достигнут верх/низ. [ishadeed][6] [chrome][13]
- Значения: `auto` (по умолчанию, протекает), `contain` (без chaining, локальные эффекты есть), `none` (без chaining и без bounce/glow). [chrome][13]
- `overscroll-behavior-y: contain` на `body` отключает нативный pull-to-refresh одной строкой. [ishadeed][6]
- **Не вредит производительности** (в отличие от JS scroll-lock). [chrome][13]
- ⚠️ **Пометка верификации:** источники (2017–2021) пишут «не поддерживается в Safari». **Это устарело** — `overscroll-behavior` поддержан в **Safari 16+ (сентябрь 2022)**. На 2026 — кроссбраузерно. *(скорректировано вручную — фаза Verify это бы поймала)*

## A5. Размер тач-целей (WCAG / Apple / Google)

| Стандарт | Минимум |
|----------|---------|
| **WCAG 2.2 SC 2.5.8** (Level **AA**) | **24×24 CSS px** (с исключениями) [w3.org][7] |
| WCAG 2.2 (Level **AAA**) | **44×44 CSS px** [logrocket][8] |
| **Apple HIG** | **44×44 pt** [logrocket][8] |
| **Google Material** | **48×48 dp** [logrocket][8] |

- Исключение по интервалу: цель меньше 24px допустима, если **круг Ø24px** в её центре не пересекает другую цель. [w3.org][7] [accessibilitychecker][14]
- Инлайн-ссылки внутри текста сообщения **освобождены** от минимума. [w3.org][7]
- ⚠️ `w3.org/TR/wcag2mobile-22` — **черновик (06.05.2025), не утверждён**, секции про размеры — placeholder «Work In Progress». Не цитировать как норматив. [w3.org][9]
- **Практический ориентир:** floor 24px (AA), целиться в **44–48px** для основных действий — совместимо со всеми системами. [logrocket][8]
- ⚠️ Утверждение «44pt ≈ 59px» — это конверсия типографских пунктов; на практике 44pt ≈ 44 CSS px в вебе. Не закладывайте 59px.

## A6. Стратегия брейкпоинтов

- **Mobile-first** через `min-width` — меньше начальный payload, лучше перф на мобильных. [browserstack][20]
- Брейкпоинты — **content-driven** (ставить там, где ломается layout), а не под конкретные девайсы. [browserstack][20]
- Значения — в **rem/em**, не в device-px. [browserstack][20] [MDN][21]
- Flexbox/Grid **адаптивны по умолчанию** — многое рефлоуится без media-queries. [MDN][21]
- Шкала Tailwind как база: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. [svelte-u][17]
- Диапазоны устройств 2025: моб.портрет 320–480, моб.ландшафт 481–600, планшет 601–1024, десктоп 1025+. [browserstack][20]
- **WCAG 1.4.10 Reflow (AA):** контент без потерь и без 2D-скролла при **320 CSS px** ширины — целевой минимум. [w3.org][7]
- ⚠️ viewport meta `width=device-width, initial-scale=1` **обязателен** — иначе мобильный браузер берёт ~980px десктоп-вьюпорт и media-queries не срабатывают. (У RisuAI он есть.) [browserstack][20]

## A7. Навигация на мобильном

- Десктопное меню/сайдбар → **collapsible hamburger / slide-out drawer** для экономии места. [browserstack][20]
- `overscroll-behavior-y: contain` нужен и для drawer/модалок/меню (вложенный скролл). [chrome][13]
- Плавающие нав-элементы — внутри safe-area. [polypane][10]
- Реактивный скролл (`scrollY.current` из Svelte) → hide/show нав-бара или панели ввода при скролле. [svelte.dev][15]

## A8. Скролл и авто-скролл в чате (UX)

- `dvh` для высоты скролл-контейнера чата. [jhakim][23]
- **Последнему** сообщению давать большой `min-height` (≈ `calc(100dvh/2)`), чтобы свежий ответ не прилипал к низу и был читаем. [jhakim][23]
- Хелпер scroll-to-bottom: параметр `smooth | instant`; на первой загрузке — **instant** один раз (guard `hasLoaded`), при отправке/стриминге — **smooth**. [jhakim][23]
- Дебаунс скролла (~20ms) во время стриминга токенов, чтобы не дёргать вьюпорт. [jhakim][23]
- iOS: `-webkit-overflow-scrolling: touch` — *(легаси; momentum-скролл по умолчанию с iOS 13, можно опустить)*. [webkit][24]

## A9. Svelte-инструменты (Svelte 5)

- `svelte/reactivity/window` (с v5.11.0): реактивные `innerWidth.current` / `innerHeight.current` / `scrollX/Y.current` / `devicePixelRatio.current` — брейкпоинты без ручных resize-листенеров. [svelte.dev][15]
- На SSR все значения `undefined` — гард обязателен (актуально для SvelteKit). [svelte.dev][15]
- `devicePixelRatio.current` ведёт себя неконсистентно (Chrome реагирует на zoom, Firefox/Safari — нет). [svelte.dev][15]
- ⚠️ `visualViewport` модуль **не** покрывает — custom-решение (см. A3). [svelte.dev][15]
- Альтернатива для именованных брейкпоинт-сторов: `@sveu/browser` `breakpoints()` (`gt/gte/lt/lte/bn`). [svelte-u][17] [dev.to/hefeust][19]

## A10. Ориентация (WCAG 1.3.4, AA)

- Контент **не должен** ограничиваться одной ориентацией, кроме случаев, где она essential. Для чат/RP-приложения — **не лочить**, поддержать portrait и landscape. [silktide][11]

---

# ЧАСТЬ B. План адаптации под RisuAI

## B0. Текущая архитектура (привязка к файлам)

| Слой | Файл | Заметка |
|------|------|---------|
| Стек | `package.json` | Svelte **5.55** (runes), Tailwind **4.2** (`@import "tailwindcss"` в styles.css, без `tailwind.config`), Vite 8, Tauri |
| Глобальный CSS / тема | [src/styles.css](../src/styles.css) | `@theme` + `:root --risu-theme-*`; кастомные ширины `w-110/124/138` |
| viewport meta | [index.html](../index.html) | `width=device-width, initial-scale=1.0` — **нет** `viewport-fit/interactive-widget` |
| Стор-слой брейкпоинтов | [src/ts/stores.svelte.ts](../src/ts/stores.svelte.ts) | `DynamicGUI`(≤1024), `MobileGUI`, `sideBarStore`, resize-листенер |
| App shell | [src/App.svelte](../src/App.svelte) | switch: Settings / MobileGUI(Header+Body+Footer) / (Sidebar+ChatScreen) |
| Сайдбар | [src/lib/SideBars/Sidebar.svelte](../src/lib/SideBars/Sidebar.svelte) | ширины `w-96..w-138`, анимации drawer (строки ~1016–1045) |
| Мобильный каркас | [MobileHeader](../src/lib/Mobile/MobileHeader.svelte)/[Body](../src/lib/Mobile/MobileBody.svelte)/[Footer](../src/lib/Mobile/MobileFooter.svelte) | h-16 шапка, табы, нижняя навигация |
| Чат-экран | [ChatScreen.svelte](../src/lib/ChatScreens/ChatScreen.svelte) | темы `waifu` / `waifuMobile` / `default` |
| Сообщения | [Chat.svelte](../src/lib/ChatScreens/Chat.svelte) | действия на `hover:` ⚠️ |
| Композер/ввод | [DefaultChatScreen.svelte](../src/lib/ChatScreens/DefaultChatScreen.svelte) | строки ~587 (sticky/fixed input), ~518–559 (scroll-кнопки), ~896 (меню) |
| Textarea | `src/lib/UI/GUI/TextAreaInput.svelte` | min-height, focus |

## B1. ФАЗА 1 — Фундамент (примитивы; ~0.5–1 день)

**1.1 viewport meta** — [index.html](../index.html):
```html
<meta name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
```
→ включает safe-area (A2) и корректный ресайз вьюпорта под клавиатуру в Chrome/Firefox (A3). Для iOS Safari — JS-фолбэк в 1.4.

**1.2 CSS-токены safe-area + высота** — [src/styles.css](../src/styles.css), в `:root`/`@theme`:
```css
:root{
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --kb-inset: 0px;            /* обновляется из visualViewport, см. 1.4 */
  --app-h: 100dvh;            /* фолбэк 100vh ниже */
}
@supports not (height: 100dvh){ :root{ --app-h: 100vh; } }
/* тач-цели только для пальца */
@media (pointer: coarse){
  button, .risu-action, [role="button"]{ min-width: 44px; min-height: 44px; }
}
```

**1.3 Реактивные брейкпоинт-сторы** — [src/ts/stores.svelte.ts](../src/ts/stores.svelte.ts): добавить производные от уже существующего resize-листенера (или мигрировать на `innerWidth.current` из `svelte/reactivity/window`, A9):
```ts
// gphone < 768, tablet 768–1024, desktop > 1024
export const isPhone   = writable(window.innerWidth < 768);
export const isTablet  = writable(window.innerWidth >= 768 && window.innerWidth <= 1024);
// обновлять в существующем обработчике resize рядом с DynamicGUI/SizeStore
```
Это убирает разрозненные `window.innerWidth < 768/640` по компонентам (HotkeySettings, TriggerV2List, Chat) в один источник правды.

**1.4 Хук виртуальной клавиатуры (iOS-критично, A3)** — новый `src/ts/mobileKeyboard.ts`: подписка на `window.visualViewport` `resize`/`scroll`, выставляет `--kb-inset` в px = насколько клавиатура «съела» снизу:
```ts
export function trackKeyboard(){
  const vv = window.visualViewport; if(!vv) return;
  const set = () => {
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb-inset', inset + 'px');
  };
  vv.addEventListener('resize', set); vv.addEventListener('scroll', set); set();
}
```
Вызвать один раз при старте (например, в [App.svelte](../src/App.svelte) `onMount`). Дальше панель ввода отступает на `--kb-inset` (см. B3).

## B2. ФАЗА 2 — Фокус 1: Навигация и layout (~1–2 дня)

**2.1 App shell высота** — [App.svelte](../src/App.svelte): корневой `<main>` → высота `var(--app-h)` (dvh) вместо `h-full/100vh`; добавить `padding-top: var(--safe-top)` если шапка вплотную к чёлке.

**2.2 Сайдбар → drawer на телефоне** — [Sidebar.svelte:823-835](../src/lib/SideBars/Sidebar.svelte) (ширины) и `:1016-1045` (анимации):
- При `$isPhone`: сайдбар как **полноэкранный/почти-полноэкранный overlay-drawer** (`width: min(88vw, 24rem)`, `position: fixed`, оверлей-бэкдроп, закрытие по тапу вне/свайпу), а не `w-96..w-138`.
- Скролл-контейнер сайдбара: `overscroll-behavior-y: contain` (A4).
- На `$isPhone` для основного режима использовать существующий `$MobileGUI`-каркас как первичный (он уже разбит на Header/Body/Footer) — drawer нужен для промежуточного «планшетного» 768–1024.

**2.3 Mobile каркас + safe-area** — [MobileHeader](../src/lib/Mobile/MobileHeader.svelte) / [MobileFooter](../src/lib/Mobile/MobileFooter.svelte):
- Header: `padding-top: var(--safe-top)`; высота `calc(4rem + var(--safe-top))`.
- Footer (нижняя навигация): `padding-bottom: var(--safe-bottom)`.
- Кнопки навигации: `min-height: 48px` (A5).

**2.4 Темы под ширину** — [ChatScreen.svelte](../src/lib/ChatScreens/ChatScreen.svelte): авто-выбор `waifuMobile` при `$isPhone` (сейчас выбор темы не завязан на брейкпоинт); прятать боковой портрет `waifu`/ResizeBox на телефоне.

**2.5 Ориентация** — не лочить (A10); проверить, что Header/Footer/drawer не перекрывают контент в landscape (safe-left/right тоже применить).

## B3. ФАЗА 3 — Фокус 2: Чат-UX и ввод (~2–3 дня)

**3.1 Панель ввода над клавиатурой** — [DefaultChatScreen.svelte:587-588](../src/lib/ChatScreens/DefaultChatScreen.svelte):
```html
<!-- было: sticky/fixed bottom-0 -->
<div class="chat-input-bar"
     style="position: sticky; bottom: 0;
            padding-bottom: calc(var(--kb-inset) + var(--safe-bottom));">
```
- На Chrome/FF `interactive-widget=resizes-content` поднимет layout сам; `--kb-inset` (из 1.4) закрывает iOS Safari, где `position:fixed` не уважается (A3).
- Фон панели непрозрачный (уже `bg-bgcolor`), чтобы сообщения не просвечивали.

**3.2 Контейнер списка сообщений** — [Chats.svelte](../src/lib/ChatScreens/Chats.svelte) / скролл-обёртка:
- высота через `dvh`; `overscroll-behavior-y: contain` (A4 — стоп scroll chaining и pull-to-refresh).
- Последнему сообщению `min-height: calc(100dvh / 2)` для читаемости свежего ответа (A8).

**3.3 Авто-скролл** — логика scroll-to-bottom (рядом со строками ~518–559):
- первая загрузка → `behavior: 'instant'` один раз (guard);
- отправка/стриминг → `behavior: 'smooth'`, дебаунс ~20ms (A8).

**3.4 Действия над сообщением: hover → tap** — [Chat.svelte](../src/lib/ChatScreens/Chat.svelte) (copy/TTS/edit/reroll/bookmark на `hover:`):
- На `@media (pointer: coarse)`: либо **всегда видимые** иконки-действия, либо **overflow-меню** (три точки / long-press) — `:hover` на тач-устройстве не срабатывает надёжно (A5/A7).
- Каждое действие — тач-цель ≥44px (1.2).

**3.5 Textarea** — `src/lib/UI/GUI/TextAreaInput.svelte`:
- разумный `min-height` на телефоне; `font-size: 16px` (iOS зумит инпут при <16px);
- на `focus` — `scrollIntoView` поля, чтобы клавиатура его не закрыла (совместно с 1.4);
- кнопки рядом (Send/Asset/Sticker, [DefaultChatScreen.svelte:592](../src/lib/ChatScreens/DefaultChatScreen.svelte)) — ≥44px.

**3.6 Плавающие scroll-кнопки** — [DefaultChatScreen.svelte:518-559](../src/lib/ChatScreens/DefaultChatScreen.svelte): репозиционировать, чтобы не перекрывали панель ввода: `bottom: calc(var(--kb-inset) + var(--safe-bottom) + 4rem)`.

**3.7 Меню настроек чата** — [DefaultChatScreen.svelte:896](../src/lib/ChatScreens/DefaultChatScreen.svelte): на телефоне фикс-панель → slide-up bottom-sheet (тач-дружелюбно), `overscroll-behavior: contain`.

## B4. Сквозные задачи

- **Тач-цели/`pointer:coarse`** глобально (1.2) — пройтись по мелким иконкам в Sidebar/Chat.
- **drag-and-drop** реордера персонажей ([Sidebar.svelte](../src/lib/SideBars/Sidebar.svelte), пакет `mobile-drag-drop`) — проверить на тач, при необходимости дать tap-альтернативу.
- **Контекстные меню** ([TriggerV2List.svelte](../src/lib/SideBars/Scripts/TriggerV2List.svelte)) — позиционирование под тап/long-press, а не mouse-координаты.
- **Модалки** (HypaV3Modal, PopupEditor, LoadoutModal) — `max-width: 100vw`, `max-height: 100dvh`, safe-area padding.

## B5. Последовательность и приоритеты

```
Фаза 1 (фундамент)  ──► Фаза 2 (нав/layout)  ──► Фаза 3 (чат-ввод)  ──► B4 (полировка)
 viewport-meta            sidebar→drawer            keyboard/input bar     touch-targets
 safe-area токены         mobile safe-area          message scroll/UX      context-menus
 dvh/svh                  themes по брейкпоинту      hover→tap actions      modals
 keyboard hook            orientation                textarea/16px
 breakpoint-сторы
```
Фаза 1 разблокирует 2 и 3. Внутри 2 и 3 задачи во многом независимы и параллелятся.

## B6. Верификация (обязательно — фаза Verify воркфлоу не доработала)

- **Реальные устройства** (эмулятор скрывает safe-area и UI-бары, A2): iPhone (Safari, чёлка/home-indicator + клавиатура), Android (Chrome). Минимум iPhone SE (узкий) и стандартный Android (390–393px).
- Чек-лист: `100dvh` не обрезает; клавиатура не перекрывает ввод (особенно iOS); скролл не «протекает» на body; все действия доступны без hover; тач-цели ≥44px; portrait+landscape; reflow на 320px (A6).
- Автоматизация: Playwright (`mcp__plugin_playwright__browser_resize` + эмуляция девайсов) для регрессий layout; ручной проход для клавиатуры/жестов.

## B7. Реализация через `/ui-ux-pro-max`

Когда план утверждён — вести реализацию через `/ui-ux-pro-max` (UI/UX-интеллект под Svelte/Tailwind: паттерны drawer/bottom-nav/bottom-sheet, тач-состояния, типографика, отступы). Этот документ = вход для фаз build/implement скилла.

---

## Источники (26)

1. bram.us — VirtualKeyboard API: https://www.bram.us/2021/09/13/prevent-items-from-being-hidden-underneath-the-virtual-keyboard-by-means-of-the-virtualkeyboard-api/
2. franciscomoretti.com — visualViewport keyboard overlap: https://www.franciscomoretti.com/blog/fix-mobile-keyboard-overlap-with-visualviewport
3. htmhell.dev — advent calendar 2024/4: https://www.htmhell.dev/adventcalendar/2024/4/
4. tkte.ch — Safari 13, keyboards & VisualViewport: https://tkte.ch/articles/2019/09/23/safari-13-mobile-keyboards-and-the-visualviewport-api.html
5. saricden.com — fixed elements respect virtual keyboard (iOS): https://saricden.com/how-to-make-fixed-elements-respect-the-virtual-keyboard-on-ios
6. ishadeed.com — prevent scroll chaining (overscroll-behavior): https://ishadeed.com/article/prevent-scroll-chaining-overscroll-behavior/
7. W3C — WCAG 2.2 Understanding 2.5.8 Target Size (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
8. LogRocket — accessible touch target sizes: https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/
9. W3C — WCAG2Mobile (draft): https://www.w3.org/TR/wcag2mobile-22/
10. polypane.app — safe-area-inset: https://polypane.app/blog/using-safe-area-inset-to-build-mobile-safe-layouts/
11. silktide.com — WCAG 1.3.4 Orientation: https://silktide.com/accessibility-guide/the-wcag-standard/1-3/adaptable/1-3-4-orientation/
12. web.dev — viewport units (svh/lvh/dvh): https://web.dev/blog/viewport-units
13. Chrome Developers — overscroll-behavior: https://developer.chrome.com/blog/overscroll-behavior
14. accessibilitychecker.org — 24px touch targets: https://www.accessibilitychecker.org/wcag-guides/all-touch-targets-must-be-24px-large-or-leave-sufficient-space/
15. svelte.dev — svelte/reactivity/window: https://svelte.dev/docs/svelte/svelte-reactivity-window
16. dev.to/franciscomoretti — visualViewport: https://dev.to/franciscomoretti/fix-mobile-keyboard-overlap-with-visualviewport-3a4a
17. svelte-u — breakpoints (@sveu/browser): https://svelte-u.vercel.app/docs/browser/breakpoints
18. dev.madoromi.org — lvh/svh/dvh: https://dev.madoromi.org/en/lvh-svh-and-dvh/
19. dev.to/hefeust — SvelteKit responsive helper: https://dev.to/hefeust/sveltekit-responsive-helper-283c
20. BrowserStack — responsive design breakpoints: https://www.browserstack.com/guide/responsive-design-breakpoints
21. MDN — Responsive Design: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design
22. terluinwebdesign.nl — 20 new CSS viewport units: https://www.terluinwebdesign.nl/en/blog/incoming-20-new-css-viewport-units-svh-lvh-dvh-svw-lvw-dvw/
23. jhakim.com — scroll behavior for AI chat apps: https://jhakim.com/blog/handling-scroll-behavior-for-ai-chat-apps
24. WebKit Bugzilla #261185 — iOS svh/dvh equality bug: https://bugs.webkit.org/show_bug.cgi?id=261185
25. ishadeed.com — new viewport units: https://ishadeed.com/article/new-viewport-units/
26. medium.com — Safari & position:fixed: https://medium.com/@im_rahul/safari-and-position-fixed-978122be5f29

---

## Оговорки / методология

- Веб-исследование: deep-research, 26 источников, 204 извлечённых утверждения по 6 углам (broad, CSS-техники, chat-UX/клавиатура, browser quirks, accessibility, Svelte).
- ⚠️ Адверсариальная фаза проверки (3 голоса/claim) **не доработала** — воркфлоу дважды зависал на барьере фазы Fetch/Verify. Поэтому ключевые claim'ы верифицированы **вручную** автором синтеза; устаревшие пункты помечены «скорректировано» (например, поддержка `overscroll-behavior` в Safari 16+).
- Привязка к коду — по карте кодовой базы (агент Explore); номера строк ориентировочны, проверять при правке.
