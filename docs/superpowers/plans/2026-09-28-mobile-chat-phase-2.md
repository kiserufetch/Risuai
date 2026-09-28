# Мобильный чат — этап 2 (базовый экран) — план

**Цель:** новый экран чата виден на телефоне: шапка, лента, сообщение, панель под последним ответом, поле ввода, генерация и стоп, переключатель «Старый мобильный чат».

**Спецификация:** [docs/superpowers/specs/2026-09-28-mobile-chat-rework-design.md](../specs/2026-09-28-mobile-chat-rework-design.md) (§4.2, §5.1–5.2, §6.1, §6.4–6.6, §7).

**Режим исполнения:** по просьбе пользователя — сразу, без промежуточных ревью; в конце один прогон `pnpm check` и `pnpm test`.

## Файлы

| Файл | Что делает |
|------|-----------|
| `src/ts/chatCore/composerDraft.svelte.ts` | черновик поля ввода и вложения по ключу чата (§10.15) |
| `src/ts/chatCore/newChat.ts` | «новый чат» из `MobileHeader` (общий для старой и новой шапки) |
| `src/lib/MobileChat/MobileChatScreen.svelte` | корень `.risu-mc-screen[data-scheme]`, токены, фоны (`customBackground`, `BackgroundDom`), раскладка |
| `src/lib/MobileChat/ChatHeader.svelte` | стеклянная шапка: назад, аватар+имя+подзаголовок, новый чат, меню |
| `src/lib/MobileChat/MessageFeed.svelte` | скроллер `.default-chat-screen` (column-reverse), окно сообщений, подгрузка, cold storage, свёрнутый вид, автопрокрутка, «к последнему», переход к сообщению |
| `src/lib/MobileChat/MessageItem.svelte` | `.chat-message-container > .risu-chat`, строка имени, пузырь пользователя, скрытые, метка ветки, панель, заместители хоткеев |
| `src/lib/MobileChat/MessageBody.svelte` | `span.chattext.prose`, рендер через `messageRender`, перевод, стриминг strong, `PartialEditController` |
| `src/lib/MobileChat/ActionBar.svelte` | ‹ n/N › · реролл · копировать · изменить; для приветствия ‹ n/N › |
| `src/lib/MobileChat/MessageEditor.svelte` | полноэкранный редактор (базовый: отмена/сохранить, `.message-edit-area`) |
| `src/lib/MobileChat/Composer.svelte` | пилюля ввода, отправка/стоп, вставка изображений, вложения, Enter/Ctrl+M, панели плагинов |
| `src/lib/MobileChat/GenerationStatus.svelte` | плашка этапа (4 точки, подпись, таймер) |
| `src/lib/MobileChat/TypingIndicator.svelte`, `ErrorCard.svelte`, `ChatIntro.svelte` | индикатор, карточка ошибки (§6.6), предупреждение ИИ + комментарий создателя |
| `src/lib/Mobile/MobileBody.svelte` | `MobileChatScreen` вместо `ChatScreen`, если не `legacyMobileChat` |
| `src/lib/Mobile/MobileHeader.svelte` | не рисовать шапку чата при новом чате; `newChat` из ядра |
| `src/ts/storage/database.svelte.ts`, `displaySettingsData.svelte.ts`, `en.ts`, `ru.ts` | поле, переключатель и строки |

## Решения

- Ключ `{#each}` — `chatId ?? 'idx:' + i`; повторяющиеся ключи получают суффикс индекса (дубли `chatId` иначе роняют `each`). Весь список обёрнут в `{#key chatKey}`.
- `ReloadChatPointer[idx]` перемонтирует элемент; `ReloadGUIPointer` и сдвиг длины для последних 6 сообщений перезапускают рендер тела — как `Chat.svelte`.
- Стриминг: результат рендера применяется, если он не старее уже показанного, — как `lastParsed` в `ChatBody`.
- Шапка и поле ввода — поверх ленты; отступы ленты — распорки внутри скроллера (padding у column-reverse ненадёжен).
- Шторки «+» и действий, долгое нажатие, подсказки, стикеры — этап 3; иммерсив, портрет, Custom HTML — этап 5. До тех пор эти функции доступны через «Старый мобильный чат».

## Шаги

1. Ядро: `composerDraft`, `newChat`.
2. Настройка `legacyMobileChat` + строки.
3. Компоненты из таблицы.
4. Подключение в `MobileBody` / `MobileHeader`.
5. `pnpm check`, `pnpm test`, коммит.
