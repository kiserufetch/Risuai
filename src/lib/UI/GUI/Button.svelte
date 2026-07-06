<button
    onclick={onclick}
    {disabled}
    class="{
        styled === 'primary' ? ((selected ? 'bg-primary-700' : 'bg-primary-600') + " hover:bg-primary-500 text-white border-transparent")
        : styled === 'outlined' ? 'bg-transparent hover:bg-darkbutton border-darkborderc text-textcolor'
        : ((selected ? 'bg-red-700' : 'bg-red-600') + ' hover:bg-red-500 text-white border-transparent')
    } border rounded-lg font-medium shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500/60 transition-colors duration-200{className ? (" " + className) : ""}"
    class:opacity-50={disabled}
    class:cursor-not-allowed={disabled}
    class:px-4 = {size == "md"}
    class:px-2 = {size == "sm"}
    class:px-6 = {size == "lg"}
    class:py-2 = {size == "md"}
    class:py-1 = {size == "sm"}
    class:py-3 = {size == "lg"}
    class:text-md = {size == "md"}
    class:text-sm = {size == "sm"}
    class:text-lg = {size == "lg"}>
    {@render children?.()}
</button>
<script lang="ts">

    interface Props {
        selected?: boolean;
        styled?: 'primary'|'danger'|'outlined';
        className?: string;
        size?: "sm" | "md" | "lg";
        disabled?: boolean;
        children?: import('svelte').Snippet;
        onclick?: (event: MouseEvent & {
            currentTarget: EventTarget & HTMLButtonElement;
        }) => any
    }

    let {
        selected = false,
        styled = 'primary',
        className = "",
        size = "md",
        disabled = false,
        children,
        onclick
    }: Props = $props();
</script>