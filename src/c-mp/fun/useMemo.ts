import { activeComps } from './defineComponent'
import {
	activeEffects,
	getEffectChain,
	type IEffectProxyTracker,
} from './useEffect'
import { mutateState, useState } from './useState'

export interface IMemoState<T> {
	value: T
	hasChanged: {}
}

export function useMemo<T>(name: string, getValue: () => T): () => T {
	const $ = activeComps.at(-1)
	const memo = useState<IMemoState<T>>(`${name} → memo`, {
		value: undefined as T,
		hasChanged: {},
	})
	let lastHasChanged: {}
	let proxyTracker: IEffectProxyTracker | undefined
	return () => {
		if (memo.hasChanged !== lastHasChanged) {
			lastHasChanged = memo.hasChanged
			try {
				proxyTracker = {
					name,
					chain: getEffectChain(name),
					rerun: () => {
						mutateState(
							$?.debugName ?? 'global',
							`${name} set memo changed [t6e6lq]`,
							() => {
								memo.hasChanged = {}
							},
						)
						proxyTracker!.rerun = undefined
					},
					isTracking: true,
				}
				activeEffects.push(proxyTracker)
				mutateState(
					$?.debugName ?? 'global',
					`${name} set memo value [t6e550]`,
					() => {
						memo.value = getValue()
					},
				)
			} finally {
				activeEffects.pop()
			}
		}
		return memo.value
	}
}
