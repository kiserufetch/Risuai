<script lang="ts">
    import '../../MobileChat/mobileChat.css'
    import {
        AccessibilityIcon, ActivityIcon, BotIcon, BoxIcon, ChevronLeftIcon, ChevronRightIcon, CodeIcon, ContactIcon, HeartIcon,
        LanguagesIcon, MonitorIcon, PackageIcon, SailboatIcon, SearchIcon, SparkleIcon, UserIcon, XIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { applySchemeTokens } from 'src/ts/chatCore/schemeTokens'
    import { pushBackHandler } from 'src/ts/chatCore/backStack'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { isLite } from 'src/ts/lite'
    import { accessibilitySettingsItems } from 'src/ts/setting/accessibilitySettingsData'
    import { advancedSettingsItems } from 'src/ts/setting/advancedSettingsData'
    import { displayOtherSettingsItems, displaySizeSettingsItems, displayThemeSettingsItems } from 'src/ts/setting/displaySettingsData.svelte'
    import { languageSettingsItems } from 'src/ts/setting/languageSettingsData.svelte'
    import type { SettingItem } from 'src/ts/setting/types'
    import { getFullSettingsData, getLabel } from 'src/ts/setting/utils'
    import { additionalSettingsMenu, DBState, easyPanelStore, SettingsMenuIndex } from 'src/ts/stores.svelte'
    import PluginDefinedIcon from '../../Others/PluginDefinedIcon.svelte'
    import OtherBotSettings from '../../Setting/Pages/OtherBotSettings.svelte'
    import PersonaSettings from '../../Setting/Pages/PersonaSettings.svelte'
    import PluginSettings from '../../Setting/Pages/PluginSettings.svelte'
    import UserSettings from '../../Setting/Pages/UserSettings.svelte'
    import ThanksPage from '../../Setting/Pages/ThanksPage.svelte'
    import PromptSettings from '../../Setting/Pages/PromptSettings.svelte'
    import ModuleSettings from '../../Setting/Pages/Module/ModuleSettings.svelte'
    import MobileSettingsList from './MobileSettingsList.svelte'
    import DisplaySettings from './Display/DisplaySettings.svelte'
    import { displayPage, displayPageTitle } from './Display/displayPage.svelte'
    import BotSettingsMobile from './Bot/BotSettingsMobile.svelte'
    import { botBack, botPage, botPageTitle } from './Bot/botPage.svelte'

    // "Настройки" tab (mockups "Мобильные настройки"): a grouped hub with search, the
    // data-driven pages drawn natively, the rest of the pages in the new frame for now.
    // Page selection reuses SettingsMenuIndex, like the desktop settings.

    type Category = { index: number; icon: typeof BotIcon; color: string; label: () => string; hint: () => string; lite?: boolean }

    const GROUPS: { label: () => string; items: Category[] }[] = [
        {
            label: () => language.mobileSettings.groupAi,
            items: [
                { index: 1, icon: BotIcon, color: '#6366f1', label: () => language.chatBot, hint: () => language.mobileSettings.hintBot },
                { index: 12, icon: ContactIcon, color: '#0ea5e9', label: () => language.persona, hint: () => language.mobileSettings.hintPersona },
                { index: 2, icon: SailboatIcon, color: '#f59e0b', label: () => language.otherBots, hint: () => language.mobileSettings.hintOtherBots },
            ],
        },
        {
            label: () => language.mobileSettings.groupApp,
            items: [
                { index: 3, icon: MonitorIcon, color: '#22c55e', label: () => language.display, hint: () => language.mobileSettings.hintDisplay },
                { index: 10, icon: LanguagesIcon, color: '#14b8a6', label: () => language.language, hint: () => language.mobileSettings.hintLanguage, lite: true },
                { index: 11, icon: AccessibilityIcon, color: '#a855f7', label: () => language.accessibility, hint: () => language.mobileSettings.hintAccessibility },
            ],
        },
        {
            label: () => language.mobileSettings.groupExtensions,
            items: [
                { index: 14, icon: PackageIcon, color: '#ec4899', label: () => language.modules, hint: () => language.mobileSettings.hintModules },
                { index: 4, icon: CodeIcon, color: '#64748b', label: () => language.plugin, hint: () => language.mobileSettings.hintPlugins },
            ],
        },
        {
            label: () => language.mobileSettings.groupData,
            items: [
                { index: 0, icon: UserIcon, color: '#3b82f6', label: () => `${language.account} & ${language.files}`, hint: () => language.mobileSettings.hintAccount, lite: true },
                { index: 6, icon: ActivityIcon, color: '#ef4444', label: () => language.advancedSettings, hint: () => language.mobileSettings.hintAdvanced },
                { index: 77, icon: HeartIcon, color: '#f43f5e', label: () => language.supporterThanks, hint: () => '' },
            ],
        },
    ]

    const TITLES: Record<number, () => string> = {
        0: () => `${language.account} & ${language.files}`, 1: () => language.chatBot, 2: () => language.otherBots, 3: () => language.display,
        4: () => language.plugin, 6: () => language.advancedSettings, 10: () => language.language, 11: () => language.accessibility,
        12: () => language.persona, 13: () => language.chatBot, 14: () => language.modules, 77: () => language.supporterThanks,
    }

    let root: HTMLElement | null = $state(null)
    let query = $state('')
    let pageScroll: HTMLElement | null = $state(null)

    $effect(() => {
        if (!root) return
        void JSON.stringify(DBState.db.colorScheme)
        const borderc = getComputedStyle(document.documentElement).getPropertyValue('--risu-theme-borderc').trim()
        applySchemeTokens(root, { borderc, type: $ColorSchemeTypeStore })
    })

    // System back leaves an open page first. One history entry while any page is open
    // (like the character profile), re-armed when back only steps up one level.
    let inPage = $derived($SettingsMenuIndex !== -1)
    let release: (() => void) | null = null

    /** One level up: a Display sub-page or the prompt template first, then the hub. Returns true while still inside a page. */
    function stepBack(): boolean {
        if ($SettingsMenuIndex === 13) {
            SettingsMenuIndex.set(1)
            return true
        }
        if ($SettingsMenuIndex === 3 && displayPage.current !== 'root') {
            displayPage.current = 'root'
            return true
        }
        if ($SettingsMenuIndex === 1 && botBack()) {
            return true
        }
        SettingsMenuIndex.set(-1)
        return false
    }

    function onSystemBack() {
        release = null
        if (stepBack()) {
            release = pushBackHandler(onSystemBack)
        }
    }

    // Sectioned pages always open on their root; sub-pages open scrolled to the top.
    $effect(() => {
        if ($SettingsMenuIndex !== 3) {
            displayPage.current = 'root'
        }
        if ($SettingsMenuIndex !== 1) {
            botPage.current = 'root'
        }
    })
    $effect(() => {
        void displayPage.current
        void botPage.current
        void botPage.promptIndex
        if (pageScroll) pageScroll.scrollTop = 0
    })

    function pageTitle(index: number): string {
        if (index === 3) return displayPageTitle(displayPage.current)
        if (index === 1) return botPageTitle(botPage.current)
        return TITLES[index]?.() ?? ''
    }

    $effect(() => {
        if (!inPage) return
        release = pushBackHandler(onSystemBack)
        return () => {
            release?.()
            release = null
        }
    })

    /** Where a data-driven item lives, for the search results' breadcrumb. */
    function sectionOf(item: SettingItem): string {
        if (displayThemeSettingsItems.includes(item) || displaySizeSettingsItems.includes(item) || displayOtherSettingsItems.includes(item)) return language.display
        if (languageSettingsItems.includes(item)) return language.language
        if (accessibilitySettingsItems.includes(item)) return language.accessibility
        if (advancedSettingsItems.includes(item)) return language.advancedSettings
        return language.chatBot
    }

    let results = $derived.by(() => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        const fromLanguage = languageSettingsItems.filter((item) => getLabel(item).toLowerCase().includes(q) || item.keywords?.some((k) => k.toLowerCase().includes(q)))
        return [...getFullSettingsData(q), ...fromLanguage].filter((item) => item.type !== 'header' && getLabel(item))
    })
    let categoryHits = $derived.by(() => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        return GROUPS.flatMap((g) => g.items).filter((c) => (!$isLite || c.lite) && (c.label().toLowerCase().includes(q) || c.hint().toLowerCase().includes(q)))
    })
