<script lang="ts">
    import { HeartIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { openURL } from 'src/ts/globalApi.svelte'

    // Mockup "Благодарности": thanks, the Patreon links and supporters by tier, from the
    // same list as ThanksPage.svelte.

    const t = $derived(language.mobileAccount)

    type Tier = { label: string; names: string[]; tone: 'gold' | 'silver' | 'copper'; size: string }

    async function loadTiers(): Promise<Tier[]> {
        const list = (await (await fetch('https://sv.risuai.xyz/patreon/list')).json()) as { amount: number; name: string }[]
        const pick = (min: number, max: number) => list.filter((v) => v.amount >= min && v.amount < max).map((v) => v.name)
        return [
            { label: 'Supporter V', names: pick(50, Infinity), tone: 'gold' as const, size: 'px-[18px] py-3 text-[18px]' },
            { label: 'Supporter IV', names: pick(20, 50), tone: 'silver' as const, size: 'px-3.5 py-2.5 text-[16px]' },
            { label: 'Supporter III', names: pick(10, 20), tone: 'silver' as const, size: 'px-3 py-2 text-[14px]' },
            { label: 'Supporter II', names: pick(5, 10), tone: 'copper' as const, size: 'px-2.5 py-1.5 text-[13px]' },
            { label: 'Supporter I', names: pick(-Infinity, 5), tone: 'copper' as const, size: 'px-2.5 py-1.5 text-[13px]' },
        ].filter((tier) => tier.names.length > 0)
    }
</script>

<div class="flex flex-col gap-3.5">
    <div class="flex flex-col items-center gap-2.5 pb-1 pt-3 text-center">
        <span class="flex h-14 w-14 items-center justify-center rounded-full" style="background: rgb(244 63 94 / 0.16); color: #f43f5e;"><HeartIcon size={28} /></span>
        <span class="text-[20px] font-bold">{language.supporterThanksDesc}</span>
        <span class="text-[13px] text-(--mc-text2)">{t.thanksHint}</span>
    </div>
    <div class="grid grid-cols-2 gap-2">
        <button type="button" class="h-11 rounded-[14px] text-[14px] font-semibold text-white" style="background: #f96854;" onclick={() => openURL('https://www.patreon.com/RisuAI')}>{t.becomePatron}</button>
        <button type="button" class="h-11 rounded-[14px] text-[14px] font-semibold" style="background: var(--mc-line);" onclick={() => openURL('https://sv.risuai.xyz/patreon')}>{t.addName}</button>
    </div>

    {#await loadTiers()}
        <span class="py-6 text-center text-[14px] text-(--mc-text2)">{language.loading}…</span>
    {:then tiers}
        {#each tiers as tier (tier.label)}
            <span class="px-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{tier.label}</span>
            <div class="flex flex-wrap gap-1.5">
                {#each tier.names as name, i (i)}
                    <span class="rounded-xl font-bold {tier.size}" style="background: var(--mc-group);"><span class="risu-mc-prism risu-mc-prism-{tier.tone}">{name}</span></span>
                {/each}
            </div>
        {/each}
    {:catch}
        <span class="py-6 text-center text-[14px] text-(--mc-text2)">{t.thanksError}</span>
    {/await}
</div>

<style>
    .risu-mc-prism {
        color: transparent;
        background-image: var(--prism);
        background-size: 150px 100%;
        background-repeat: no-repeat;
        background-clip: text;
        -webkit-background-clip: text;
        animation: risu-mc-shimmer 2s infinite;
    }
    .risu-mc-prism-gold {
        --prism: linear-gradient(to right, #d4af32, #fff, #d4af32, #fff, #d4af32);
        background-color: #d4af32;
    }
    .risu-mc-prism-silver {
        --prism: linear-gradient(to right, #9ca3af, #fff, #9ca3af, #fff, #9ca3af);
        background-color: #cbd5e1;
    }
    .risu-mc-prism-copper {
        --prism: linear-gradient(to right, #b87333, #fff, #b87333, #fff, #b87333);
        background-color: #d08a4a;
    }
    @keyframes risu-mc-shimmer {
        0%, 100% { background-position: left; }
        50% { background-position: right; }
    }
</style>
