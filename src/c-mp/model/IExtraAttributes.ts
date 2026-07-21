import type { TChildren } from './TChildren'
import type { TStyle } from './TStyle'

/**
 * These attributes are in addition to / replacing native fields on HTML
 * elements.
 */
export interface IExtraAttributes<T> {
	/**
	 * Classes can be added in multiple ways to elements.
	 */
	class?:
		| (string | null | undefined | boolean | number | bigint)[]
		| string
		| null
		| undefined
		| (() =>
				| (string | null | undefined | boolean | number | bigint)[]
				| string
				| null
				| undefined)

	style?: TStyle

	/**
	 * This function, if provided, will get a reference to the element.
	 */
	ref?: (elem: T) => void

	/**
	 * This declaration is here for c-mp components and other unknown tags.
	 */
	[k: string]: unknown

	/**
	 * The children of the element.
	 */
	children?: TChildren
}
