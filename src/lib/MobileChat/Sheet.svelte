<script lang="ts">
    import { tick, type Snippet } from 'svelte'

    interface Props {
        open: boolean
        label: string
        onclose: () => void
        children: Snippet
        class?: string
    }

    let { open, label, onclose, children, class: className = '' }: Props = $props()

    let panel: HTMLElement | null = $state(null)

    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    $effect(() => {
        if (!open || !panel) {
            return
        }
        const previous = document.activeElement as HTMLElement | null
        tick().then(() => panel?.focus())
        return () => previous?.focus?.()
    })

    function onkeydown(event: KeyboardEvent) {
        if (!open) {
            return
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            onclose()
            return
        }
        if (event.key !== 'Tab' || !panel) {
            return
        }
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) {
            event.preventDefault()
            return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }
</script>

<svelte:window {onkeydown} />

{#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="risu-mc-sheet-scrim fixed inset-0 z-50" style="background: var(--mc-scrim, rgb(0 0 0 / 0.55));" onclick={onclose}></div>
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <section
        bind:this={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabindex="-1"
        class="risu-mc-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[24px] px-3 pt-2 outline-none {className}"
        style="background: var(--mc-surface, var(--risu-theme-darkbutton)); color: var(--mc-text, var(--risu-theme-textcolor)); padding-bottom: calc(1rem + var(--safe-bottom, 0px));"
    >
        <span aria-hidden="true" class="mx-auto h-[5px] w-9 shrink-0 rounded-full" style="background: var(--mc-line, var(--risu-theme-darkborderc));"></span>
        {@render children()}
    </section>
{/if}
