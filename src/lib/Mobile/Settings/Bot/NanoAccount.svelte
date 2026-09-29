<script lang="ts">
    import { language } from 'src/lang'
    import { getNanoGPTBalance, getNanoGPTSubscription } from 'src/ts/model/nanogpt'
    import { DBState } from 'src/ts/stores.svelte'

    // NanoGPT account card (mockup "Модель и ключи · NanoGPT"): balance, subscription state
    // and usage bars. Loads like NanoGPTDashboard.svelte and stores the subscription state
    // so requests pick the right endpoint.

    let { apiKey }: { apiKey: string } = $props()

    let data = $derived(apiKey ? load(apiKey) : null)

    async function load(key: string) {
        const [balance, subscription] = await Promise.all([getNanoGPTBalance(key), getNanoGPTSubscription(key)])
        DBState.db.nanogptSubscriptionState = subscription?.state ?? ''
        return { balance, subscription }
    }

    const usd = (raw: string | undefined) => {
        const n = parseFloat(raw ?? '')
        return isNaN(n) ? '–' : `$${n.toFixed(4)}`
    }
    const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '–')
    const reset = (ms: number | undefined) => (ms ? new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '–')
    const tokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n))
    const barColor = (v: number) => (v >= 0.8 ? 'var(--mc-danger)' : v >= 0.6 ? '#f59e0b' : '#22c55e')
    const stateColor = (s: string) => (s === 'active' ? '#22c55e' : s === 'grace' ? '#f59e0b' : 'var(--mc-text2)')
</script>

{#snippet usage(label: string, bucket: { used: number; remaining: number; percentUsed: number; resetAt?: number }, format: (n: number) => string)}
    <div class="flex flex-col gap-1.5 px-4 py-3">
        <span class="flex justify-between gap-2 text-[13px]"><span>{label}</span><span class="text-(--mc-text2)">{language.nanoGPTResetsLabel} {reset(bucket.resetAt)}</span></span>
        <span class="h-2 overflow-hidden rounded-full" style="background: var(--mc-line);"><span class="block h-full rounded-full" style="width: {Math.round(bucket.percentUsed * 100)}%; background: {barColor(bucket.percentUsed)};"></span></span>
        <span class="flex justify-between text-[12px] text-(--mc-text2)"><span>{format(bucket.used)} {language.nanoGPTUsedLabel}</span><span>{format(bucket.remaining)} {language.nanoGPTRemainingLabel}</span></span>
    </div>
{/snippet}

{#if data}
    {#await data}
        <span class="px-2 text-[13px] text-(--mc-text2)">{language.nanoGPTLoadingAccountInfo}</span>
    {:then { balance, subscription }}
        {#if balance || subscription}
            <div class="risu-mc-nano flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                <div class="flex min-h-[60px] items-center gap-3 px-4 py-2">
                    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="text-[12px] text-(--mc-text2)">{language.nanoGPTCreditBalance}</span>
                        <span class="text-[20px] font-bold tabular-nums">{balance ? usd(balance.usd_balance) : '–'}</span>
                    </span>
                    {#if subscription}
                        <span class="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold uppercase" style="color: {stateColor(subscription.state)}; background: color-mix(in oklab, {stateColor(subscription.state)} 14%, transparent);">{language.nanoGPTSubscription} · {subscription.state}</span>
                    {/if}
                </div>
                {#if subscription && subscription.state !== 'inactive'}
                    {#if subscription.state === 'grace' && subscription.graceUntil}
                        <span class="px-4 py-2.5 text-[13px]" style="color: #f59e0b;">{language.nanoGPTGraceUntil(date(subscription.graceUntil))}</span>
                    {/if}
                    {#if subscription.cancelAtPeriodEnd}
                        <span class="px-4 py-2.5 text-[13px]" style="color: #f59e0b;">{language.nanoGPTCancelsAtPeriodEnd(date(subscription.period?.currentPeriodEnd))}</span>
                    {/if}
                    {#if subscription.weeklyInputTokens}{@render usage(language.nanoGPTWeeklyTokensLabel, subscription.weeklyInputTokens, tokens)}{/if}
                    {#if subscription.dailyInputTokens}{@render usage(language.nanoGPTDailyTokensLabel, subscription.dailyInputTokens, tokens)}{/if}
                    {#if subscription.dailyImages}{@render usage(language.nanoGPTDailyImagesLabel, subscription.dailyImages, String)}{/if}
                    {#if subscription.period}
                        <span class="px-4 py-2.5 text-[12px] text-(--mc-text2)">{language.nanoGPTRenewsLabel} {date(subscription.period.currentPeriodEnd)}</span>
                    {/if}
                {:else if subscription}
                    <span class="px-4 py-2.5 text-[13px] text-(--mc-text2)">{language.nanoGPTNoActiveSubscription}</span>
                {/if}
            </div>
        {/if}
    {:catch}
        <span class="px-2 text-[13px] text-(--mc-text2)">{language.nanoGPTCouldNotLoadAccountInfo}</span>
    {/await}
{/if}

<style>
    .risu-mc-nano > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
