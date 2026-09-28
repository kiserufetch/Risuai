<script lang="ts">
    import { ChevronLeftIcon, ChevronRightIcon, CopyIcon, EllipsisIcon, PencilIcon, RefreshCwIcon, Volume2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { haptic } from 'src/ts/gui/haptics'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { getAlternativesCounter, previousAlternative, reroll } from 'src/ts/chatCore/alternatives.svelte'
    import { getGreetingCounter, nextGreeting, previousGreeting } from 'src/ts/chatCore/messageActions.svelte'
    import { generate } from 'src/ts/chatCore/sendPipeline'
    import McIconButton from './McIconButton.svelte'

    // Controls under the last reply (spec §4.2): ‹ n/N › · reroll · copy · edit · more.
    // Under the greeting (§5.7): ‹ n/N › · copy · speak.

    interface Props {
        greeting?: boolean
        oncopy?: () => void
        onedit?: () => void
        onmore?: () => void
        onspeak?: () => void
    }

    let { greeting = false, oncopy, onedit, onmore, onspeak }: Props = $props()

    let counter = $derived(greeting ? getGreetingCounter() : getAlternativesCounter())
    let char = $derived(session.getCharacter())
    let canSpeak = $derived(char?.type !== 'group' && !!char?.ttsMode && char.ttsMode !== 'none')

    function previous() {
        haptic(4)
        if (greeting) {
            previousGreeting()
        } else {
            previousAlternative()
        }
    }

    function next() {
        haptic(4)
        if (greeting) {
            nextGreeting()
        } else {
            reroll(() => generate())
        }
    }
</script>

<div class="risu-mc-actionbar -ml-2.5 mt-1 flex items-center" role="toolbar">
    {#if counter}
        <McIconButton label={language.mobileChat.previousVariant} class="button-icon-unreroll" onclick={previous}>
            <ChevronLeftIcon size={20} />
        </McIconButton>
        <span class="min-w-8 text-center text-[13px] tabular-nums text-(--mc-text2)">{counter.index}/{counter.total}</span>
        <McIconButton label={language.mobileChat.nextVariant} class={greeting ? 'button-icon-reroll' : ''} onclick={next}>
            <ChevronRightIcon size={20} />
        </McIconButton>
        <span aria-hidden="true" class="mx-1 h-5 w-px bg-(--mc-line)"></span>
    {/if}
    {#if !greeting}
        <McIconButton label={language.reroll} class="button-icon-reroll" onclick={() => {
            haptic(6)
            reroll(() => generate())
        }}>
            <RefreshCwIcon size={19} />
        </McIconButton>
    {/if}
    <McIconButton label={language.copy} class="button-icon-copy" onclick={() => oncopy?.()}>
        <CopyIcon size={19} />
    </McIconButton>
    {#if greeting}
        {#if canSpeak && onspeak}
            <McIconButton label={language.mobileChat.speak} onclick={() => onspeak()}>
                <Volume2Icon size={19} />
            </McIconButton>
        {/if}
    {:else}
        <McIconButton label={language.edit} class="button-icon-edit" onclick={() => onedit?.()}>
            <PencilIcon size={19} />
        </McIconButton>
    {/if}
    {#if onmore}
        <McIconButton label={language.mobileChat.more} onclick={() => onmore()}>
            <EllipsisIcon size={19} />
        </McIconButton>
    {/if}
</div>
