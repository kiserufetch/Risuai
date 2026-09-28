<script lang="ts">
    import { AlertTriangleIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { dismissError, retryGeneration, showErrorDetails, type CapturedError } from 'src/ts/chatCore/generationStatus.svelte'

    // Generation error shown inline instead of a modal (spec §6.6).

    let { error }: { error: CapturedError } = $props()
</script>

<div class="risu-mc-error my-2 rounded-2xl border p-4" role="alert" style="border-color: color-mix(in oklab, var(--mc-danger) 45%, transparent); background: color-mix(in oklab, var(--mc-danger) 10%, var(--mc-surface));">
    <div class="flex items-center gap-2 text-[14px] font-semibold" style="color: var(--mc-danger);">
        <AlertTriangleIcon size={17} />
        {language.mobileChat.errorTitle}
    </div>
    <p class="mt-1.5 line-clamp-3 text-[13px] break-words text-(--mc-text2)">{error.msg}</p>
    <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="h-10 rounded-full px-4 text-[14px] font-semibold active:scale-95" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={() => retryGeneration()}>{language.mobileChat.errorRetry}</button>
        <button type="button" class="h-10 rounded-full px-4 text-[14px] active:scale-95" style="background: var(--mc-group);" onclick={showErrorDetails}>{language.mobileChat.errorDetails}</button>
        <button type="button" class="h-10 rounded-full px-4 text-[14px] text-(--mc-text2) active:scale-95" onclick={dismissError}>{language.mobileChat.errorDismiss}</button>
    </div>
</div>
