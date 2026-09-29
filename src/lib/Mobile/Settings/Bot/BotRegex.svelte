<script lang="ts">
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import RegexScripts from '../RegexScripts.svelte'
    import { botPage } from './botPage.svelte'

    // Preset regex scripts; a script opens in the shared regex editor page.
</script>

<RegexScripts
    scripts={DBState.db.presetRegex}
    hint={language.mobileBot.regexHint}
    onopen={(i) => { botPage.regexIndex = i; botPage.current = 'regexEntry' }}
    onreplace={(next) => { DBState.db.presetRegex = next }}
/>
