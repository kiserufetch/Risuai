<script lang="ts">
    import { ArrowLeft, ArrowRight, SearchIcon, TagIcon, XIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import {
        getSpicyChatAppConfig,
        getSpicyChatHub,
        type SpicyChatListDocument,
        type SpicyChatSortMode,
    } from "src/ts/spicychat";
    import { SpicyChatInitialOpenChar } from "src/ts/stores.svelte";
    import SpicyChatCard from "./SpicyChatCard.svelte";
    import SpicyChatPopUp from "./SpicyChatPopUp.svelte";

    let openedData: null | SpicyChatListDocument = $state(null)

    let charas: SpicyChatListDocument[] = $state([])
    let page = $state(1)
    let totalPages = $state(1)
    let sort: SpicyChatSortMode = $state('popular')
    let search = $state('')
    let nsfw = $state(false)
    let selectedTags: string[] = $state([])
    let availableTags: string[] = $state([])
    let facetCounts: Record<string, number> = $state({})
    let loading = $state(false)
    let tagMenuOpen = $state(false)

    const sortModes: { mode: SpicyChatSortMode, label: () => string }[] = [
        { mode: 'popular', label: () => language.spicyChat.sortPopular },
        { mode: 'trending', label: () => language.spicyChat.sortTrending },
        { mode: 'newest', label: () => language.spicyChat.sortNewest },
        { mode: 'oldest', label: () => language.spicyChat.sortOldest },
        { mode: 'toprated', label: () => language.spicyChat.sortTopRated },
    ]

    async function getHub() {
        loading = true
        const res = await getSpicyChatHub({
            search: search,
            page: page,
            nsfw: nsfw,
            sort: sort,
            tags: selectedTags,
        })
        loading = false
        if (res) {
            charas = res.cards
            totalPages = res.totalPages
            const counts: Record<string, number> = {}
            for (const facet of res.tagFacets) {
                counts[facet.value] = facet.count
            }
            facetCounts = counts
        }
        else {
            charas = [] // error already alerted by the data layer
        }
    }

    function changeSort(mode: SpicyChatSortMode) {
        sort = mode
        page = 1
        return getHub()
    }

    function toggleTag(tag: string) {
        if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter((t) => t !== tag)
        }
        else {
            selectedTags = [...selectedTags, tag]
        }
        page = 1
        return getHub()
    }

    getHub()
    getSpicyChatAppConfig().then((config) => {
        if (config) {
            availableTags = config.tags
        }
    })

    $effect(() => {
        if ($SpicyChatInitialOpenChar) {
            openedData = $SpicyChatInitialOpenChar
            $SpicyChatInitialOpenChar = null
        }
    })
</script>

<div class="w-full flex justify-center mt-4 mb-2">
    <div class="flex items-stretch w-2xl max-w-full">
        <input bind:value={search} onkeydown={(e) => {
            if(e.key === 'Enter'){
                page = 1
                getHub()
            }
        }} placeholder={language.spicyChat.search} class="peer focus:border-textcolor transition-colors outline-hidden text-textcolor p-2 min-w-0 border border-r-0 bg-transparent rounded-md rounded-r-none input-text text-xl grow ml-4 border-darkborderc resize-none overflow-y-hidden overflow-x-hidden max-w-full">
        <button
            onclick={() => {
                page = 1
                getHub()
            }}
                class="flex justify-center border-y border-darkborderc items-center text-textcolor p-3 peer-focus:border-textcolor hover:bg-blue-500 hover:text-white transition-colors"
        >
            <SearchIcon />
        </button>
        <button
            onclick={() => {
                tagMenuOpen = true
            }}
                class="peer-focus:border-textcolor mr-2 flex border-y border-r border-darkborderc justify-center items-center text-textcolor p-3 rounded-r-md hover:bg-blue-500 hover:text-white transition-colors"
        >
            <TagIcon />
        </button>
    </div>
