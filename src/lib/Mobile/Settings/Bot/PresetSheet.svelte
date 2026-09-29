<script lang="ts">
    import { CheckIcon, CopyIcon, EllipsisIcon, GitCompareIcon, ImageIcon, PlusIcon, Share2Icon, Trash2Icon, UploadIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import PromptDiffModal from 'src/lib/Others/PromptDiffModal.svelte'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import SheetGroup from 'src/lib/MobileChat/SheetGroup.svelte'
    import SheetRow from 'src/lib/MobileChat/SheetRow.svelte'
    import { alertCardExport, alertConfirm, alertError } from 'src/ts/alert'
    import { prebuiltPresets } from 'src/ts/process/templates/templates'
    import { changeToPreset, copyPreset, downloadPreset, importPreset } from 'src/ts/storage/database.svelte'
    import { DBState, ShowRealmFrameStore } from 'src/ts/stores.svelte'
    import { selectSingleFile } from 'src/ts/util'
    import { modelName } from './models'

    // Mockup "Пресеты": tap switches, ⋯ holds the per-preset actions of botpreset.svelte.

    let { open, onclose }: { open: boolean; onclose: () => void } = $props()

    const t = $derived(language.mobileBot)

    let actionsFor: number | null = $state(null)
    let compareFirst: number | null = $state(null)
    let diff: [number, number] | null = $state(null)

    function summary(i: number): string {
        const active = i === DBState.db.botPresetsId
        const preset = DBState.db.botPresets[i]
        const model = active ? DBState.db.aiModel : preset?.aiModel ?? ''
        const template = active ? DBState.db.promptTemplate : preset?.promptTemplate
        return `${modelName(model)} · ${template ? t.modeTemplate : t.modeSimple}`
    }

    function pick(i: number) {
        if (compareFirst !== null) {
            if (i !== compareFirst) diff = [compareFirst, i]
            compareFirst = null
            return
        }
        if (i !== DBState.db.botPresetsId) changeToPreset(i)
        onclose()
    }

    function addPreset() {
        const preset = safeStructuredClone(prebuiltPresets.OAI2)
        preset.name = 'New Preset'
        DBState.db.botPresets.push(preset)
    }

    async function setIcon(i: number) {
        actionsFor = null
        const file = await selectSingleFile(['png', 'jpg', 'jpeg', 'webp'])
        if (!file) return
        const img = new Image()
        img.src = URL.createObjectURL(new Blob([file.data as BlobPart], { type: 'image/png' }))
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = 48
        canvas.height = 48
        canvas.getContext('2d')?.drawImage(img, 0, 0, 48, 48)
        DBState.db.botPresets[i].image = canvas.toDataURL('image/jpeg', 0.7)
        URL.revokeObjectURL(img.src)
    }

    async function share(i: number) {
        actionsFor = null
        const choice = await alertCardExport('preset')
        if (choice.type === '') downloadPreset(i, 'risupreset')
        if (choice.type === 'realm') ShowRealmFrameStore.set(`preset:${i}`)
    }

    async function remove(i: number) {
        actionsFor = null
        if (DBState.db.botPresets.length === 1) {
            alertError(language.errors.onlyOneChat)
            return
        }
        if (!(await alertConfirm(`${language.removeConfirm}${DBState.db.botPresets[i].name}`))) return
        changeToPreset(0)
        DBState.db.botPresets.splice(i, 1)
        changeToPreset(0, false)
    }
</script>

<Sheet {open} label={language.presets} {onclose}>
    <div class="flex shrink-0 items-center gap-2 px-1">
        <span class="flex-1 text-[18px] font-bold">{language.presets}</span>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={t.close} onclick={onclose}><XIcon size={16} /></button>
    </div>
    {#if compareFirst !== null}
        <div class="flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-[13px]" style="background: var(--mc-accent-soft);">
            <GitCompareIcon size={16} class="shrink-0" /><span class="flex-1">{t.compareHint.replace('{}', DBState.db.botPresets[compareFirst]?.name ?? '')}</span>
            <button type="button" class="font-semibold" style="color: var(--mc-accent);" onclick={() => { compareFirst = null }}>{t.cancel}</button>
        </div>
    {/if}
    <div class="risu-mc-presets flex shrink-0 flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each DBState.db.botPresets as preset, i (i)}
            {@const on = i === DBState.db.botPresetsId}
            <div class="flex min-h-16 items-center" style={on ? 'background: var(--mc-accent-soft);' : ''}>
                <button type="button" class="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2 pl-3 text-left" onclick={() => pick(i)}>
                    {#if preset.image}
                        <img src={preset.image} alt="" class="h-10 w-10 shrink-0 rounded-xl object-cover" decoding="async" />
                    {:else}
                        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[16px] font-bold" style="background: var(--mc-line); color: var(--mc-text2);">{(preset.name || '?').charAt(0).toUpperCase()}</span>
                    {/if}
                    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="truncate text-[15px] font-semibold">{preset.name || 'Preset'}</span>
                        <span class="truncate text-[12px] text-(--mc-text2)">{summary(i)}</span>
                    </span>
                    {#if on}<span class="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white" style="background: var(--mc-accent);"><CheckIcon size={13} strokeWidth={3} /></span>{/if}
                </button>
                <button type="button" class="mx-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={t.actions} onclick={() => { actionsFor = i }}><EllipsisIcon size={20} /></button>
            </div>
        {/each}
    </div>
    <div class="grid shrink-0 grid-cols-2 gap-2">
        <button type="button" class="flex h-[46px] items-center justify-center gap-1.5 rounded-[14px] text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent, #fff);" onclick={addPreset}><PlusIcon size={18} />{t.newPreset}</button>
        <button type="button" class="flex h-[46px] items-center justify-center gap-1.5 rounded-[14px] text-[15px] font-semibold" style="background: var(--mc-line);" onclick={() => importPreset()}><UploadIcon size={18} />{t.import}</button>
    </div>
</Sheet>

<Sheet open={actionsFor !== null} label={t.actions} onclose={() => { actionsFor = null }}>
    {#if actionsFor !== null && DBState.db.botPresets[actionsFor]}
        {@const i = actionsFor}
        <label class="flex shrink-0 flex-col gap-1 rounded-2xl px-4 py-2.5" style="background: var(--mc-group);">
            <span class="text-[12px] text-(--mc-text2)">{language.name}</span>
            <input bind:value={DBState.db.botPresets[i].name} class="border-0 bg-transparent text-[16px] font-semibold outline-none" style="color: var(--mc-text);" />
        </label>
        <SheetGroup>
            <SheetRow label={t.presetIcon} onclick={() => setIcon(i)}><ImageIcon size={20} /></SheetRow>
            <SheetRow label={t.duplicate} onclick={() => { copyPreset(i); actionsFor = null }}><CopyIcon size={20} /></SheetRow>
            <SheetRow label={t.export} onclick={() => share(i)}><Share2Icon size={20} /></SheetRow>
            {#if DBState.db.showPromptComparison}
                <SheetRow label={t.compare} onclick={() => { compareFirst = i; actionsFor = null }}><GitCompareIcon size={20} /></SheetRow>
            {/if}
        </SheetGroup>
        <SheetGroup>
            <SheetRow label={t.remove} danger onclick={() => remove(i)}><Trash2Icon size={20} /></SheetRow>
        </SheetGroup>
    {/if}
</Sheet>

{#if diff}
    <PromptDiffModal firstPresetId={diff[0]} secondPresetId={diff[1]} onClose={() => { diff = null }} />
{/if}

<style>
    .risu-mc-presets > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
