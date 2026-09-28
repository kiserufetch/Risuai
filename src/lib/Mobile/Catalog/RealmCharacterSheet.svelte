<script lang="ts">
    import { untrack } from 'svelte'
    import { BookIcon, CheckIcon, DownloadIcon, FlagIcon, ImageIcon, LinkIcon, PaletteIcon, RefreshCwIcon, SmileIcon, TrashIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertConfirm, alertInput, alertNormal } from 'src/ts/alert'
    import { hubURL } from 'src/ts/characterCards'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { CCLicenseData } from 'src/ts/licenses'
    import { ParseMarkdown } from 'src/ts/parser/parser.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { parseMultilangString, toLangName } from 'src/ts/util'
    import {
        fetchRealmPage,
        findImportedRealmCharacter,
        getRealmCard,
        importRealmCard,
        openImportedRealmCharacter,
        realmHasLore,
        realmHasUpdate,
        realmImageUrl,
        realmUploadDate,
        type RealmCard,
    } from 'src/ts/realmLibrary'
    import Sheet from '../../MobileChat/Sheet.svelte'

    // RisuRealm character sheet (mockup "RisuRealm · карточка"): cover, author, date,
    // features, per-language description, tags, license, more from the author, import.

    interface Props {
        card: RealmCard
        nsfw: boolean
        onclose: () => void
        onsearch: (query: string) => void
    }

    let { card, nsfw, onclose, onsearch }: Props = $props()

    // The sheet can move on to a fork or another card of the author; it starts at `card`.
    let current: RealmCard = $state(untrack(() => card))
    let moreFromAuthor: RealmCard[] = $state([])
    let selectedLang = $state('')

    let descriptions = $derived(parseMultilangString(current.desc ?? ''))
    let langs = $derived(Object.keys(descriptions).filter((code) => code !== 'xx' || Object.keys(descriptions).length === 1))
    let activeLang = $derived.by(() => {
        if (selectedLang && descriptions[selectedLang] !== undefined) {
            return selectedLang
        }
        if (descriptions[DBState.db.language] !== undefined) {
            return DBState.db.language
        }
        return descriptions.en !== undefined ? 'en' : langs[0] ?? 'xx'
    })
    let uploaded = $derived(realmUploadDate(current))
    let importedIndex = $derived(findImportedRealmCharacter(current.id))
    let hasUpdate = $derived(realmHasUpdate(current))
    let isOwn = $derived((DBState.db.account?.token?.split('-') ?? [])[1] === current.creator)
    let licenseNote = $derived.by(() => {
        const data = CCLicenseData[current.license as keyof typeof CCLicenseData]
        if (!data) {
            return ''
        }
        const code = data[0]
        const parts = [language.mobileCatalog.licenseBy]
        if (code.includes('nc')) parts.push(language.mobileCatalog.licenseNc)
        if (code.includes('sa')) parts.push(language.mobileCatalog.licenseSa)
        if (code.includes('nd')) parts.push(language.mobileCatalog.licenseNd)
        if (current.license === 'private') parts.push(language.mobileCatalog.licensePrivate)
        return `${language.mobileCatalog.license.replace('{}', data[2])} — ${parts.join(', ')}`
    })

    $effect(() => {
        const author = current.authorname
        const id = current.id
        moreFromAuthor = []
        if (!author) {
            return
        }
        let cancelled = false
        fetchRealmPage({ search: `author:${author}`, page: 0, nsfw, sort: '' }).then((cards) => {
            if (!cancelled) {
                moreFromAuthor = cards.filter((c) => c.id !== id).slice(0, 12)
            }
        })
        return () => {
            cancelled = true
        }
    })

    async function openFork() {
        const original = await getRealmCard(current.original)
        if (original) {
            current = original
            selectedLang = ''
        }
    }

    async function copyLink() {
        await navigator.clipboard.writeText(`https://realm.risuai.net/character/${current.id}`)
        alertNormal(language.clipboardSuccess)
    }

    async function report() {
        if (!(await alertConfirm(language.mobileCatalog.reportConfirm))) {
            return
        }
        const text = await alertInput(language.mobileCatalog.reportPrompt)
        const res = await fetch(hubURL + '/hub/report', { method: 'POST', body: JSON.stringify({ id: current.id, report: text }) })
        alertNormal(await res.text())
    }

    async function removeFromRealm() {
        if (!(await alertConfirm(language.mobileCatalog.removeFromRealmConfirm))) {
            return
        }
        const res = await fetch(hubURL + '/hub/remove', { method: 'POST', body: JSON.stringify({ id: current.id, token: DBState.db.account?.token }) })
        alertNormal(await res.text())
    }

    function importCard() {
        const target = current
        onclose()
        importRealmCard(target)
    }

    function openImported() {
        const id = current.id
        onclose()
        openImportedRealmCharacter(id)
    }

    function search(query: string) {
        onclose()
        onsearch(query)
    }
