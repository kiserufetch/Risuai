<script lang="ts">
    import type { Snippet } from 'svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { risuChatParser } from 'src/ts/process/scripts'
    import { getDisplayCbsConditions } from 'src/ts/chatCore/messageRender'

    // Custom HTML theme (spec §8), ported from Chat.svelte RenderGUIHtml/renderGuiHtmlPart:
    // CBS pass over db.guiHTML, DOMParser, then a tag whitelist rebuilt as Svelte
    // elements. Placeholders: <risutextbox>, <risuicon>, <risubuttons>, <risugeninfo>.
    // Known limitations kept on purpose: <img> loses its src, <style> becomes global.

    interface Props {
        idx: number
        firstMessage: boolean
        textBox: Snippet
        icon: Snippet
        buttons: Snippet
        genInfo: Snippet
    }

    let { idx, firstMessage, textBox, icon, buttons, genInfo }: Props = $props()

    const CONTAINER_TAGS = new Set([
        'SPAN', 'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'TR', 'TD', 'TH',
        'CODE', 'PRE', 'BLOCKQUOTE', 'EM', 'STRONG', 'U', 'DEL', 'BUTTON',
    ])

    let template: Element = $state.raw(document.createElement('div'))

    // An effect, not a $derived: the CBS pass may write chat variables.
    $effect.pre(() => {
        try {
            const html = risuChatParser(DBState.db.guiHTML ?? '', { cbsConditions: getDisplayCbsConditions(idx, firstMessage) })
            template = new DOMParser().parseFromString(html, 'text/html').body
        } catch {
            template = document.createElement('div')
        }
    })

    function safeHref(dom: Element): string {
        const href = dom.getAttribute('href')
        return href && href.startsWith('https') ? href : ''
    }
</script>

{#snippet part(dom: Element)}
    {#if dom.tagName === 'IMG'}
        <img class={dom.getAttribute('class') ?? ''} alt="" style={dom.getAttribute('style') ?? ''} />
    {:else if dom.tagName === 'HR'}
        <hr class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''} />
    {:else if dom.tagName === 'BR'}
        <br class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''} />
    {:else if dom.tagName === 'A'}
        <a target="_blank" rel="noreferrer" href={safeHref(dom)} class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>{@render children(dom)}</a>
    {:else if dom.tagName === 'RISUTEXTBOX'}
        {@render textBox()}
    {:else if dom.tagName === 'RISUICON'}
        {@render icon()}
    {:else if dom.tagName === 'RISUBUTTONS'}
        {@render buttons()}
    {:else if dom.tagName === 'RISUGENINFO'}
        {@render genInfo()}
    {:else if dom.tagName === 'STYLE'}
        <svelte:element this={'style'}>{dom.innerHTML}</svelte:element>
    {:else}
        <svelte:element this={CONTAINER_TAGS.has(dom.tagName) ? dom.tagName.toLowerCase() : 'div'} class={dom.getAttribute('class') ?? ''} style={dom.getAttribute('style') ?? ''}>{@render children(dom)}</svelte:element>
    {/if}
{/snippet}

{#snippet children(dom: Element)}
    {#each dom.childNodes as node, i (i)}
        {#if node.nodeType === Node.TEXT_NODE}
            {node.textContent}
        {:else if node.nodeType === Node.ELEMENT_NODE}
            {@render part(node as Element)}
        {/if}
    {/each}
{/snippet}

{@render part(template)}
