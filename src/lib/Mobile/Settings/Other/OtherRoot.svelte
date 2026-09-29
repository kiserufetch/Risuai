<script lang="ts">
    import { BrainIcon, ChevronRightIcon, ImageIcon, Volume2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { imageProviderName, memoryType } from './memory'
    import { otherPage, type OtherPage } from './otherPage.svelte'
    import { ttsKeys } from './tts'

    // Mockup "Другие боты · главная": the three helpers as cards with their state, and the
    // emotion detection method inline.

    const t = $derived(language.mobileOther)

    let memorySummary = $derived.by(() => {
        const type = memoryType()
        if (type === 'hypaV3') return `HypaMemory V3 · ${DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.name ?? ''}`
        return { none: t.off, supaMemory: 'SupaMemory', hypaV2: 'HypaMemory V2', hanuraiMemory: 'Hanurai' }[type]
    })
    let imageSummary = $derived.by(() => {
        const db = DBState.db
        const detail: Record<string, string | undefined> = {
            novelai: db.NAIImgModel, dalle: db.dallEQuality, stability: db.stabilityModel, fal: db.falModel, Imagen: db.ImagenModel,
            'openai-compat': db.openaiCompatImage?.model, wavespeed: db.wavespeedImage?.model,
        }
        if (!db.sdProvider) return t.off
        return [imageProviderName(db.sdProvider), detail[db.sdProvider]].filter(Boolean).join(' · ')
    })
    let ttsSummary = $derived.by(() => {
        const set = ttsKeys().filter((k) => (k.get() ?? '').trim()).length
        return [DBState.db.ttsAutoSpeech ? t.autoSpeechOn : '', t.keysSet.replace('{}', String(set))].filter(Boolean).join(' · ')
    })

    let cards = $derived([
        { page: 'memory' as OtherPage, icon: BrainIcon, color: '#6366f1', title: t.page_memory, value: memorySummary, hint: t.memoryHint },
        { page: 'image' as OtherPage, icon: ImageIcon, color: '#ec4899', title: t.page_image, value: imageSummary, hint: t.imageHint },
        { page: 'tts' as OtherPage, icon: Volume2Icon, color: '#22c55e', title: t.page_tts, value: ttsSummary, hint: t.ttsHint },
    ])
</script>

<div class="flex flex-col gap-4">
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{t.intro}</span>
    <div class="risu-mc-other flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each cards as card (card.page)}
            {@const Icon = card.icon}
            <button type="button" class="flex min-h-[76px] w-full items-center gap-3 px-4 py-2.5 text-left" onclick={() => { otherPage.current = card.page }}>
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style="background: {card.color};"><Icon size={22} /></span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="text-[15px] font-semibold">{card.title}</span>
                    <span class="truncate text-[13px]">{card.value}</span>
                    <span class="text-[12px] text-(--mc-text2)">{card.hint}</span>
                </span>
                <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
            </button>
        {/each}
    </div>
    <FormGroup label={language.emotionImage}>
        <FormSegmented label={language.emotionMethod} bind:value={DBState.db.emotionProcesser} options={[{ value: 'submodel', label: t.emotionSub }, { value: 'embedding', label: t.emotionLocal }]} />
    </FormGroup>
</div>

<style>
    .risu-mc-other > :global(* + *) {
        position: relative;
    }
    .risu-mc-other > :global(* + *)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 68px;
        right: 0;
        border-top: 1px solid var(--mc-line);
    }
</style>
