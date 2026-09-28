<script lang="ts">
    import { ChevronsUpDownIcon } from '@lucide/svelte'

    // A row with a native select stretched over it: the system picker on phones.

    export interface FormOption {
        value: string | number
        label: string
        group?: string
    }

    interface Props {
        label: string
        value: string | number
        options: FormOption[]
        onchange?: (value: string | number) => void
    }

    let { label, value = $bindable(), options, onchange }: Props = $props()

    let current = $derived(options.find((o) => String(o.value) === String(value))?.label ?? String(value ?? ''))
    let groups = $derived([...new Set(options.map((o) => o.group ?? ''))])
</script>

<label class="relative flex min-h-[52px] items-center gap-3 px-4">
    <span class="shrink-0 text-[15px]">{label}</span>
    <span class="ml-auto min-w-0 truncate text-right text-[15px] text-(--mc-text2)">{current}</span>
    <ChevronsUpDownIcon size={16} class="shrink-0 text-(--mc-text2)" />
    <select
        bind:value
        aria-label={label}
        class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onchange={() => onchange?.(value)}
    >
        {#each groups as group (group)}
            {#if group}
                <optgroup label={group}>
                    {#each options.filter((o) => o.group === group) as option (option.value)}
                        <option value={option.value}>{option.label}</option>
                    {/each}
                </optgroup>
            {:else}
                {#each options.filter((o) => !o.group) as option (option.value)}
                    <option value={option.value}>{option.label}</option>
                {/each}
            {/if}
        {/each}
    </select>
</label>
