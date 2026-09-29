<script lang="ts">
    // Single-line text row with the label above the value.

    interface Props {
        label: string
        value: string
        placeholder?: string
        hint?: string
        secret?: boolean
        mono?: boolean
        /** Runs after the bound value has updated. */
        oninput?: () => void
    }

    let { label, value = $bindable(), placeholder = '', hint = '', secret = false, mono = false, oninput }: Props = $props()
</script>

<label class="flex flex-col gap-1 px-4 py-2.5">
    <span class="text-[12px] text-(--mc-text2)">{label}</span>
    <input
        bind:value
        oninput={() => queueMicrotask(() => oninput?.())}
        type={secret ? 'password' : 'text'}
        {placeholder}
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        class="min-w-0 border-0 bg-transparent text-[15px] outline-none"
        class:font-mono={mono}
        style="color: var(--mc-text);"
    />
    {#if hint}<span class="text-[12px] text-(--mc-text2)">{hint}</span>{/if}
</label>
