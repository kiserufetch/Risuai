// Test-only helper: Svelte 5 runes (`$state`) are only usable inside `.svelte`/`.svelte.ts`
// modules, so a plain `.test.ts` file cannot create a reactive props object directly.
// This wraps a props object in `$state` so mutating a field (e.g. `props.open = false`)
// triggers the same reactivity a real parent component would produce.
export function reactive<T extends object>(value: T): T {
    const state = $state(value)
    return state
}
