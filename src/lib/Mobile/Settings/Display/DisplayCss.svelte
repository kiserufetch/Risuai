<script lang="ts">
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import { updateTextThemeAndCSS } from 'src/ts/gui/colorscheme'
    import { DBState } from 'src/ts/stores.svelte'

    // "Свой CSS": the app-wide stylesheet, applied when the field loses focus.

    const t = $derived(language.mobileDisplay)
</script>

<div class="flex flex-col gap-3">
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{t.cssNote}</span>
    <CodeField label="CSS" bind:value={DBState.db.customCSS} placeholder={'.chattext { }'} minRows={14} onchange={updateTextThemeAndCSS} />
</div>
