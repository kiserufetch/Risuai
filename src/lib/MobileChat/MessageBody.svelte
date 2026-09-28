<script lang="ts">
    import { tick, untrack } from 'svelte'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { getLLMCache } from 'src/ts/translator/translator'
    import { DBState, ReloadGUIPointer } from 'src/ts/stores.svelte'
    import { findScriptedOrigin } from 'src/ts/chatCore/scriptedClicks'
    import { saveMessageEdit, saveTranslationEdit } from 'src/ts/chatCore/messageActions.svelte'
    import {
        TRANSLATION_LOADING_HTML,
        finalizeHtml,
        fixAssetImages,
        getTranslationCacheKey,
        hasCustomUi,
        prepareDisplayText,
        renderBody,
        shouldAutoTranslate,
        type BodyContext,
        type RenderCharacter,
    } from 'src/ts/chatCore/messageRender'
    import PartialEditController from '../ChatScreens/PartialEditController.svelte'

    // Message body with the exact render pipeline of Chat.svelte + ChatBody.svelte
    // (spec §7.1): CBS pass, ParseMarkdown, trimMarkdown, addMetadataToElement.

    interface Props {
        idx: number
        text: string
        role: string | null
        /** CBS `chara`: session.getRenderName(message). */
        name: string
        character: RenderCharacter
        firstMessage?: boolean
        modelShortName?: string
        /** Chats.svelte isOptimizedStreamingMessage. */
        streaming?: boolean
        streamingMode?: string
        /** Remount-free re-render trigger (last messages when the chat length changes). */
        renderKey?: number | string
        translated?: boolean
        retranslate?: boolean
        msgDisplay?: string
        ontap?: () => void
    }

    let {
        idx,
        text,
        role,
        name,
        character,
        firstMessage = false,
        modelShortName = '',
        streaming = false,
        streamingMode = 'off',
        renderKey = 0,
        translated = $bindable(false),
        retranslate = $bindable(false),
        msgDisplay = $bindable(''),
        ontap,
    }: Props = $props()

    let bodyRoot: HTMLElement | null = $state(null)
    let html = $state('')
    let revision = $state(0)
    let autoTranslateDecided = false
    let requested = 0
    let applied = 0

    let renderRaw = $derived(streaming && streamingMode === 'strong' && !translated && !retranslate)
    let customUi = $derived(hasCustomUi(msgDisplay))
    let zoom = $derived(DBState.db.zoomsize / 100)

    $effect.pre(() => {
        void $ReloadGUIPointer
        const source = text
        if (streaming && streamingMode === 'strong') {
            return
        }
        msgDisplay = prepareDisplayText(source, { name, idx, firstMessage })
    })

    $effect(() => {
        if (renderRaw) {
            return
        }
        const display = msgDisplay
        const translate = translated
        const regenerate = retranslate
        void renderKey
        void revision
        void $ReloadGUIPointer
        const context: BodyContext = { character, idx, role, firstMessage }
        untrack(() => render(display, context, translate, regenerate))
    })

    async function render(display: string, context: BodyContext, translate: boolean, regenerate: boolean) {
        const request = ++requested
        if (!autoTranslateDecided) {
            autoTranslateDecided = true
            if (await shouldAutoTranslate(display, context)) {
                if (!translated) {
                    translated = true
                    return
                }
            }
        }
        if ((translate || regenerate) && DBState.db.showTranslationLoading && applied === 0) {
            html = TRANSLATION_LOADING_HTML
        }
        const markdown = await renderBody(display, context, { translate, regenerate })
        if (regenerate) {
            setTimeout(() => {
                retranslate = false
            }, 10)
        }
        if (request < applied) {
            return
        }
        applied = request
        html = finalizeHtml(markdown, modelShortName)
        await tick()
        await fixAssetImages(bodyRoot)
    }

    async function getTranslationEditContext() {
        if (!translated || DBState.db.translatorType !== 'llm') {
            return null
        }
        const key = await getTranslationCacheKey(msgDisplay, { character, idx, firstMessage })
        const data = await getLLMCache(key)
        return data === null ? null : { key, data }
    }

    async function onPartialSave(event: CustomEvent<{ newData: string; target: 'original' | 'translation'; translationKey?: string }>) {
        if (idx < 0) {
            return
        }
        if (event.detail.target === 'translation') {
            if (event.detail.translationKey) {
                await saveTranslationEdit(event.detail.translationKey, event.detail.newData)
                revision += 1
            }
            return
        }
        saveMessageEdit(idx, event.detail.newData)
    }

    function onclick(event: MouseEvent) {
        // A tap on a card button runs its script and never opens the editor (spec §10.9).
        if (findScriptedOrigin(event.target)) {
            return
        }
        ontap?.()
    }
</script>

{#if renderRaw}
    <span class="text chat-width chattext prose minw-0 risu-mc-text" class:prose-invert={$ColorSchemeTypeStore === 'dark'}
        style:font-size="{zoom}rem"
        style:line-height="{(DBState.db.lineHeight ?? 1.25) * zoom}rem"
    ><span class="whitespace-pre-wrap">{text}</span></span>
{:else}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <span
        bind:this={bodyRoot}
        class="text chat-width chattext prose minw-0 risu-mc-text"
        class:prose-invert={$ColorSchemeTypeStore === 'dark'}
        {onclick}
        style:font-size="{(customUi ? 0.875 : 1) * zoom}rem"
        style:line-height="{(DBState.db.lineHeight ?? 1.25) * zoom}rem"
        style:zoom={customUi ? (DBState.db.mobileContentZoom ?? 80) / 100 : null}
    >{@html html}</span>
    {#if idx >= 0 && !streaming && DBState.db.enableDragPartialEdit}
        <PartialEditController
            messageData={text}
            chatIndex={idx}
            {bodyRoot}
            blockEditEnabled={false}
            dragEditEnabled={DBState.db.enableDragPartialEdit}
            translatedView={translated}
            getTranslationEditContext={getTranslationEditContext}
            on:save={onPartialSave}
        />
    {/if}
{/if}
