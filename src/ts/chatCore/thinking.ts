import { language } from 'src/lang'

// Reasoning block of a reply (mockup "C · Шаги"): the <Thoughts> text split into steps,
// how long the model thought, and the rendered block restyled as a step timeline.

export interface ThoughtsInfo {
    live: boolean
    seconds: number | null
}

/** Text of the first <Thoughts> block, or null when the reply has none. */
export function extractReasoning(text: string): string | null {
    const match = /<Thoughts>([\s\S]*?)(<\/Thoughts>|$)/.exec(text)
    return match ? match[1] : null
}

export function hasAnswer(text: string): boolean {
    return text.replace(/<Thoughts>[\s\S]*?(<\/Thoughts>|$)/g, '').trim().length > 0
}

export function splitSteps(reasoning: string): string[] {
    const text = reasoning.trim()
    if (!text) return []
    let steps = text.split(/\n\s*\n/)
    if (steps.length === 1 && text.includes('\n')) steps = text.split('\n')
    return steps.map((s) => s.trim()).filter(Boolean)
}

// Thinking time per reply: from the first reasoning chunk to the first answer text.
const started = new Map<string, number>()

export function thinkingStarted(id: string): number {
    if (!started.has(id)) started.set(id, Date.now())
    return started.get(id) ?? Date.now()
}

/** Milliseconds thought, when this session saw the start; clears the timer. */
export function thinkingFinished(id: string): number | null {
    const start = started.get(id)
    started.delete(id)
    return start ? Date.now() - start : null
}

function stepsWord(n: number): string {
    const t = language.mobileChat
    const form = new Intl.PluralRules('ru').select(n)
    return form === 'one' ? t.stepOne : form === 'few' ? t.stepFew : t.stepMany
}

const BRAIN = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5a3 3 0 1 0-6 .1 4 4 0 0 0-2 7.4A4 4 0 0 0 12 18Z"/><path d="M12 5a3 3 0 1 1 6 .1 4 4 0 0 1 2 7.4A4 4 0 0 1 12 18Z"/><path d="M12 5v13"/></svg>'
const CHEVRON = '<svg class="risu-mc-thoughts-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
const BLOCKS = new Set(['P', 'DIV', 'UL', 'OL', 'PRE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BR'])

/** Turns the parser's reasoning <details> into the step timeline; safe to run again. */
export function enhanceThoughts(root: HTMLElement | null, info: ThoughtsInfo | null) {
    if (!root || !info) return
    const details = Array.from(root.querySelectorAll('details')).find((d) => d.classList.contains('risu-mc-thoughts') || d.querySelector(':scope > summary')?.textContent?.trim() === language.cot)
    const summary = details?.querySelector(':scope > summary')
    if (!details || !summary) return

    if (!details.classList.contains('risu-mc-thoughts')) {
        let raw = ''
        for (const node of Array.from(details.childNodes)) {
            if (node === summary) continue
            raw += node.textContent ?? ''
            if (node instanceof HTMLElement && BLOCKS.has(node.tagName)) raw += '\n\n'
        }
        const list = document.createElement('ol')
        list.className = 'risu-mc-steps'
        for (const step of splitSteps(raw)) {
            const item = document.createElement('li')
            item.textContent = step
            list.append(item)
        }
        for (const node of Array.from(details.childNodes)) if (node !== summary) node.remove()
        details.append(list)
        details.classList.add('risu-mc-thoughts')
    }

    const items = details.querySelectorAll('.risu-mc-steps > li')
    items.forEach((li, i) => li.classList.toggle('risu-mc-step-live', info.live && i === items.length - 1))
    details.classList.toggle('risu-mc-thoughts-live', info.live)
    const t = language.mobileChat
    const time = info.seconds !== null ? ` · ${t.seconds.replace('{}', String(info.seconds))}` : ''
    const label = info.live
        ? `${t.thinkingStep.replace('{}', String(Math.max(1, items.length)))}${time}`
        : `${items.length} ${stepsWord(items.length)}${time}`
    summary.innerHTML = `${BRAIN}<span></span>${CHEVRON}`
    summary.querySelector('span')!.textContent = label
}
