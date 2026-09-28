<script lang="ts">
    import TokenCount from './TokenCount.svelte'

    // A labelled text area of the profile pages (mockup "Основное"); grows with its text.

    interface Props {
        label: string
        value: string
        placeholder?: string
        tokens?: boolean
        minRows?: number
    }

    let { label, value = $bindable(), placeholder = '', tokens = true, minRows = 3 }: Props = $props()
</script>

<label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
    <span class="flex justify-between gap-2 text-[12px] text-(--mc-text2)">
        <span>{label}</span>
        {#if tokens}<TokenCount text={value} />{/if}
    </span>
    <textarea
        bind:value
        {placeholder}
        rows={minRows}
        autocomplete="off"
        class="resize-none border-0 bg-transparent text-[15px] leading-[22px] outline-none"
        style="color: var(--mc-text); field-sizing: content; max-height: 55dvh;"
    ></textarea>
</label>
