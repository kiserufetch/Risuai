import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRawSnippet, mount, tick, unmount } from 'svelte'
import McIconButton from '../McIconButton.svelte'
import Sheet from '../Sheet.svelte'

const mounted: unknown[] = []

function snippet(html: string) {
    return createRawSnippet(() => ({ render: () => html }))
}

function render(component: Parameters<typeof mount>[0], props: Record<string, unknown>) {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mounted.push(mount(component, { target, props }))
    return target
}

afterEach(async () => {
    await Promise.all(mounted.splice(0).map((component) => unmount(component as never)))
    document.body.replaceChildren()
})

describe('Sheet', () => {
    it('renders nothing while closed', () => {
        const target = render(Sheet, { open: false, label: 'Actions', onclose: vi.fn(), children: snippet('<div><button>One</button></div>') })
        expect(target.querySelector('[role="dialog"]')).toBeNull()
    })

    it('renders an accessible modal dialog with its content', () => {
        const target = render(Sheet, { open: true, label: 'Actions', onclose: vi.fn(), children: snippet('<div><button>One</button></div>') })
        const dialog = target.querySelector('[role="dialog"]')
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
        expect(dialog?.getAttribute('aria-label')).toBe('Actions')
        expect(dialog?.classList.contains('risu-mc-sheet')).toBe(true)
        expect(dialog?.textContent).toContain('One')
    })

    it('closes on scrim tap and on Escape', () => {
        const onclose = vi.fn()
        const target = render(Sheet, { open: true, label: 'Actions', onclose, children: snippet('<div><button>One</button></div>') })
        ;(target.querySelector('.risu-mc-sheet-scrim') as HTMLElement).click()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(onclose).toHaveBeenCalledTimes(2)
    })

    it('moves focus into the dialog and keeps Tab inside it', async () => {
        const target = render(Sheet, {
            open: true,
            label: 'Actions',
            onclose: vi.fn(),
            children: snippet('<div><button id="first">One</button><button id="last">Two</button></div>'),
        })
        await tick()
        await tick()
        const dialog = target.querySelector('[role="dialog"]') as HTMLElement
        expect(dialog.contains(document.activeElement)).toBe(true)
        ;(target.querySelector('#last') as HTMLElement).focus()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
        expect(document.activeElement?.id).toBe('first')
    })
})

describe('McIconButton', () => {
    it('renders a labelled 44px button that forwards clicks', () => {
        const onclick = vi.fn()
        const target = render(McIconButton, { label: 'Copy', onclick, children: snippet('<svg></svg>') })
        const button = target.querySelector('button') as HTMLButtonElement
        expect(button.getAttribute('aria-label')).toBe('Copy')
        expect(button.getAttribute('type')).toBe('button')
        expect(button.className).toContain('h-11')
        expect(button.className).toContain('w-11')
        button.click()
        expect(onclick).toHaveBeenCalledTimes(1)
    })

    it('respects disabled and pressed states', () => {
        const onclick = vi.fn()
        const target = render(McIconButton, { label: 'Translate', onclick, disabled: true, pressed: true, children: snippet('<svg></svg>') })
        const button = target.querySelector('button') as HTMLButtonElement
        expect(button.disabled).toBe(true)
        expect(button.getAttribute('aria-pressed')).toBe('true')
        button.click()
        expect(onclick).not.toHaveBeenCalled()
    })
})
