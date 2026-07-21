import {
	Comp,
	defineComponent,
	type IComponentInit,
} from '../fun/defineComponent'
import { h } from '../fun/h'
import { logLevel } from '../fun/log'
import { untrack, useEffect } from '../fun/useEffect'
import { mutateState, useState } from '../fun/useState'
import { EMPTY_FRAGMENT } from '../model/EMPTY_FRAGMENT'
import { type IProps } from '../model/IProps'

export type TKey = string | number | bigint | symbol | boolean

export interface IForState<T> {
	item: T
	index: number
}
export interface IForItemProps<T> extends IProps {
	get: () => T
	getIndex: () => number
	getLength: () => number
}

export interface IForProps<T> extends IProps {
	debugName: string
	each: () => T[] | undefined
	getKey?: (item: T, index: number) => TKey
	render: IComponentInit<IForItemProps<T>>
	empty?: IComponentInit<IProps>
}

export interface IForItemData<T> {
	elem: Comp
	state: IForState<T>
}

export const For = defineComponent('For', <T>(props: IForProps<T>, $: Comp) => {
	let emptyElem: Element | undefined

	// Store item data here to let items survive multiple effect runs.
	const key__itemData = new Map<TKey, IForItemData<T>>()

	// Store length and its getter, so all items can get it.
	const state = useState('state', {
		length: 0,
	})
	function getLength() {
		return state.length
	}

	useEffect('update items [t6e00f]', () => {
		const items = props.each() ?? []

		// This will hold keys for items that are no longer in the list.
		const redundantKeys = new Set(key__itemData.keys())

		// Gather keys for each item. Remove found keys from redundant keys.
		const keys: TKey[] = []
		const seenKeys = new Set<TKey>()
		for (let index = 0, n = items.length; index < n; index++) {
			const item = items[index]!
			let key = props.getKey?.(item, index) ?? index
			if (seenKeys.has(key)) {
				// Duplicate key: keys must be unique, otherwise multiple items would
				// alias the same component and DOM element. Warn and derive a unique
				// key from the duplicate so this item still renders as its own element.
				console.error(
					`[tgtlcr] Duplicate key in For ${$.debugName}:`,
					key,
					`– deriving a unique key. Make getKey return unique keys.`,
				)
				do {
					key = `${String(key)} [dup]`
				} while (seenKeys.has(key))
			}
			seenKeys.add(key)
			keys.push(key)
			redundantKeys.delete(key)
		}
		if (redundantKeys.size) {
			if (logLevel >= 3) {
				console.debug(`🧹 Redundant keys ${$.debugName}:`, redundantKeys)
			}

			// Remove items with redundant keys. Do this here before sorting items to
			// avoid unnecessary move operations, as those trigger full component
			// reinitialization.
			untrack('redundant [t6e01i]', () => {
				for (const key of redundantKeys) {
					const data = key__itemData.get(key)
					if (data) {
						data.elem.remove()
					}
					key__itemData.delete(key)
				}
			})
		}

		if (items.length === 0) {
			if (!emptyElem && props.empty) {
				emptyElem = h(props.empty, {
					debugName: props.debugName,
				})
				$.append(emptyElem)
			}
		} else {
			if (emptyElem) {
				emptyElem.remove()
				emptyElem = undefined
			}
		}

		mutateState($.debugName, 'set length [tacjxi]', () => {
			state.length = items.length
		})

		untrack('update [t6e01d]', () => {
			// Store last element for inserting next element.
			let lastElem: Element | undefined
			mutateState($.debugName, `update items [t5im53]`, () => {
				for (let index = 0, n = items.length; index < n; index++) {
					const item = items[index]!
					const key = keys[index]!
					let itemData = key__itemData.get(key)
					if (itemData) {
						// Existing item.
						itemData.state.index = index
						// Update the item in case we had no keys and the list shifted.
						itemData.state.item = item
					} else {
						// Initialize new item.
						const itemState = useState<IForState<T>>(
							`${$.debugName} → itemState`,
							{
								index,
								item,
							},
						)

						// Create a component for each item to allow effects to work.
						const elem = h(props.render, {
							debugName: props.debugName,
							get: () => itemState.item,
							getIndex: () => itemState.index,
							getLength: getLength,
						})
						itemData = { elem, state: itemState }
						key__itemData.set(key, itemData)
					}

					// Move element to its correct position in the DOM. Moving a
					// component will trigger disconnect & connect, so avoid doing this
					// – using moveBefore if possible.
					if (lastElem) {
						if (lastElem.nextElementSibling !== itemData.elem) {
							if (($ as any).moveBefore && itemData.elem.isConnected) {
								;($ as any).moveBefore(
									itemData.elem,
									lastElem.nextElementSibling,
								)
							} else {
								lastElem.after(itemData.elem)
							}
						}
					} else {
						if (
							itemData.elem.parentElement?.firstElementChild !== itemData.elem
						) {
							if (($ as any).moveBefore && itemData.elem.isConnected) {
								;($ as any).moveBefore(itemData.elem, $.firstElementChild)
							} else {
								$.prepend(itemData.elem)
							}
						}
					}
					lastElem = itemData.elem
				}
			})
		})
	})

	return EMPTY_FRAGMENT
})
