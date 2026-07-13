<script lang="ts">
    import { isPhone, popupStore } from "src/ts/stores.svelte";
    import { sleep } from "src/ts/util";
    import { onDestroy, onMount } from "svelte";

    let styleString = $derived.by(() => {
        let styleString = '';
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const mouseX = popupStore.mouseX;
        const mouseY = popupStore.mouseY;

        if(mouseX < windowWidth / 2) {
            styleString += `left: ${mouseX}px;`;
        } else {
            styleString += `right: ${windowWidth - mouseX}px;`;
        }
        if(mouseY < windowHeight / 2) {
            styleString += `top: ${mouseY}px;`;
        } else {
            styleString += `bottom: ${windowHeight - mouseY}px;`;
        }
        return styleString;
    });

    const close = (() => {
        popupStore.children = null;
    });

    onMount(async () => {
        await sleep(0)
        document.addEventListener('click', close);
    })

    onDestroy(() => {
        document.removeEventListener('click', close);
    })

</script>

{#if popupStore.children}
    {#if $isPhone}
        <!-- Mobile: bottom action sheet (large touch rows, safe-area aware) -->
        <div class="fixed inset-0 z-50 bg-black/50 risu-popup-backdrop"></div>
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl bg-darkbg border-t border-darkborderc max-h-[70dvh] overflow-y-auto overscroll-contain p-3 flex flex-col gap-1 items-stretch risu-popup-sheet"
             style="padding-bottom: calc(0.75rem + var(--safe-bottom));"
             onclick={(e) => {
                // Taps on padding / drag handle / gaps must not dismiss the sheet;
                // taps on action rows keep bubbling so the document listener closes it.
                const target = e.target as HTMLElement
                if(!target.closest('button')){
                    e.stopPropagation()
                }
             }}>
            <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-textcolor2/40 shrink-0"></div>
            {@render popupStore.children()}
        </div>
    {:else}
        <div class="bg-darkbg border-darkborderc border rounded-xl shadow-lg p-2 gap-1 flex flex-col fixed z-50 items-stretch" style={styleString}>
            {@render popupStore.children()}
        </div>
    {/if}
{/if}

<style>
    .risu-popup-sheet {
        box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.35);
        animation: risu-popup-sheet-up 0.22s ease-out;
    }
    /* Comfortable touch rows for the action buttons rendered inside the sheet */
    .risu-popup-sheet :global(button) {
        min-height: 2.875rem;
        padding: 0.625rem 0.75rem;
        border-radius: 0.75rem;
        font-size: 1rem;
    }
    .risu-popup-sheet :global(button:active) {
        background-color: var(--risu-theme-selected);
    }
    .risu-popup-backdrop {
        animation: risu-popup-fade 0.22s ease-out;
    }
    @keyframes risu-popup-sheet-up {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
    }
    @keyframes risu-popup-fade {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
        .risu-popup-sheet,
        .risu-popup-backdrop { animation: none; }
    }
</style>