</script>

<div bind:this={root} class="risu-mc-screen risu-mc-settings absolute inset-0 flex flex-col" data-scheme={$ColorSchemeTypeStore}>
    {#if $SettingsMenuIndex === -1}
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4" style="padding-top: var(--safe-top, 0px);">
            <h1 class="pb-3 pt-4 text-[30px] font-bold tracking-tight">{language.settings}</h1>
            <label class="mb-4 flex h-[42px] items-center gap-2.5 rounded-full px-3.5" style="background: var(--mc-surface);">
                <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
                <input type="search" bind:value={query} placeholder={language.mobileSettings.search} aria-label={language.mobileSettings.search} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
                {#if query}
                    <button type="button" class="-mr-2 flex h-9 w-9 items-center justify-center text-(--mc-text2)" aria-label={language.mobileCatalog.reset} onclick={() => { query = '' }}><XIcon size={16} /></button>
                {/if}
            </label>

            {#if query.trim()}
                <div class="flex flex-col gap-3">
                    <span class="px-1 text-[13px] text-(--mc-text2)">{language.mobileSettings.found.replace('{}', String(results.length + categoryHits.length))}</span>
                    {#if categoryHits.length > 0}
                        <div class="risu-mc-settings-hub overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                            {#each categoryHits as category (category.index)}
                                <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px]" onclick={() => SettingsMenuIndex.set(category.index)}>
                                    <span class="flex-1">{category.label()}</span><ChevronRightIcon size={18} class="text-(--mc-text2)" />
                                </button>
                            {/each}
                        </div>
                    {/if}
                    {#each results as item (item.id)}
                        <div class="flex flex-col gap-1">
                            <span class="px-2 text-[12px]" style="color: var(--mc-accent);">{sectionOf(item)}</span>
                            <MobileSettingsList items={[item]} />
                        </div>
                    {/each}
                    {#if results.length + categoryHits.length === 0}
                        <span class="py-10 text-center text-[15px] text-(--mc-text2)">{language.mobileDialogs.nothingFound}</span>
                    {/if}
                </div>
            {:else}
                <div class="flex flex-col gap-4">
                    {#each GROUPS as group, g (g)}
                        {@const visible = group.items.filter((c) => !$isLite || c.lite)}
                        {#if visible.length > 0}
                            <div class="flex flex-col gap-2">
                                <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{group.label()}</span>
                                <div class="risu-mc-settings-hub overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                                    {#each visible as category (category.index)}
                                        {@const Icon = category.icon}
                                        <button type="button" class="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left" onclick={() => SettingsMenuIndex.set(category.index)}>
                                            <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] text-white" style="background: {category.color};"><Icon size={19} /></span>
                                            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                                                <span class="text-[15px]">{category.label()}</span>
                                                {#if category.hint()}<span class="truncate text-[12px] text-(--mc-text2)">{category.hint()}</span>{/if}
                                            </span>
                                            <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/each}
                    {#if !$isLite && (additionalSettingsMenu.length > 0 || DBState.db.enableRisuaiProTools)}
                        <div class="risu-mc-settings-hub overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                            {#each additionalSettingsMenu as menu (menu)}
                                <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px]" onclick={() => menu.callback()}><PluginDefinedIcon ico={menu} />{menu.name}</button>
                            {/each}
                            {#if DBState.db.enableRisuaiProTools}
                                <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px]" onclick={() => { easyPanelStore.open = true }}><SparkleIcon size={19} style="color: var(--mc-accent);" />{language.easyPanel}</button>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/if}
            <div aria-hidden="true" style="height: calc(104px + var(--safe-bottom, 0px));"></div>
        </div>
    {:else}
        <header class="flex h-14 shrink-0 items-center gap-1 px-1.5" style="margin-top: var(--safe-top, 0px);">
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full" aria-label={language.goback} onclick={stepBack}>
                <ChevronLeftIcon size={24} />
            </button>
            <span class="min-w-0 flex-1 truncate text-[17px] font-semibold">{pageTitle($SettingsMenuIndex)}</span>
        </header>
        <div bind:this={pageScroll} class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-1">
            {#key $SettingsMenuIndex}
                {#if $SettingsMenuIndex === 3}
                    <DisplaySettings />
                {:else if $SettingsMenuIndex === 1}
                    <BotSettingsMobile />
                {:else if $SettingsMenuIndex === 10}
                    <MobileSettingsList items={languageSettingsItems} />
                {:else if $SettingsMenuIndex === 11}
                    <MobileSettingsList items={accessibilitySettingsItems} />
                {:else if $SettingsMenuIndex === 6}
                    <MobileSettingsList items={advancedSettingsItems} />
                {:else}
                    <div class="risu-mc-legacy flex flex-col text-textcolor">
                        {#if $SettingsMenuIndex === 0}
                            <UserSettings />
                        {:else if $SettingsMenuIndex === 13}
                            <PromptSettings onGoBack={() => SettingsMenuIndex.set(1)} />
                        {:else if $SettingsMenuIndex === 2}
                            <OtherBotSettings />
                        {:else if $SettingsMenuIndex === 4}
                            <PluginSettings />
                        {:else if $SettingsMenuIndex === 12}
                            <PersonaSettings />
                        {:else if $SettingsMenuIndex === 14}
                            <ModuleSettings />
                        {:else if $SettingsMenuIndex === 77}
                            <ThanksPage />
                        {/if}
                    </div>
                {/if}
            {/key}
            <div aria-hidden="true" style="height: calc(104px + var(--safe-bottom, 0px));"></div>
        </div>
    {/if}
</div>

<style>
    .risu-mc-settings-hub > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
