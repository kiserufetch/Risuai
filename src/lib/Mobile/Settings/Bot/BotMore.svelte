<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormNav from 'src/lib/MobileChat/Form/FormNav.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { botPage, type BotPage } from './botPage.svelte'

    // Mockup "Дополнительно": request tweaks, tools, what the preset carries along.

    const t = $derived(language.mobileBot)
    const go = (page: BotPage) => () => { botPage.current = page }
    const count = (n: number) => (n ? t.entries.replace('{}', String(n)) : t.none)

    let search = $derived(DBState.db.modelTools.includes('search'))
    function setSearch(on: boolean) {
        DBState.db.modelTools = on ? [...DBState.db.modelTools, 'search'] : DBState.db.modelTools.filter((tool) => tool !== 'search')
    }
    let fallbackCount = $derived(Object.values(DBState.db.fallbackModels ?? {}).reduce((n, list) => n + ((list as string[]) ?? []).filter(Boolean).length, 0))
</script>

<div class="flex flex-col gap-4">
    <FormGroup label={t.request}>
        <FormNav label={t.page_bias} value={count(DBState.db.bias.length)} onclick={go('bias')} />
        <FormNav label={t.page_additional} value={count(DBState.db.additionalParams.length)} onclick={go('additional')} />
        <FormNav label={t.page_flags} value={DBState.db.enableCustomFlags ? count(DBState.db.customFlags.length) : t.off} onclick={go('flags')} />
    </FormGroup>
    <FormGroup label={language.tools}>
        <FormToggle label={t.webSearch} hint={t.webSearchHint} checked={search} onchange={setSearch} />
    </FormGroup>
    <FormGroup label={t.presetGroup}>
        <FormNav label={t.page_regex} value={count(DBState.db.presetRegex.length)} onclick={go('regex')} />
        <FormNav label={t.page_module} value={(DBState.db.moduleIntergration ?? '').trim() ? t.filled : t.empty} onclick={go('module')} />
        <FormNav label={t.page_fallback} value={count(fallbackCount)} onclick={go('fallback')} />
    </FormGroup>
</div>
