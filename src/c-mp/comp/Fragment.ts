import { EMPTY_FRAGMENT } from '../model/EMPTY_FRAGMENT'
import type { TChildren } from '../model/TChildren'

/**
 * Placeholder. The real implementation is in h(), because it is entirely
 * unnecessary to create a component for a Fragment. It can be replaced with a
 * DocumentFragment.
 */
export const Fragment = (props: { children: TChildren }, $: any) =>
	EMPTY_FRAGMENT