</script>

<Sheet open={true} label={current.name} {onclose} class="gap-4">
    <div class="relative -mx-3 -mt-2 h-[200px] shrink-0 overflow-hidden rounded-t-[24px]" style="background: var(--mc-group);">
        {#if !DBState.db.hideAllImages}
            <img src={realmImageUrl(current)} alt={current.name} class="h-full w-full object-cover object-top" />
        {/if}
        <button type="button" class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full" style="background: rgb(10 12 16 / 0.6); color: #ededf0;" aria-label={language.mobileCatalog.close} onclick={onclose}>
            <XIcon size={18} />
        </button>
        <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-24" style="background: linear-gradient(to bottom, transparent, var(--mc-surface));"></span>
    </div>

    <div class="relative -mt-8 flex flex-col gap-1 px-1">
        <h2 class="text-[26px] font-bold leading-tight tracking-tight">{current.name}</h2>
        <span class="text-[14px] text-(--mc-text2)">
            {#if current.authorname}
                <button type="button" class="font-medium" style="color: var(--mc-accent);" onclick={() => search(`author:${current.authorname}`)}>{current.authorname}</button> ·
            {/if}
            {language.mobileCatalog.downloads.replace('{}', current.download)}
            {#if uploaded} · {uploaded.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}{/if}
        </span>
        {#if current.original}
            <button type="button" class="self-start text-[14px]" style="color: var(--mc-accent);" onclick={openFork}>{language.mobileCatalog.forkOf}</button>
        {/if}
    </div>

    {#if current.hasEmotion || current.hasAsset || realmHasLore(current) || current.viewScreen === 'imggen'}
        <div class="flex flex-wrap gap-2">
            {#if current.hasEmotion}
                <span class="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]" style="background: var(--mc-group);"><SmileIcon size={15} style="color: var(--mc-accent);" />{language.mobileCatalog.emotions}</span>
            {/if}
            {#if current.hasAsset}
                <span class="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]" style="background: var(--mc-group);"><ImageIcon size={15} style="color: var(--mc-accent);" />{language.mobileCatalog.assets}</span>
            {/if}
            {#if realmHasLore(current)}
                <span class="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]" style="background: var(--mc-group);"><BookIcon size={15} style="color: var(--mc-accent);" />{language.mobileCatalog.lorebook}</span>
            {/if}
            {#if current.viewScreen === 'imggen'}
                <span class="flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px]" style="background: var(--mc-group);"><PaletteIcon size={15} style="color: var(--mc-accent);" />{language.mobileCatalog.imageGen}</span>
            {/if}
        </div>
    {/if}

    {#if langs.length > 1}
        <div role="tablist" aria-label={language.mobileCatalog.descriptionLanguage} class="flex flex-wrap gap-1.5">
            {#each langs as code (code)}
                <button type="button" role="tab" aria-selected={activeLang === code} class="h-8 rounded-full border px-3 text-[13px] font-semibold" style={activeLang === code ? 'background: var(--mc-line); border-color: var(--mc-line); color: var(--mc-text);' : 'border-color: var(--mc-line); color: var(--mc-text2);'} onclick={() => { selectedLang = code }}>{toLangName(code)}</button>
            {/each}
        </div>
    {/if}
    {#if descriptions[activeLang]}
        <div class="chattext prose max-w-full px-1 text-[15px] break-words" class:prose-invert={$ColorSchemeTypeStore === 'dark'}>
            {#await ParseMarkdown(descriptions[activeLang]) then html}
                {@html html}
            {/await}
        </div>
    {/if}

    {#if current.tags?.length}
        <div class="flex flex-wrap gap-1.5">
            {#each current.tags as tag (tag)}
                <button type="button" class="flex h-[30px] items-center rounded-full px-3 text-[13px] font-medium" style="background: var(--mc-group); color: var(--mc-accent);" onclick={() => search(tag)}>{tag}</button>
            {/each}
        </div>
    {/if}

    {#if licenseNote}
        <span class="px-1 text-[13px] text-(--mc-text2)">{licenseNote}</span>
    {/if}

    {#if moreFromAuthor.length > 0}
        <div class="flex flex-col gap-2">
            <span class="px-1 text-[15px] font-semibold">{language.mobileCatalog.moreFrom.replace('{}', current.authorname ?? '')}</span>
            <div class="-mx-3 flex gap-2.5 overflow-x-auto px-3 no-scrollbar">
                {#each moreFromAuthor as other (other.id)}
                    <button type="button" class="flex w-24 shrink-0 flex-col gap-1.5 text-left" onclick={() => { current = other; selectedLang = '' }}>
                        <span class="block h-32 w-24 overflow-hidden rounded-xl" style="background: var(--mc-group);">
                            {#if !DBState.db.hideAllImages}
                                <img src={realmImageUrl(other)} alt="" loading="lazy" class="h-full w-full object-cover object-top" />
                            {/if}
                        </span>
                        <span class="truncate text-[12px] font-semibold">{other.name}</span>
                    </button>
                {/each}
            </div>
        </div>
    {/if}

    <div class="sticky bottom-0 -mx-3 flex flex-col gap-2.5 border-t px-4 pt-3" style="background: var(--mc-surface); border-color: var(--mc-line);">
        {#if importedIndex !== -1}
            <span class="flex items-center gap-2 text-[13px]" style="color: var(--mc-accent);">
                {#if hasUpdate}<RefreshCwIcon size={15} />{language.mobileCatalog.updateAvailable}{:else}<CheckIcon size={15} />{language.mobileCatalog.alreadyImported}{/if}
            </span>
        {/if}
        <div class="flex gap-2.5">
            <button type="button" class="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border text-(--mc-text2)" style="border-color: var(--mc-line);" aria-label={language.mobileCatalog.report} onclick={report}><FlagIcon size={19} /></button>
            {#if isOwn}
                <button type="button" class="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border" style="border-color: var(--mc-line); color: var(--mc-danger);" aria-label={language.mobileCatalog.removeFromRealm} onclick={removeFromRealm}><TrashIcon size={19} /></button>
            {/if}
            <button type="button" class="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border" style="border-color: var(--mc-line);" aria-label={language.mobileCatalog.copyLink} onclick={copyLink}><LinkIcon size={20} /></button>
            {#if importedIndex !== -1}
                <button type="button" class="h-[50px] flex-1 rounded-full border text-[15px] font-semibold" style={hasUpdate ? 'background: var(--mc-group); border-color: var(--mc-line);' : 'background: var(--mc-accent); border-color: var(--mc-accent); color: var(--mc-on-accent);'} onclick={openImported}>{language.mobileCatalog.open}</button>
                {#if hasUpdate}
                    <button type="button" class="h-[50px] flex-1 rounded-full text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={importCard}>{language.mobileCatalog.downloadUpdate}</button>
                {/if}
            {:else}
                <button type="button" class="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={importCard}>
                    <DownloadIcon size={20} />{language.spicyChat.import}
                </button>
            {/if}
        </div>
    </div>
</Sheet>
