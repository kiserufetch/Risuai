<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { alertError } from 'src/ts/alert'
    import { DBState } from 'src/ts/stores.svelte'

    // Mockup "Звук и уведомления". Turning notifications on asks for the browser
    // permission (as NotificationToggle does) and rolls back when it is denied.

    const t = $derived(language.mobileDisplay)

    async function setNotification(on: boolean) {
        DBState.db.notification = on
        if (!on) return
        let state = 'denied'
        try {
            state = (await navigator.permissions.query({ name: 'notifications' as PermissionName })).state
        } catch {
            // Some browsers do not support the Permissions API.
        }
        if (state === 'granted') return
        const permission = typeof Notification === 'undefined' ? 'denied' : await Notification.requestPermission()
        if (permission !== 'granted') {
            alertError(language.permissionDenied)
            DBState.db.notification = false
        }
    }
</script>

<div class="flex flex-col gap-4">
    <FormGroup label={t.sounds}>
        <FormToggle label={t.playMessage} bind:checked={DBState.db.playMessage} />
        <FormToggle label={t.playTranslate} hint={t.playTranslateHint} bind:checked={DBState.db.playMessageOnTranslateEnd} />
    </FormGroup>
    <FormGroup label={t.notifications}>
        <FormToggle label={t.notify} hint={t.notifyHint} checked={DBState.db.notification} onchange={setNotification} />
    </FormGroup>
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{t.notifyNote}</span>
</div>
