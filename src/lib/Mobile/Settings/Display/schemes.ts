import { colorSchemeList, colorSchemePresets, type ColorScheme } from 'src/ts/gui/colorscheme'
import { language } from 'src/lang'

// Scheme names and the picker's order ("lite" is forced by Lite builds, not picked).

export const pickableSchemes = colorSchemeList.filter((name) => name !== 'lite')

export function formatSchemeName(name: string): string {
    if (name === 'custom') return language.mobileDisplay.customScheme
    return name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export function schemeColors(name: string, custom: ColorScheme | undefined): ColorScheme {
    return name === 'custom' ? custom ?? colorSchemePresets.default : colorSchemePresets[name as keyof typeof colorSchemePresets]
}
