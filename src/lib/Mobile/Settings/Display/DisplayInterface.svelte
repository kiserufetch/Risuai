<script lang="ts">
    import { ChevronDownIcon, ChevronRightIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { updateAnimationSpeed } from 'src/ts/gui/animation'
    import { displaySettingsItems } from 'src/ts/setting/displaySettingsData.svelte'
    import { checkCondition } from 'src/ts/setting/utils'
    import { DBState } from 'src/ts/stores.svelte'
    import { changeFullscreen } from 'src/ts/util'
    import { getModelInfo } from 'src/ts/model/modellist'
    import MobileSettingsList from '../MobileSettingsList.svelte'

    // Mockup "Интерфейс": behaviour grouped by meaning; settings that only matter on a
    // desktop layout stay folded at the bottom, drawn from the shared setting data.

    const t = $derived(language.mobileDisplay)

    const DESKTOP_IDS = [
        'display.menuSideBar', 'display.useChatCopy', 'display.sideBarSize', 'display.settingsCloseButtonSize',
        'display.textAreaSize', 'display.textAreaTextSize', 'display.waifuWidth', 'display.waifuWidth2',
    ]
    const desktopItems = DESKTOP_IDS.map((id) => displaySettingsItems.find((item) => item.id === id)).filter((item) => !!item)

    let desktopOpen = $state(false)
    let desktopCount = $derived(desktopItems.filter((item) => checkCondition(item, {
        db: DBState.db, modelInfo: getModelInfo(DBState.db.aiModel), subModelInfo: getModelInfo(DBState.db.subModel),
    })).length)
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <FormSlider label={t.animationSpeed} bind:value={DBState.db.animationSpeed} min={0} max={1} step={0.05} format={(v) => t.seconds.replace('{}', v.toFixed(2))} oninput={updateAnimationSpeed} />
        <FormToggle label={language.fullscreen} bind:checked={DBState.db.fullScreen} onchange={() => changeFullscreen()} />
    </FormGroup>
    <FormGroup label={t.hideGroup}>
        <FormToggle label={t.apiKeys} bind:checked={DBState.db.hideApiKey} />
        <FormToggle label={t.allImages} bind:checked={DBState.db.hideAllImages} />
        <FormToggle label="RisuRealm" bind:checked={DBState.db.hideRealm} />
    </FormGroup>
    <FormGroup label={t.showGroup}>
        <FormToggle label={t.savingIcon} bind:checked={DBState.db.showSavingIcon} />
        <FormToggle label={t.promptComparison} bind:checked={DBState.db.showPromptComparison} />
        <FormToggle label={t.folderName} bind:checked={DBState.db.showFolderName} />
    </FormGroup>
    <FormGroup label={t.legacyGroup}>
        <FormToggle label={t.legacyMobileChat} bind:checked={DBState.db.legacyMobileChat} />
        <FormToggle label={t.legacyGui} hint={t.legacyGuiHint} bind:checked={DBState.db.useLegacyGUI} />
    </FormGroup>
    <FormGroup>
        <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" aria-expanded={desktopOpen} onclick={() => { desktopOpen = !desktopOpen }}>
            <span class="flex-1 text-[15px]">{t.desktopOnly}</span>
            <span class="text-[13px] tabular-nums text-(--mc-text2)">{desktopCount}</span>
            {#if desktopOpen}<ChevronDownIcon size={18} class="text-(--mc-text2)" />{:else}<ChevronRightIcon size={18} class="text-(--mc-text2)" />{/if}
        </button>
    </FormGroup>
    {#if desktopOpen}
        <MobileSettingsList items={desktopItems} />
    {/if}
</div>
