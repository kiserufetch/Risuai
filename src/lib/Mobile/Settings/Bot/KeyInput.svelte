<script lang="ts">
    import { EyeIcon, EyeOffIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import type { KeyField } from './keys'

    // One credential: set/unset status on the right of the caption, masked unless revealed.

    let { field }: { field: KeyField } = $props()

    let revealed = $state(false)
    let value = $derived(field.get() ?? '')
    let masked = $derived(field.secret && DBState.db.hideApiKey && !revealed)
</script>

<label class="flex flex-col gap-1 px-4 py-2.5">
    <span class="flex items-center justify-between gap-2 text-[12px]">
        <span class="truncate text-(--mc-text2)">{field.label}</span>
        {#if value.trim()}
            <span class="shrink-0" style="color: #22c55e;">● {language.mobileBot.keySet}</span>
        {:else if !field.optional}
            <span class="shrink-0" style="color: #f59e0b;">● {language.mobileBot.keyMissing}</span>
        {/if}
    </span>
    <span class="flex items-center gap-2">
        <input
            type={masked ? 'password' : 'text'}
            {value}
            placeholder={field.placeholder ?? language.mobileBot.pasteKey}
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            oninput={(e) => field.set((e.currentTarget as HTMLInputElement).value)}
            class="min-w-0 flex-1 border-0 bg-transparent font-mono text-[15px] outline-none"
            style="color: var(--mc-text);"
        />
        {#if field.secret && DBState.db.hideApiKey}
            <button type="button" class="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileBot.reveal} aria-pressed={revealed} onclick={(e) => { e.preventDefault(); revealed = !revealed }}>
                {#if revealed}<EyeOffIcon size={18} />{:else}<EyeIcon size={18} />{/if}
            </button>
        {/if}
    </span>
</label>
