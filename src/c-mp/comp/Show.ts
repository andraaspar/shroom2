import {
	Comp,
	defineComponent,
	type IComponentInit,
} from '../fun/defineComponent'
import { h } from '../fun/h'
import { logLevel } from '../fun/log'
import { untrack, useEffect } from '../fun/useEffect'
import { EMPTY_FRAGMENT } from '../model/EMPTY_FRAGMENT'
import { type IProps } from '../model/IProps'

export type TThenValue<T> = Exclude<T, false | null | undefined | 0 | '' | 0n>

export interface IShowThenProps<T> extends IProps {
	get: () => TThenValue<T>
}

/** Used to brand IShowCondition to prevent creating without $when. */
declare const mustUse$when: unique symbol

/** A single condition and component. Must be created using $when. */
export interface IShowCondition {
	/** @internal */ readonly [mustUse$when]: true
	readonly when: () => unknown
	readonly then: IComponentInit<{}>
}

/**
 * Creates a condition in a type-safe manner. This is required because otherwise
 * TypeScript cannot infer T for a single IShowCondition instance, so then
 * receives any in place of T.
 */
export function $when<T>(
	when: () => T,
	then: IComponentInit<IShowThenProps<T>>,
): IShowCondition {
	return { when, then } as IShowCondition
}

export interface IShowProps extends IProps {
	it: IShowCondition[] | IShowCondition
	else?: IComponentInit
}

export const Show = defineComponent('Show', (props: IShowProps, $: Comp) => {
	// Remember the last index to be able to decide if we need to recreate the
	// content.
	let conditionIndex = NaN

	// Last inner component is stored here, because it can survive multiple
	// effect reruns.
	let lastComp: Comp | undefined

	useEffect('condition changed [t6e02g]', () => {
		const lastConditionIndex = conditionIndex
		const conditions = Array.isArray(props.it) ? props.it : [props.it]
		conditionIndex = conditions.findIndex((it) => it.when())
		if (logLevel >= 2) {
			console.debug(
				`💫 ${$.debugName} condition:`,
				lastConditionIndex,
				`✏️`,
				conditionIndex,
			)
		}
		if (conditionIndex === lastConditionIndex) return

		untrack('update comp [t6e02l]', () => {
			lastComp?.remove()
			lastComp = undefined

			// Create a component, so inner effects will be cleaned up properly, when
			// the shown branch changes.
			const condition = conditions[conditionIndex]
			if (condition) {
				lastComp = h(condition.then, {
					debugName: $.debugName,
					get: condition.when,
				})
			} else {
				if (props.else) {
					lastComp = h(props.else, {
						debugName: $.debugName,
					})
				}
			}
			if (lastComp) $.append(lastComp)
		})
	})

	return EMPTY_FRAGMENT
})
