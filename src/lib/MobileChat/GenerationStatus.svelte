<script lang="ts">
    import { language } from 'src/lang'
    import { generationStatus } from 'src/ts/chatCore/generationStatus.svelte'

    // Stage plaque above the composer (spec §5.2): four dots for chatProcessStage 1–4,
    // the stage label and the time since sending.

    let now = $state(Date.now())

    $effect(() => {
        if (!generationStatus.running) {
            return
        }
        now = Date.now()
        const timer = setInterval(() => {
            now = Date.now()
        }, 1000)
        return () => clearInterval(timer)
    })

    let labels = $derived([
        language.mobileChat.stagePrompt,
        language.mobileChat.stageMemory,
        language.mobileChat.stageGenerating,
        language.mobileChat.stageProcessing,
    ])
    let stage = $derived(Math.min(Math.max(generationStatus.stage, 1), 4))
    let seconds = $derived(Math.max(0, Math.floor((now - generationStatus.startedAt) / 1000)))
    let elapsed = $derived(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`)
</script>

<div class="risu-mc-stage mx-auto flex h-8 w-fit items-center gap-2.5 rounded-full px-3.5 text-[12px] text-(--mc-text2) shadow-sm" role="status" style="background: var(--mc-surface); border: 1px solid var(--mc-line);">
    <span class="flex items-center gap-1" aria-hidden="true">
        {#each [1, 2, 3, 4] as step (step)}
            <span class="stage-dot" class:done={step < stage} class:active={step === stage}></span>
        {/each}
    </span>
    <span class="text-(--mc-text)">{labels[stage - 1]}</span>
    <span class="tabular-nums">{elapsed}</span>
</div>

<style>
    .stage-dot {
        width: 6px;
        height: 6px;
        border-radius: 9999px;
        background: var(--mc-line);
    }
    .stage-dot.done {
        background: var(--mc-accent);
    }
    .stage-dot.active {
        background: var(--mc-accent);
        animation: risu-mc-pulse 1s ease-in-out infinite;
    }
    @keyframes risu-mc-pulse {
        50% { opacity: 0.35; transform: scale(1.3); }
    }
    @media (prefers-reduced-motion: reduce) {
        .stage-dot.active { animation: none; }
    }
</style>
