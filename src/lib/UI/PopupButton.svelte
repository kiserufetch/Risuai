<script lang="ts">
    import { MenuIcon } from "@lucide/svelte";
    import { haptic } from "src/ts/gui/haptics";
    import { isPhone, popupStore } from "src/ts/stores.svelte";
    import { sleep } from "src/ts/util";
    import { onDestroy } from "svelte";

    const {
        children
    }:{
        children: import("svelte").Snippet
    } = $props();
    
    let buttonId = Math.random()

    onDestroy(() => {
        // If the owning component unmounts (e.g. its message got deleted) while
        // this popup is open, close it instead of rendering an orphaned snippet.
        if(popupStore.openId === buttonId){
            popupStore.children = null
            popupStore.openId = 0
        }
    })
</script>

<button onclick={async (e:MouseEvent) => {
    await sleep(0)
    if(popupStore.openId === buttonId){
        popupStore.children = null
        popupStore.openId = 0
        return
    }
    if($isPhone){
        haptic(6)
    }
    popupStore.mouseX = e.clientX
    popupStore.mouseY = e.clientY
    popupStore.children = children
    popupStore.openId = buttonId
}} class="hover:text-primary-400 transition-colors button-icon-menu">
    <MenuIcon size={20} />
</button>
