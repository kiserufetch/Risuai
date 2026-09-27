import { runLuaButtonTrigger } from 'src/ts/process/scriptings'
import { runTrigger } from 'src/ts/process/triggers'
import { getCurrentCharacter, getCurrentChat, setCurrentChat } from 'src/ts/storage/database.svelte'
import { CurrentTriggerIdStore, ReloadChatPointer } from 'src/ts/stores.svelte'

// Chat.svelte handleButtonTriggerWithin: capture-phase clicks on a message root run
// the card's manual triggers (risu-trigger) and Lua onButtonClick (risu-btn).

export const SCRIPTED_SELECTOR = '[risu-trigger], [risu-btn]'

export function findScriptedOrigin(target: EventTarget | null): Element | null {
	const element = target as Element | null
	if (!element || typeof element.closest !== 'function') {
		return null
	}
	return element.closest(SCRIPTED_SELECTOR)
}

export async function handleScriptedClick(event: Event, idx: number): Promise<void> {
	const currentChar = getCurrentCharacter()
	if (!currentChar || currentChar.type === 'group') {
		return
	}
	const origin = findScriptedOrigin(event.target)
	if (!origin) {
		return
	}
	const triggerName = origin.getAttribute('risu-trigger')
	const triggerId = origin.getAttribute('risu-id')
	const btnEvent = origin.getAttribute('risu-btn')

	const triggerResult = triggerName
		? await runTrigger(currentChar, 'manual', {
			chat: getCurrentChat(),
			manualName: triggerName,
			triggerId: triggerId || undefined,
		})
		: btnEvent
			? await runLuaButtonTrigger(currentChar, btnEvent)
			: null

	if (triggerResult) {
		setCurrentChat(triggerResult.chat)
		ReloadChatPointer.update((pointers) => {
			pointers[idx] = (pointers[idx] ?? 0) + 1
			return pointers
		})
	}

	if (triggerName && triggerId) {
		setTimeout(() => {
			CurrentTriggerIdStore.set(null)
		}, 100)
	}
}
