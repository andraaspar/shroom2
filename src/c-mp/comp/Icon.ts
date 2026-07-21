import { defineComponent } from '../fun/defineComponent'
import { EMPTY_FRAGMENT } from '../model/EMPTY_FRAGMENT'

export interface IIconProps {
	/**
	 * The svg string to show.
	 */
	svg: string
}

/**
 * Displays an SVG icon.
 */
export const Icon = defineComponent<IIconProps>('Icon', (props, $) => {
	$.innerHTML = props.svg

	return EMPTY_FRAGMENT
})
