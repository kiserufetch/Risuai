<script lang="ts">
    import { ChevronRightIcon, CloudIcon, DatabaseBackupIcon, LogOutIcon, RotateCcwIcon, SaveIcon, SheetIcon, SparklesIcon, UserIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertConfirm } from 'src/ts/alert'
    import { hubURL } from 'src/ts/characterCards'
    import { LoadLocalBackup, SaveLocalBackup, SavePartialLocalBackup } from 'src/ts/drive/backuplocal'
    import { checkDriver } from 'src/ts/drive/drive'
    import { loadRisuAccountBackup, loadRisuAccountData, saveRisuAccountData } from 'src/ts/drive/accounter'
    import { forageStorage, loadInternalBackup } from 'src/ts/globalApi.svelte'
    import { isNodeServer, isTauri } from 'src/ts/platform'
    import { cleanColdStorage } from 'src/ts/process/coldstorage.svelte'
    import { loginToSionyw, testSionywLogin } from 'src/ts/sionyw'
    import { unMigrationAccount } from 'src/ts/storage/accountStorage'
    import { exportAsDataset } from 'src/ts/storage/exportAsDataset'
    import { DBState } from 'src/ts/stores.svelte'

    // Mockups "Аккаунт и данные": the Risu Account card, then backups and maintenance with
    // one-line explanations. Same actions and confirmations as UserSettings.svelte; the
    // login frame now has a close button.

    const t = $derived(language.mobileAccount)
    let loginOpen = $state(false)
    let synced = $derived(!!DBState.db.account && (!!DBState.db.account.useSync || forageStorage.isAccount))

    // Login and Google Drive popups report back here, as in UserSettings.svelte.
    async function onmessage(e: MessageEvent) {
        const trusted = e.origin.startsWith('https://nightly.sv.risuai.xyz') || e.origin.startsWith('https://sv.risuai.xyz') || e.origin.startsWith('http://127.0.0.1') || e.origin === window.location.origin
        if (!trusted) return
        if (e.data.msg?.type === 'drive') {
            await loadRisuAccountData()
            DBState.db.account.data.refresh_token = e.data.msg.data.refresh_token
            DBState.db.account.data.access_token = e.data.msg.data.access_token
            DBState.db.account.data.expires_in = e.data.msg.data.expires_in * 700 + Date.now()
            await saveRisuAccountData()
        } else if (e.data.msg?.data?.vaild) {
            loginOpen = false
            DBState.db.account = { id: e.data.msg.id, token: e.data.msg.token, data: e.data.msg.data }
        }
    }

    function logout() {
        if (synced) unMigrationAccount()
        DBState.db.account = undefined
    }

    async function setSync(on: boolean) {
        if (!on) {
            unMigrationAccount()
        } else if (await alertConfirm(t.syncConfirm)) {
            localStorage.setItem('dosync', 'sync')
            location.reload()
        }
    }

    async function confirmSave(run: () => unknown) {
        if (await alertConfirm(language.backupConfirm)) run()
    }
    async function confirmLoad(run: () => unknown) {
        if ((await alertConfirm(language.backupLoadConfirm)) && (await alertConfirm(language.backupLoadConfirm2))) run()
    }
    const desktopDrive = isTauri || isNodeServer

    type Action = { icon: typeof SaveIcon; color: string; label: string; hint: string; warn?: boolean; run: () => unknown }
    let groups: { label: string; items: Action[] }[] = $derived([
        {
            label: t.onDevice,
            items: [
                { icon: SaveIcon, color: '#6366f1', label: t.saveFull, hint: t.saveFullHint, run: () => confirmSave(SaveLocalBackup) },
                { icon: SaveIcon, color: '#6366f1', label: t.savePartial, hint: t.savePartialHint, run: () => confirmSave(SavePartialLocalBackup) },
                { icon: RotateCcwIcon, color: '#f59e0b', label: t.restoreFile, hint: t.replacesData, warn: true, run: () => confirmLoad(LoadLocalBackup) },
            ],
        },
        {
            label: 'Google Drive',
            items: [
                { icon: CloudIcon, color: '#22c55e', label: t.saveGoogle, hint: t.saveGoogleHint, run: () => confirmSave(() => { localStorage.setItem('backup', 'save'); checkDriver(desktopDrive ? 'savetauri' : 'save') }) },
                { icon: RotateCcwIcon, color: '#f59e0b', label: t.restoreGoogle, hint: t.replacesData, warn: true, run: () => confirmLoad(() => { localStorage.setItem('backup', 'load'); checkDriver(desktopDrive ? 'loadtauri' : 'load') }) },
            ],
        },
        {
            label: t.maintenance,
            items: [
                forageStorage.isAccount
                    ? { icon: DatabaseBackupIcon, color: '#0ea5e9', label: t.serverBackup, hint: t.serverBackupHint, warn: true, run: () => loadRisuAccountBackup() }
                    : { icon: DatabaseBackupIcon, color: '#0ea5e9', label: t.internalBackup, hint: t.internalBackupHint, warn: true, run: () => confirmLoad(loadInternalBackup) },
                { icon: SparklesIcon, color: '#64748b', label: t.cleanCold, hint: t.cleanColdHint, run: async () => { if (await alertConfirm(language.cleanColdStorageConfirm)) cleanColdStorage() } },
                { icon: SheetIcon, color: '#64748b', label: t.dataset, hint: t.datasetHint, run: () => exportAsDataset() },
            ],
        },
    ])
