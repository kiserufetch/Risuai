<script lang="ts">
    import { type character, type groupChat } from "src/ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import { addCharacter, changeChar, getCharImage } from "src/ts/characters";
    import { MobileSearch } from "src/ts/stores.svelte";
    import { language } from "src/lang";
    import { haptic } from "src/ts/gui/haptics";
    import { PlusIcon, UsersIcon } from "@lucide/svelte";

    interface Props {
        endGrid?: () => void;
        search?: string;
        hideTrash?: boolean;
    }

    const agoFormatter = new Intl.RelativeTimeFormat(navigator.languages, { style: 'short' });

    let {endGrid = () => {}, search, hideTrash = false}: Props = $props();
    let normalizedSearch = $derived(normalizeSearch(search ?? $MobileSearch));

    function normalizeSearch(value:string){
        return value.replace(/ /g,"").toLocaleLowerCase();
    }

    function makeAgoText(time:number){
        if(time === 0){
            return "";
        }
        const diff = Date.now() - time;
        if(diff < 3600000){
            const min = Math.floor(diff / 60000);
            return agoFormatter.format(-min, 'minute');
        }
        if(diff < 86400000){
            const hour = Math.floor(diff / 3600000);
            return agoFormatter.format(-hour, 'hour');
        }
        if(diff < 604800000){
            const day = Math.floor(diff / 86400000);
            return agoFormatter.format(-day, 'day');
        }
        if(diff < 2592000000){
            const week = Math.floor(diff / 604800000);
            return agoFormatter.format(-week, 'week');
        }
        if(diff < 31536000000){
            const month = Math.floor(diff / 2592000000);
            return agoFormatter.format(-month, 'month');
        }
        const year = Math.floor(diff / 31536000000);
        return agoFormatter.format(-year, 'year');
    }

    // Plain-text snippet of the latest message for the conversation list,
    // stripped of markdown/CBS/HTML noise (messenger-style preview).
    function makePreview(c: character|groupChat): string {
        const chat = c.chats?.[c.chatPage] ?? c.chats?.[0]
        let text = chat?.message?.at(-1)?.data ?? ''
        if(!text && c.type !== 'group'){
            text = c.firstMessage ?? ''
        }
        text = text
            .replace(/{{[\s\S]*?}}/g, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/[*_#>`~|]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        return text.length > 90 ? text.slice(0, 90) : text
    }

    function sortChar(char: (character|groupChat)[]) {
        return char.map((c, i) => ({ c, i })).filter(({ c }) => {
            return !hideTrash || !c.trashTime;
        }).map(({ c, i }) => {
            return {
                name: c.name || "Unnamed",
                image: c.image,
                chats: c.chats.length,
                isGroup: c.type === 'group',
                preview: makePreview(c),
                i: i,
                interaction: c.lastInteraction || 0,
                agoText: makeAgoText(c.lastInteraction || 0),
            }
        }).sort((a, b) => {
            if (a.interaction === b.interaction) {
                return a.name.localeCompare(b.name);
            }
            return b.interaction - a.interaction;
        });
    }
</script>
<div class="flex flex-col items-center w-full overflow-y-auto overscroll-contain h-full">
    {#each sortChar(DBState.db.characters) as char, i}
        {#if normalizeSearch(char.name).includes(normalizedSearch)}
            <button class="flex items-center gap-3 w-full px-4 py-3 border-t-darkborderc active:bg-selected transition-colors text-left" class:border-t={i !== 0} onclick={() => {
                haptic(4)
                changeChar(char.i)
                endGrid()
            }}>
                {#await getCharImage(char.image, 'css') then css}
                    {#if css}
                        <div class="h-12 w-12 min-w-12 rounded-full shadow-sm" style={css}></div>
                    {:else}
                        <div class="h-12 w-12 min-w-12 rounded-full bg-selected flex items-center justify-center text-textcolor2 font-bold text-lg">
                            {char.name.slice(0, 1).toLocaleUpperCase()}
                        </div>
                    {/if}
                {/await}
                <div class="flex flex-1 min-w-0 flex-col gap-0.5">
                    <div class="flex items-baseline justify-between gap-2">
                        <span class="font-medium truncate flex items-center gap-1.5">
                            {#if char.isGroup}
                                <UsersIcon size={14} class="shrink-0 text-textcolor2" />
                            {/if}
                            {char.name}
                        </span>
                        {#if char.agoText}
                            <span class="text-xs text-textcolor2 shrink-0">{char.agoText}</span>
                        {/if}
                    </div>
                    <span class="text-sm text-textcolor2 truncate w-full">
                        {char.preview !== '' ? char.preview : language.noMessage}
                    </span>
                </div>
            </button>
        {/if}
    {/each}
    <!-- Spacer so the last row is reachable above the floating action button -->
    <div class="min-h-24 w-full shrink-0"></div>
</div>

<button class="p-4 rounded-full absolute right-4 bg-primary-600 text-white shadow-lg active:scale-95 transition-transform" style="bottom: calc(1rem + var(--safe-bottom));" aria-label={language.addCharacter} onclick={() => {
    haptic(6)
    addCharacter()
}}>
    <PlusIcon size={24} />
</button>
