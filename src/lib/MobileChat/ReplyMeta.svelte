<script lang="ts">
    import { RefreshCwIcon, TriangleAlertIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { reroll } from 'src/ts/chatCore/alternatives.svelte'
    import { generate } from 'src/ts/chatCore/sendPipeline'
    import type { Message } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { doingChat } from 'src/ts/process/index.svelte'

    // Under a reply (mockup "Чат · стоимость и пустой ответ"): what OpenRouter reported for
    // it, and a way out when the model spent the whole limit thinking and gave no answer.

    let { message, isLatest, streaming }: { message: Message; isLatest: boolean; streaming: boolean } = $props()

    const t = $derived(language.mobileChat)
    // `streaming` is false when stream display is off, so the send flow's flag decides.
    let busy = $derived(streaming || (isLatest && $doingChat))
    let usage = $derived(message.generationInfo?.openrouter)
    let thoughtsOnly = $derived(
        isLatest && !busy && message.data.includes('<Thoughts>') && !message.data.replace(/<Thoughts>[\s\S]*?<\/Thoughts>/g, '').trim(),
    )
    let thinkingBudget = $derived(DBState.db.aiModel === 'openrouter' && DBState.db.openrouterExtras?.reasoningMode !== 'off')

    const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n))
    let line = $derived.by(() => {
        if (!usage) return ''
        const parts: string[] = []
        if (typeof usage.cost === 'number') parts.push(usage.cost > 0 && usage.cost < 0.0001 ? '<$0.0001' : `$${usage.cost.toFixed(4)}`)
        if (usage.promptTokens) parts.push(`${t.usageIn} ${compact(usage.promptTokens)}`)
        const reasoning = usage.reasoningTokens ?? 0
        if (reasoning) parts.push(`${t.usageThinking} ${compact(reasoning)}`)
        if (usage.completionTokens !== undefined) parts.push(`${t.usageAnswer} ${compact(Math.max(0, usage.completionTokens - reasoning))}`)
        if (usage.finishReason === 'length') parts.push(t.usageCut)
        return parts.join(' · ')
    })

    function raiseAndRetry() {
        if (thinkingBudget && DBState.db.openrouterExtras) {
            DBState.db.openrouterExtras.reasoningBudget = Math.max(2000, DBState.db.openrouterExtras.reasoningBudget * 2)
        } else {
            DBState.db.maxResponse = Math.max(1000, DBState.db.maxResponse * 2)
        }
        reroll(() => generate())
    }
</script>

{#if thoughtsOnly}
    <div class="mt-2 flex flex-col gap-2.5 rounded-2xl border px-3.5 py-3" style="background: rgb(245 158 11 / 0.1); border-color: rgb(245 158 11 / 0.3);">
        <span class="flex gap-2 text-[13px] leading-[18px]" style="color: #f5d08a;"><TriangleAlertIcon size={18} class="shrink-0" />{t.thoughtsOnly}</span>
        <span class="flex gap-2">
            <button type="button" class="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent, #fff);" onclick={() => reroll(() => generate())}><RefreshCwIcon size={15} />{language.reroll}</button>
            <button type="button" class="h-[38px] flex-1 rounded-xl text-[13px] font-semibold" style="background: var(--mc-line);" onclick={raiseAndRetry}>{thinkingBudget ? t.budgetX2 : t.lengthX2}</button>
        </span>
    </div>
{/if}
{#if line && !busy}
    <span class="mt-1.5 block text-[11px] tabular-nums text-(--mc-text2) opacity-80">{line}</span>
{/if}
