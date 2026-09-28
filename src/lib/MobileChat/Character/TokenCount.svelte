<script lang="ts">
    import { language } from 'src/lang'
    import { tokenizeAccurate } from 'src/ts/tokenizer'

    // Token count of a field, recounted 400 ms after typing stops (CharConfig loadTokenize).

    let { text }: { text: string } = $props()

    let count = $state<number | null>(null)

    $effect(() => {
        const value = text ?? ''
        let cancelled = false
        const timer = setTimeout(async () => {
            const tokens = await tokenizeAccurate(value)
            if (!cancelled) {
                count = tokens
            }
        }, 400)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    })
</script>

{#if count !== null}
    <span class="tabular-nums">{language.mobileProfile.tokens.replace('{}', count.toLocaleString())}</span>
{/if}