</div>
<div class="w-full p-1 flex mb-3 overflow-x-auto sm:justify-center items-center">
    <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow whitespace-nowrap" class:ring-3={nsfw} onclick={() => {
        nsfw = !nsfw
        page = 1
        getHub()
    }}>
        NSFW
    </button>
    <div class="ml-2 mr-2 h-full border-r border-r-selected"></div>
    {#each sortModes as sortMode}
        <button class="bg-darkbg p-2 rounded-lg ml-2 flex justify-center items-center hover:bg-selected transition-shadow whitespace-nowrap" class:ring-3={sort === sortMode.mode} onclick={() => {
            changeSort(sortMode.mode)
        }}>
            {sortMode.label()}
        </button>
    {/each}
</div>
{#if selectedTags.length > 0}
    <div class="w-full p-1 flex mb-3 overflow-x-auto sm:justify-center items-center">
        {#each selectedTags as tag}
            <button class="bg-darkbg p-1 px-2 rounded-lg ml-2 flex justify-center items-center gap-1 text-blue-400 text-sm hover:bg-selected transition-colors whitespace-nowrap" onclick={() => {
                toggleTag(tag)
            }}>
                {tag}
                <XIcon size={14} />
            </button>
        {/each}
        <button class="ml-2 text-textcolor2 text-sm hover:text-green-500 whitespace-nowrap" onclick={() => {
            selectedTags = []
            page = 1
            getHub()
        }}>
            {language.spicyChat.clearTags}
        </button>
    </div>
{/if}
{#if loading}
    <div class="w-full flex justify-center p-4 text-textcolor2">
        <span>{language.spicyChat.loading}</span>
    </div>
{:else if charas.length === 0}
    <div class="w-full flex justify-center p-4 text-textcolor2">
        <span>{language.spicyChat.noResults}</span>
    </div>
{/if}
<div class="w-full flex gap-4 p-2 flex-wrap justify-center">
    {#key charas}
        {#each charas as chara}
            <SpicyChatCard onClick={() => {openedData = chara}} chara={chara} />
        {/each}
    {/key}
</div>
<div class="w-full flex justify-center">
    <div class="flex">
        <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg flex justify-center items-center hover:ring-3 transition-shadow" onclick={() => {
            if(page > 1){
                page -= 1
                getHub()
            }
        }}>
            <ArrowLeft />
        </button>
        <button class="bg-darkbg h-14 px-4 min-w-14 rounded-lg ml-2 flex justify-center items-center transition-shadow">
            <span>{page} / {totalPages}</span>
        </button>
        <button class="bg-darkbg h-14 w-14 min-w-14 rounded-lg ml-2 flex justify-center items-center hover:ring-3 transition-shadow" onclick={() => {
            if(page < totalPages){
                page += 1
                getHub()
            }
        }}>
            <ArrowRight />
        </button>
    </div>
</div>

{#if openedData}
    <SpicyChatPopUp bind:openedData={openedData} />
{/if}

{#if tagMenuOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="top-0 left-0 z-50 fixed w-full h-full bg-black/50 flex justify-center items-center" role="button" tabindex="0" onclick={() => {
        tagMenuOpen = false
    }}>
        <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
        <div class="max-w-full max-h-full w-2xl bg-darkbg rounded-md flex flex-col gap-4 overflow-y-auto p-4" onclick={(e) => {
            e.stopPropagation()
        }}>
            <h1 class="font-bold text-2xl w-full">
                <span>
                    {language.spicyChat.tags}
                </span>
                <button class="float-right text-textcolor2 hover:text-green-500" onclick={() => {tagMenuOpen = false}}>
                    <XIcon />
                </button>
            </h1>
            <div class="mt-2 w-full border-t-2 border-t-bgcolor"></div>
            <div class="flex flex-wrap gap-2">
                {#each availableTags as tag}
                    <button class="p-1 px-2 rounded-lg text-sm transition-colors {selectedTags.includes(tag) ? 'bg-selected text-textcolor' : 'bg-bgcolor text-textcolor2 hover:bg-selected'}" onclick={() => {
                        toggleTag(tag)
                    }}>
                        {tag}{#if facetCounts[tag]}<span class="text-xs text-textcolor2 ml-1">{facetCounts[tag].toLocaleString()}</span>{/if}
                    </button>
                {/each}
                {#if availableTags.length === 0}
                    <span class="text-textcolor2">{language.spicyChat.loading}</span>
                {/if}
            </div>
        </div>
    </div>
{/if}
