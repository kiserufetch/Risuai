<script lang="ts">
    import { language } from 'src/lang'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { getDraft } from 'src/ts/chatCore/composerDraft.svelte'
    import AssetInput from '../ChatScreens/AssetInput.svelte'
    import Sheet from './Sheet.svelte'

    // Character assets as stickers (DefaultChatScreen toggleStickers): picking one
    // appends the same markup to the draft.

    let { onclose }: { onclose: () => void } = $props()

    let char = $derived(session.getCharacter())

    function select(asset: [string, string, string]) {
        let fileType = 'img'
        if (asset.length > 2 && asset[2]) {
            if (asset[2] === 'mp4' || asset[2] === 'webm') {
                fileType = 'video'
            } else if (asset[2] === 'mp3' || asset[2] === 'wav') {
                fileType = 'audio'
            }
        }
        getDraft(session.getChatKey()).text += `<span class='notranslate' translate='no'>{{${fileType}::${asset[0]}}}</span> *${asset[0]} added*`
        onclose()
    }
</script>

<Sheet open={true} label={language.mobileChat.stickers} {onclose}>
    {#if char}
        <div class="flex flex-wrap">
            <AssetInput currentCharacter={char} onSelect={select} />
        </div>
    {/if}
</Sheet>