</script>

<svelte:window {onmessage} />

<div class="flex flex-col gap-3.5">
    {#if DBState.db.account}
        <div class="flex flex-col gap-3 rounded-[20px] border p-4" style="border-color: color-mix(in oklab, var(--mc-accent) 35%, var(--mc-line)); background: linear-gradient(135deg, color-mix(in oklab, var(--mc-accent) 22%, transparent), color-mix(in oklab, var(--mc-accent) 5%, transparent));">
            <div class="flex items-center gap-3">
                <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white" style="background: var(--mc-accent);"><UserIcon size={24} /></span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[17px] font-bold">Risu Account</span><span class="truncate font-mono text-[12px] text-(--mc-text2)">ID {DBState.db.account.id}</span></span>
                <button type="button" class="flex h-9 shrink-0 items-center gap-1 rounded-full px-2 text-[13px] font-semibold" style="color: var(--mc-accent);" onclick={logout}><LogOutIcon size={16} />{language.logout}</button>
            </div>
            {#if !isTauri}
                <button type="button" role="switch" aria-checked={synced} class="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-left" style="background: color-mix(in oklab, var(--mc-bg) 50%, transparent);" onclick={() => setSync(!synced)}>
                    <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[15px]">{language.SaveDataInAccount}</span><span class="text-[12px] text-(--mc-text2)">{t.syncHint}</span></span>
                    <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {synced ? 'var(--mc-accent)' : 'var(--mc-line)'};"><span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {synced ? '21px' : '3px'};"></span></span>
                </button>
            {/if}
            {#if import.meta.env.DEV}
                <div class="flex gap-2 text-[12px]">
                    <button type="button" class="rounded-full px-3 py-1.5" style="background: var(--mc-line);" onclick={() => loginToSionyw()}>{language.loginSionyw}</button>
                    <button type="button" class="rounded-full px-3 py-1.5" style="background: var(--mc-line);" onclick={() => testSionywLogin()}>TestSionyw</button>
                </div>
            {/if}
        </div>
    {:else}
        <div class="flex flex-col gap-3 rounded-[20px] p-4" style="background: var(--mc-group);">
            <div class="flex items-center gap-3">
                <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" style="background: var(--mc-line);"><UserIcon size={24} /></span>
                <span class="flex flex-col gap-0.5"><span class="text-[17px] font-bold">Risu Account</span><span class="text-[12px] text-(--mc-text2)">{language.notLoggedIn}</span></span>
            </div>
            <span class="text-[13px] leading-[18px]">{t.accountPitch}</span>
            <button type="button" class="h-11 rounded-[14px] text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent, #fff);" onclick={() => { loginOpen = true }}>{t.login}</button>
        </div>
    {/if}

    {#each groups as group (group.label)}
        <span class="px-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{group.label}</span>
        <div class="risu-mc-account flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {#each group.items as item (item.label)}
                {@const Icon = item.icon}
                <button type="button" class="flex min-h-[58px] w-full items-center gap-3 px-4 py-2 text-left" onclick={item.run}>
                    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white" style="background: {item.color};"><Icon size={17} /></span>
                    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="text-[15px]" style={item.warn ? 'color: #fbbf24;' : ''}>{item.label}</span>
                        <span class="text-[12px] text-(--mc-text2)">{item.hint}</span>
                    </span>
                    <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
                </button>
            {/each}
        </div>
    {/each}
</div>

{#if loginOpen}
    <div class="fixed inset-0 z-50 flex flex-col" style="background: var(--mc-bg); padding-top: var(--safe-top, 0px);">
        <div class="flex h-14 shrink-0 items-center gap-2 px-3">
            <span class="flex-1 text-[17px] font-semibold">Risu Account</span>
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={language.mobileBot.close} onclick={() => { loginOpen = false }}><XIcon size={18} /></button>
        </div>
        <iframe src={hubURL + '/hub/login'} title="login" class="min-h-0 w-full flex-1 border-0"></iframe>
    </div>
{/if}

<style>
    .risu-mc-account > :global(* + *) {
        position: relative;
    }
    .risu-mc-account > :global(* + *)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 60px;
        right: 0;
        border-top: 1px solid var(--mc-line);
    }
</style>
