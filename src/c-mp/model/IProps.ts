import { Comp } from '../fun/defineComponent'

/**
 * These props are built-in for all c-mp components.
 */
export interface IProps {
	debugName?: string
	ref?: (it: Comp) => void
	// children?: TChildren
}
