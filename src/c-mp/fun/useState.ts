import { HIGHLIGHT } from '../model/HIGHLIGHT'
import { activeComps } from './defineComponent'
import { logLevel } from './log'
import { type IProxifyCallbacks, proxify } from './proxify'
import { activeEffects, type IEffectProxyTracker } from './useEffect'

const target__props__effects: WeakMap<
	object,
	Map<string | symbol, Set<IEffectProxyTracker>>
> = new WeakMap()

let effectsCleanedThisMutation = new WeakMap<
	Set<IEffectProxyTracker>,
	boolean
>()

let allowMutation = 0

function runEffects(
	name: string,
	action: string,
	target: object,
	prop: string | symbol,
	value: unknown,
) {
	if (!allowMutation) {
		console.error(`👾 Unlabeled mutation!`)
	}
	if (logLevel >= 1) {
		console.debug(
			`${
				action === 'SET' ? '✏️' : '🗑️'
			} State ${action}: %c${name}.${prop.toString()}`,
			HIGHLIGHT,
			'=',
			value,
		)
	}
	let props__effects = target__props__effects.get(target)
	if (!props__effects) return
	let effects = props__effects.get(prop)
	if (!effects) return
	effectsCleanedThisMutation.set(effects, true)
	for (const effect of Array.from(effects)) {
		if (effect.rerun) {
			effect.rerun()
		} else {
			effects.delete(effect)
		}
	}
}

function trackEffect(name: string, target: object, prop: string | symbol) {
	const activeEffect = activeEffects.at(-1)
	if (!activeEffect?.isTracking) return
	if (logLevel >= 3) {
		console.debug(`🔌 State GET: %c${name}.${prop.toString()}`, HIGHLIGHT)
	}
	let props__effects = target__props__effects.get(target)
	if (!props__effects) {
		props__effects = new Map()
		target__props__effects.set(target, props__effects)
	}
	let effects = props__effects.get(prop)
	if (effects) {
		if (!effectsCleanedThisMutation.get(effects)) {
			for (const effect of Array.from(effects)) {
				if (!effect.rerun) {
					effects.delete(effect)
				}
			}
			effectsCleanedThisMutation.set(effects, true)
		}
	} else {
		effects = new Set()
		props__effects.set(prop, effects)
	}
	effects.add(activeEffect)
}

const CBS: IProxifyCallbacks = {
	has(name, target, prop) {
		trackEffect(name, target, prop)
	},
	get(name, target, prop) {
		trackEffect(name, target, prop)
	},
	set(name, target, prop, value) {
		runEffects(name, `SET`, target, prop, value)
	},
	delete(name, target, prop) {
		runEffects(name, `DELETE`, target, prop, undefined)
	},
	cache: new WeakMap(),
}

/**
 * Creates a state proxy that tracks mutations and invokes effects.
 */
export function useState<T>(
	name: string,
	o: T,
	parentName = activeComps.at(-1)?.debugName ?? '-',
): T {
	return proxify(`${parentName} → ${name}`, o, CBS)
}

/**
 * Labels mutations for debugging.
 */
export function mutateState(parent: string, name: string, fn: () => void) {
	try {
		console.debug('👾', parent, name)
		if (allowMutation === 0) {
			effectsCleanedThisMutation = new WeakMap()
		}
		allowMutation++
		fn()
	} finally {
		allowMutation--
	}
}
