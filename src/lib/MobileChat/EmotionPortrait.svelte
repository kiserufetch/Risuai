<script lang="ts">
    import { onMount } from 'svelte'
    import { language } from 'src/lang'
    import { CharEmotion, DBState, ViewBoxsize } from 'src/ts/stores.svelte'
    import { getEmotion } from 'src/ts/util'
    import TransitionImage from '../ChatScreens/TransitionImage.svelte'

    // Floating emotion window of the normal mode (spec §5.11, ResizeBox.svelte): small
    // window on the right under the header; tap collapses/expands it, the corner
    // handle resizes it (shared ViewBoxsize store, like the old chat).

    let { top, occupied = $bindable(0) }: { top: number; occupied?: number } = $props()

    let collapsed = $state(false)
    let resizing = false
    let startX = 0
    let startY = 0
    let startWidth = 0
    let startHeight = 0

    let width = $derived(collapsed ? 44 : $ViewBoxsize.width)
    let height = $derived(collapsed ? 44 : $ViewBoxsize.height)

    $effect(() => {
        occupied = height
    })

    function start(event: PointerEvent) {
        event.stopPropagation()
        event.preventDefault()
        resizing = true
        startX = event.clientX
        startY = event.clientY
        startWidth = $ViewBoxsize.width
        startHeight = $ViewBoxsize.height
    }

    function move(event: PointerEvent) {
        if (!resizing) {
            return
        }
        event.preventDefault()
        ViewBoxsize.set({
            width: Math.max(96, Math.min(startWidth + startX - event.clientX, window.innerWidth * 0.8)),
            height: Math.max(96, Math.min(startHeight + event.clientY - startY, window.innerHeight * 0.6)),
        })
    }

    function end() {
        resizing = false
    }

    onMount(() => {
        window.addEventListener('pointermove', move, { passive: false })
        window.addEventListener('pointerup', end)
        window.addEventListener('pointercancel', end)
        return () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', end)
            window.removeEventListener('pointercancel', end)
        }
    })
</script>

<div
    class="risu-mc-portrait absolute z-10 overflow-hidden border shadow-lg transition-[border-radius]"
    class:rounded-full={collapsed}
    class:rounded-2xl={!collapsed}
    style="top: {top}px; right: calc(12px + var(--safe-right, 0px)); width: {width}px; height: {height}px; background: var(--mc-surface); border-color: var(--mc-line);"
>
    <button type="button" class="absolute inset-0 h-full w-full" aria-label={language.mobileChat.togglePortrait} aria-pressed={!collapsed} onclick={() => { collapsed = !collapsed }}>
        <TransitionImage classType="risu" src={getEmotion(DBState.db, $CharEmotion, 'plain')} />
    </button>
    {#if !collapsed}
        <span
            role="presentation"
            class="absolute bottom-0 left-0 z-10 h-6 w-6 touch-none"
            style="cursor: sw-resize; border-top: 2px solid var(--mc-line); border-right: 2px solid var(--mc-line); border-top-right-radius: 6px;"
            onpointerdown={start}
        ></span>
    {/if}
</div>
