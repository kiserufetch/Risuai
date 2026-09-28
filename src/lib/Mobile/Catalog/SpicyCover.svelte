<script lang="ts">
    import { spicyChatImageBlobUrl } from 'src/ts/spicychat'
    import { DBState } from 'src/ts/stores.svelte'

    // SpicyChat avatar as a revocable blob URL (the CDN needs the proxy/native fetch);
    // a toned block with the initial while it loads, fails or images are hidden.

    let { url, name = '', class: className = '' }: { url?: string; name?: string; class?: string } = $props()

    let src: string | null = $state(null)

    $effect(() => {
        const avatar = url
        let cancelled = false
        let created: string | null = null
        src = null
        if (DBState.db.hideAllImages) {
            return
        }
        spicyChatImageBlobUrl(avatar).then((blob) => {
            if (cancelled) {
                if (blob) {
                    URL.revokeObjectURL(blob)
                }
                return
            }
            created = blob
            src = blob
        })
        return () => {
            cancelled = true
            if (created) {
                URL.revokeObjectURL(created)
            }
        }
    })
</script>

{#if src}
    <img {src} alt={name} class="object-cover object-top {className}" />
{:else}
    <span aria-hidden="true" class="flex items-center justify-center text-4xl font-bold {className}" style="background: var(--mc-group); color: var(--mc-text2);">{name.slice(0, 1).toUpperCase()}</span>
{/if}
