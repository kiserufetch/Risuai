<script lang="ts">
    import { MessageCircleIcon } from "@lucide/svelte";
    import { spicyChatImageBlobUrl, type SpicyChatListDocument } from "src/ts/spicychat";
    import { DBState } from "src/ts/stores.svelte";

    interface Props {
        onClick?: any;
        chara: SpicyChatListDocument;
    }

    let { onClick = () => {}, chara }: Props = $props();

    let blobUrl: string | null = $state(null)

    $effect(() => {
        const avatar = chara.avatar_url
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


<button class="bg-darkbg rounded-lg p-4 flex flex-col hover:bg-selected transition-colors relative lg:w-96 w-full items-start" onclick={onClick}>
    <div class="flex gap-2 w-full">
    {#if DBState.db.hideAllImages || !blobUrl}
        <div class="w-20 min-w-20 h-20 sm:h-28 sm:w-28 rounded-md bg-darkbutton flex items-center justify-center text-textcolor2">
            <span class="text-4xl">?</span>
        </div>
    {:else}
        <img class="w-20 min-w-20 h-20 sm:h-28 sm:w-28 rounded-md object-top object-cover" alt={chara.name} src={blobUrl}>
    {/if}
    <div class="flex flex-col grow min-w-0">
        <span class="text-textcolor text-lg min-w-0 max-w-full text-ellipsis whitespace-nowrap overflow-hidden text-start">
            {chara.name}
            {#if chara.is_nsfw}
                <span class="text-xs px-1 py-0.5 rounded-sm bg-draculared text-white align-middle">NSFW</span>
            {/if}
        </span>
        <span class="text-textcolor2 text-xs min-w-0 max-w-full text-ellipsis wrap-break-word max-h-8 whitespace-nowrap overflow-hidden text-start">{chara.title ?? ''}</span>
        <div class="flex flex-wrap">
            {#each chara.tags ?? [] as tag, i}
                {#if i < 4}
                    <div class="text-xs p-1 text-blue-400">{tag}</div>
                {:else if i === 4}
                    <div class="text-xs p-1 text-blue-400">...</div>
                {/if}
            {/each}
        </div>
        <div class="grow"></div>
        <div class="flex flex-wrap w-full flex-row-reverse gap-1 items-center">
            {#if typeof chara.num_messages === 'number'}
                <span class="text-textcolor2 text-xs flex items-center gap-1"><MessageCircleIcon size={12} />{chara.num_messages.toLocaleString()}</span>
            {/if}
        </div>
    </div>
</div></button>
