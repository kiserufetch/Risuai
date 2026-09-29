<script lang="ts">
    import { DownloadIcon, PlusIcon, Trash2Icon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { downloadFile } from 'src/ts/globalApi.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { selectSingleFile } from 'src/ts/util'

    // Token bias ([text, -101..100]) or extra request parameters ([key, value]) as
    // editable two-field rows, like the tables in BotSettings.svelte.

    let { kind }: { kind: 'bias' | 'additional' } = $props()

    const t = $derived(language.mobileBot)
    let list: [string, string | number][] = $derived((kind === 'bias' ? DBState.db.bias : DBState.db.additionalParams) as [string, string | number][])

    function add() {
        if (kind === 'bias') DBState.db.bias.push(['', 0])
        else DBState.db.additionalParams.push(['', ''])
    }

    async function importBias() {
        const file = await selectSingleFile(['json'])
        if (!file) return
        const data = JSON.parse(new TextDecoder().decode(file.data))
        if (Array.isArray(data)) DBState.db.bias = data
    }
</script>

<div class="flex flex-col gap-4">
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{kind === 'bias' ? t.biasHint : t.additionalHint}</span>
    <div class="risu-mc-pairs flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each list as pair, i (i)}
            <div class="flex items-center gap-2 py-1.5 pl-4 pr-1.5">
                <input bind:value={pair[0]} placeholder={kind === 'bias' ? t.biasToken : language.key} aria-label={kind === 'bias' ? t.biasToken : language.key} autocomplete="off" autocapitalize="off" spellcheck="false" class="min-h-10 min-w-0 flex-1 border-0 bg-transparent font-mono text-[15px] outline-none" style="color: var(--mc-text);" />
                {#if kind === 'bias'}
                    <input type="number" inputmode="numeric" min={-101} max={100} value={pair[1]} oninput={(e) => { pair[1] = Number((e.currentTarget as HTMLInputElement).value) }} aria-label={language.value} class="h-9 w-20 rounded-lg border-0 text-center text-[15px] tabular-nums outline-none" style="background: var(--mc-surface); color: var(--mc-text);" />
                {:else}
                    <input bind:value={pair[1]} placeholder={language.value} aria-label={language.value} autocomplete="off" autocapitalize="off" spellcheck="false" class="h-9 w-[40%] rounded-lg border-0 px-2.5 font-mono text-[14px] outline-none" style="background: var(--mc-surface); color: var(--mc-text);" />
                {/if}
                <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={t.remove} onclick={() => { list.splice(i, 1) }}><Trash2Icon size={18} /></button>
            </div>
        {:else}
            <span class="px-4 py-4 text-[15px] text-(--mc-text2)">{kind === 'bias' ? language.noBias : language.noData}</span>
        {/each}
        <button type="button" class="flex min-h-[52px] w-full items-center gap-2 px-4 text-[15px] font-medium" style="color: var(--mc-accent);" onclick={add}><PlusIcon size={18} />{t.add}</button>
    </div>
    {#if kind === 'bias'}
        <div class="grid grid-cols-2 gap-2">
            <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style="background: var(--mc-line);" onclick={() => downloadFile('bias.json', JSON.stringify(DBState.db.bias, null, 2))}><DownloadIcon size={16} />{t.export}</button>
            <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style="background: var(--mc-line);" onclick={importBias}><UploadIcon size={16} />{t.import}</button>
        </div>
    {/if}
</div>

<style>
    .risu-mc-pairs > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
