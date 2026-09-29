<script lang="ts">
    import { ChevronRightIcon, DownloadIcon, PlusIcon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { exportRegex, importRegex } from 'src/ts/process/scripts'
    import type { customscript } from 'src/ts/storage/database.svelte'

    // A regex script list (preset or module scripts), styled like the profile's regex tab;
    // a tapped script opens in the caller's regex editor page.

    interface Props {
        scripts: customscript[]
        hint: string
        onopen: (index: number) => void
        onreplace: (next: customscript[]) => void
    }

    let { scripts, hint, onopen, onreplace }: Props = $props()

    const t = $derived(language.mobileBot)
    const s = $derived(language.mobileScripts)

    const TYPE_COLORS: Record<string, string> = {
        editinput: '#3b82f6', editoutput: '#22c55e', editprocess: '#a855f7', editdisplay: '#f59e0b', edittrans: '#ec4899', disabled: '#6b7280',
    }
    function typeLabel(type: string): string {
        const labels: Record<string, string> = {
            editinput: s.typeInput, editoutput: s.typeOutput, editprocess: s.typeProcess, editdisplay: s.typeDisplay, edittrans: s.typeTrans, disabled: s.typeDisabled,
        }
        return labels[type] ?? type
    }

    function add() {
        scripts.push({ comment: '', in: '', out: '', type: 'editinput' })
        onopen(scripts.length - 1)
    }
</script>

<div class="flex flex-col gap-4">
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{hint}</span>
    <div class="risu-mc-regex flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each scripts as script, i (i)}
            <button type="button" class="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" onclick={() => onopen(i)}>
                <span class="h-8 w-1 shrink-0 rounded-full" style="background: {TYPE_COLORS[script.type] ?? '#6b7280'};"></span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="truncate text-[15px] font-semibold">{script.comment || s.unnamed}</span>
                    <span class="truncate text-[12px] text-(--mc-text2)">{typeLabel(script.type)}{script.in ? ` · ${script.in}` : ''}</span>
                </span>
                <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
            </button>
        {:else}
            <span class="px-4 py-4 text-[15px] text-(--mc-text2)">{s.empty}</span>
        {/each}
        <button type="button" class="flex min-h-[52px] w-full items-center gap-2 px-4 text-[15px] font-medium" style="color: var(--mc-accent);" onclick={add}><PlusIcon size={18} />{s.addScript}</button>
    </div>
    <div class="grid grid-cols-2 gap-2">
        <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style="background: var(--mc-line);" onclick={() => exportRegex($state.snapshot(scripts))}><DownloadIcon size={16} />{t.export}</button>
        <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style="background: var(--mc-line);" onclick={async () => onreplace(await importRegex(scripts))}><UploadIcon size={16} />{t.import}</button>
    </div>
</div>

<style>
    .risu-mc-regex > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
