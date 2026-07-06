<script lang="ts">
    import { PaperclipIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { alertNormal } from "src/ts/alert";
    import {
        downloadSpicyChatCharacter,
        getSpicyChatCharacter,
        spicyChatImageBlobUrl,
        type SpicyChatCharacterDetail,
        type SpicyChatListDocument,
    } from "src/ts/spicychat";
    import { DBState } from 'src/ts/stores.svelte';

    interface Props {
        openedData: SpicyChatListDocument;
    }

    let { openedData = $bindable() }: Props = $props();

    let detail: SpicyChatCharacterDetail | null = $state(null)
    let loading = $state(true)
    let blobUrl: string | null = $state(null)

    const charId = $derived(openedData?.character_id ?? openedData?.id ?? '')

    $effect(() => {
        const id = charId
        detail = null
        loading = true
        if (!id) {
            loading = false
            return
        }
        let cancelled = false
        getSpicyChatCharacter(id).then((d) => {
            if (cancelled) {
                return
            }
            detail = d
            loading = false
        })
        return () => {
            cancelled = true
        }
    })

    $effect(() => {
        const avatar = detail?.avatar_url ?? openedData?.avatar_url
        let cancelled = false
        let created: string | null = null
        blobUrl = null
        spicyChatImageBlobUrl(avatar).then((url) => {
            if (cancelled) {
                if (url) {
                    URL.revokeObjectURL(url)
                }
                return
            }
            created = url
            blobUrl = url
        })
        return () => {
            cancelled = true
            if (created) {
                URL.revokeObjectURL(created)
            }
        }
    })
</script>


<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="top-0 left-0 z-50 fixed w-full h-full bg-black/50 flex justify-center items-center text-textcolor" role="button" tabindex="0" onclick={() => {
    openedData = null
}}>
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
    <div class="p-6 max-w-full bg-darkbg rounded-md flex flex-col gap-4 w-2xl overflow-y-auto max-h-full" onclick={(e) => {
        e.stopPropagation()
    }}>
        <div class="w-full flex flex-col">
            <h1 class="text-2xl font-bold max-w-full overflow-hidden whitespace-nowrap text-ellipsis">
                {detail?.name ?? openedData.name}
                {#if detail?.is_nsfw ?? openedData.is_nsfw}
                    <span class="text-xs px-1 py-0.5 rounded-sm bg-draculared text-white align-middle">NSFW</span>
                {/if}
            </h1>
            {#if detail?.creator_username ?? openedData.creator_username}
                <span class="text-borderc">{language.spicyChat.madeBy.replace('{}', detail?.creator_username ?? openedData.creator_username)}</span>
            {/if}
            <div class="flex justify-start gap-4 mt-4">
                {#if DBState.db.hideAllImages || !blobUrl}
                    <div class="h-36 w-36 min-w-36 rounded-md bg-darkbutton flex items-center justify-center text-textcolor2">
                        <span class="text-4xl">?</span>
                    </div>
                {:else}
                    <img class="h-36 w-36 min-w-36 rounded-md object-top object-cover" alt={detail?.name ?? openedData.name} src={blobUrl}>
                {/if}
                <div class="flex flex-col min-w-0">
                    {#if detail?.title ?? openedData.title}
                        <span class="text-textcolor wrap-break-word">{detail?.title ?? openedData.title}</span>
                    {/if}
                    {#if loading}
                        <span class="text-textcolor2 mt-2">{language.spicyChat.loading}</span>
                    {:else if detail && detail.definition_visible === false}
                        <span class="text-textcolor2 mt-2">{language.spicyChat.definitionHidden}</span>
                    {/if}
                </div>
            </div>

            {#if detail?.persona}
                <span class="text-textcolor2 mt-4 text-sm whitespace-pre-wrap wrap-break-word max-h-40 overflow-y-auto">{detail.persona}</span>
            {/if}
            {#if detail?.greeting ?? openedData.greeting}
                <div class="mt-4 border-t border-t-selected pt-2">
                    <span class="text-textcolor2 text-sm whitespace-pre-wrap wrap-break-word max-h-40 overflow-y-auto block">{detail?.greeting ?? openedData.greeting}</span>
                </div>
            {/if}

            <div class="flex flex-wrap justify-start gap-2 mt-2">
                {#each (detail?.tags ?? openedData.tags ?? []) as tag}
                    <div class="text-xs p-1 text-blue-400">{tag}</div>
                {/each}
            </div>
        </div>

        <div class="flex flex-row-reverse gap-2">
            <button class="text-textcolor2 hover:text-green-500" onclick={(async (e) => {
                e.stopPropagation()
                await navigator.clipboard.writeText(`https://spicychat.ai/chat/${charId}`)
                alertNormal(language.clipboardSuccess)
            })}>
                <PaperclipIcon />
            </button>
            <button class="bg-selected hover:ring-3 grow p-2 font-bold rounded-md mr-2" onclick={() => {
                downloadSpicyChatCharacter(charId)
                openedData = null
            }}>
                {language.spicyChat.import}
            </button>
        </div>
    </div>
</div>
