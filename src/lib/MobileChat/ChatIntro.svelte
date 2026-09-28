<script lang="ts">
    import { aiLawApplies } from 'src/ts/globalApi.svelte'
    import { language } from 'src/lang'
    import type { character } from 'src/ts/storage/database.svelte'
    import CreatorQuote from '../ChatScreens/CreatorQuote.svelte'

    // Above the greeting: the AI-content notice and the creator's comment
    // (DefaultChatScreen.svelte).

    let { char, empty }: { char: character; empty: boolean } = $props()
</script>

{#if aiLawApplies() && empty}
    <div class="mx-auto mt-4 max-w-[80%] text-center text-[13px] italic break-words text-(--mc-text2)">
        {language.aiGenerationWarning}
    </div>
{/if}
{#if !char.removedQuotes && char.creatorNotes.length >= 2}
    <CreatorQuote quote={char.creatorNotes} onRemove={() => {
        char.removedQuotes = true
    }} />
{/if}
