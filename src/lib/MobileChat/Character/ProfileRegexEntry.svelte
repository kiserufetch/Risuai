<script lang="ts">
    import { language } from 'src/lang'
    import type { customscript } from 'src/ts/storage/database.svelte'
    import { ReloadGUIPointer } from 'src/ts/stores.svelte'
    import CodeField from './CodeField.svelte'

    // One regex script (mockup "Скрипты · regex-скрипт"), the fields and flag handling
    // of RegexData.svelte.

    let { script }: { script: customscript } = $props()

    const TYPES: [string, () => string][] = [
        ['editinput', () => language.mobileScripts.typeInput],
        ['editoutput', () => language.mobileScripts.typeOutput],
        ['editprocess', () => language.mobileScripts.typeProcess],
        ['editdisplay', () => language.mobileScripts.typeDisplay],
        ['edittrans', () => language.mobileScripts.typeTrans],
        ['disabled', () => language.mobileScripts.typeDisabled],
    ]

    const FLAGS: [string, () => string][] = [
        ['g', () => 'g'], ['i', () => 'i'], ['m', () => 'm'], ['u', () => 'u'], ['s', () => 's'],
        ['<move_top>', () => language.mobileScripts.flagTop],
        ['<move_bottom>', () => language.mobileScripts.flagBottom],
        ['<repeat_back>', () => language.mobileScripts.flagRepeat],
        ['<cbs>', () => language.mobileScripts.flagCbs],
        ['<no_end_nl>', () => language.mobileScripts.flagNoNl],
    ]

    function reload() {
        ReloadGUIPointer.update((v) => v + 1)
    }

    /** RegexData.checkFlagContain: one-letter flags are matched outside the <...> tokens. */
    function hasFlag(flag: string): boolean {
        const flags = script.flag ?? ''
        return (flag.length === 1 ? flags.replace(/<(.+?)>/g, '') : flags).includes(flag)
    }

    function toggleFlag(flag: string) {
        script.flag = hasFlag(flag) ? (script.flag ?? '').replace(flag, '') : (script.flag ?? '') + flag
    }

    let order = $derived(Number(script.flag?.match(/<order (-?\d+)>/)?.[1] ?? 0))

    function setOrder(value: number) {
        const next = Number.isFinite(value) ? Math.trunc(value) : 0
        const flags = script.flag ?? ''
        script.flag = flags.includes('<order') ? flags.replace(/<order (-?\d+)>/, `<order ${next}>`) : flags + `<order ${next}>`
    }

    function toggleCustomFlags() {
        script.ableFlag = !script.ableFlag
        if (!script.flag) {
            script.flag = 'g'
        }
    }
</script>

<div class="flex flex-col gap-3 pt-1">
    <label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
        <span class="text-[12px] text-(--mc-text2)">{language.mobileScripts.name}</span>
        <input bind:value={script.comment} onchange={reload} class="border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
    </label>

    <div class="flex flex-col gap-2">
        <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.mobileScripts.where}</span>
        <div role="radiogroup" aria-label={language.mobileScripts.where} class="flex flex-wrap gap-1.5">
            {#each TYPES as [value, label] (value)}
                {@const on = script.type === value}
                <button type="button" role="radio" aria-checked={on} class="h-[34px] rounded-full border px-3 text-[13px] font-medium" style={on ? 'background: var(--mc-accent-soft); border-color: var(--mc-accent); color: var(--mc-text);' : 'background: var(--mc-group); border-color: var(--mc-line);'} onclick={() => { script.type = value; reload() }}>{label()}</button>
            {/each}
        </div>
    </div>

    <label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
        <span class="text-[12px] text-(--mc-text2)">{language.mobileScripts.find}</span>
        <input bind:value={script.in} spellcheck="false" autocomplete="off" autocapitalize="off" class="border-0 bg-transparent font-mono text-[13px] outline-none" style="color: var(--mc-text);" />
    </label>

    <CodeField label={language.mobileScripts.replace} bind:value={script.out} minRows={4} wrap onchange={reload} />

    <button type="button" role="switch" aria-checked={!!script.ableFlag} class="flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left" style="background: var(--mc-group);" onclick={toggleCustomFlags}>
        <span class="flex-1 text-[15px]">{language.mobileScripts.customFlags}</span>
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {script.ableFlag ? 'var(--mc-accent)' : 'var(--mc-line)'};"><span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {script.ableFlag ? '21px' : '3px'};"></span></span>
    </button>

    {#if script.ableFlag}
        <div class="flex flex-wrap gap-1.5" role="group" aria-label={language.mobileScripts.flags}>
            {#each FLAGS as [flag, label] (flag)}
                {@const on = hasFlag(flag)}
                <button type="button" aria-pressed={on} class="h-[34px] rounded-full border px-3 text-[13px] font-medium" style={on ? 'background: var(--mc-accent-soft); border-color: var(--mc-accent); color: var(--mc-text);' : 'background: var(--mc-group); border-color: var(--mc-line);'} onclick={() => toggleFlag(flag)}>{label()}</button>
            {/each}
        </div>
        <label class="flex min-h-[52px] items-center gap-3 rounded-2xl px-4" style="background: var(--mc-group);">
            <span class="flex-1 text-[15px]">{language.mobileScripts.order}</span>
            <input type="number" inputmode="numeric" value={order} onchange={(e) => setOrder(Number((e.currentTarget as HTMLInputElement).value))} class="w-20 border-0 bg-transparent text-right text-[15px] tabular-nums outline-none" style="color: var(--mc-text);" />
        </label>
    {/if}
</div>
