# Мобильный чат — этап 3 (шторки, редактор, подсказки, вложения) — план

**Цель:** все пункты §5.3–5.6 спецификации [2026-09-28-mobile-chat-rework-design.md](../specs/2026-09-28-mobile-chat-rework-design.md).

**Режим исполнения:** по просьбе пользователя — сразу, без ревью; в конце `pnpm check` и `pnpm test`.

## Файлы

| Файл | Что делает |
|------|-----------|
| `src/lib/MobileChat/SheetTile.svelte`, `SheetRow.svelte`, `SheetGroup.svelte` | плитки, ряды 52 px (с переключателем), группы с разделителями |
| `src/lib/MobileChat/MessageActionsSheet.svelte` | шторка действий по долгому нажатию и кнопке «ещё» (§5.3) |
| `src/lib/MobileChat/ToolsSheet.svelte` | шторка «+» (§5.4), условия пунктов — как в меню `DefaultChatScreen` |
| `src/lib/MobileChat/StickerSheet.svelte` | стикеры через `AssetInput` |
| `src/lib/MobileChat/MessageEditor.svelte`, `editRequest.ts` | подзаголовок «имя · вариант n из N», подтверждение отмены, чипы `*…*` и `"…"`, «вернуть исходное», правка перевода в LLM-кэш |
| `src/lib/MobileChat/Composer.svelte` | кнопка «+», подсказки (`Suggestion`), поле перевода ввода |
| `src/lib/MobileChat/MobileChatScreen.svelte` | держит `MessageWindow`, шторки, `ChatList`, `ModuleChatMenu`, скриншот |
| `src/ts/chatCore/screenshot.ts` | перенос `DefaultChatScreen.screenShot` |

## Решения

- Подсказки — существующий `Suggestion.svelte` без изменений: он уже рисует горизонтальную ленту чипов; тап отправляет, кнопка копирования вставляет в поле.
- Закрытие шторок системной кнопкой «назад» отложено: приложение не ведёт историю, а очередь `history.back()` при переходе шторка → шторка закрывает вторую.
