<script lang="ts">
    import { language } from 'src/lang'

    // Monospace editor for code-like fields (Lua, background HTML, regex OUT).

    interface Props {
        label: string
        value: string
        placeholder?: string
        minRows?: number
        wrap?: boolean
        onchange?: () => void
    }

    let { label, value = $bindable(), placeholder = '', minRows = 8, wrap = false, onchange }: Props = $props()

    let lines = $derived((value ?? '').split('\n').length)
</script>

<label class="flex flex-col gap-1.5 rounded-2xl border px-3.5 py-3" style="background: color-mix(in oklab, var(--mc-bg) 70%, black); border-color: var(--mc-line);">
    <span class="flex justify-between gap-2 text-[12px] text-(--mc-text2)">
        <span>{label}</span>
        <span class="tabular-nums">{language.mobileScripts.lines.replace('{}', String(lines))}</span>
    </span>
    <textarea
        bind:value
        {placeholder}
        {onchange}
        rows={minRows}
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
        wrap={wrap ? 'soft' : 'off'}
        class="resize-none overflow-x-auto border-0 bg-transparent font-mono text-[13px] leading-5 outline-none"
        style="color: var(--mc-text); field-sizing: content; max-height: 65dvh; tab-size: 2;"
    ></textarea>
</label>
