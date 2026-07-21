const unwrapped = Symbol('unwrapped')

export interface IProxifyCallbacks {
	has?: (name: string, target: any, prop: string | symbol) => void
	get?: (name: string, target: any, prop: string | symbol) => void
	set?: (
		name: string,
		target: any,
		prop: string | symbol,
		newValue: any,
	) => void
	delete?: (name: string, target: any, prop: string | symbol) => void
	cache?: WeakMap<any, any>
}

/**
 * Creates a proxy of the given object or array. Each `get` will return a proxy
 * of the accessed value, as long as it is an object or array.
 */
export function proxify<T>(name: string, o: T, cbs?: IProxifyCallbacks): T {
	if (!isProxifyable(o)) {
		throw new Error(`[svh9tl] Object or array required.`)
	}

	// Always wrap the source object or array, and never a proxy.
	o = unproxify(o)

	return new Proxy(o as any, {
		// 'foo' in proxy
		has(target, p) {
			if (p === unwrapped) return true

			cbs?.has?.(name, target, p)
			return Reflect.has(target, p)
		},

		// proxy.foo; pArray[0]
		get(target, p, receiver) {
			if (p === unwrapped) return target

			cbs?.get?.(name, target, p)
			const result = Reflect.get(target, p, receiver)
			if (isProxifyable(result)) {
				// The result is either a plain object or an array: we wrap it in a
				// proxy, and return proxy rather than value: allows deep reads to
				// trigger callbacks.

				// Get existing proxy from cache.
				const cachedProxy = cbs?.cache?.get(result)
				if (cachedProxy) return cachedProxy

				// Create a new proxy instead.
				const newProxy = proxify(name + '.' + p.toString(), result, cbs)
				if (cbs?.cache) {
					cbs.cache.set(result, newProxy)
				}
				return newProxy
			} else {
				// Primitives and class instances need not register.
				return result
			}
		},

		// proxy.foo = 'bar'; pArray.push('bar')
		set(target, p, newValue, receiver) {
			let result = true
			let hadKey = p in target
			let oldValue = (target as any)[p]
			newValue = unproxify(newValue)

			// When an array is truncated via `arr.length = n`, the engine drops the
			// removed elements without firing a trap for each, so their index
			// subscribers would go stale. Capture the old length to notify them.
			const oldLength =
				Array.isArray(target) && p === 'length' ? oldValue : undefined

			if (!Object.is(oldValue, newValue)) {
				// Value changed.
				result = Reflect.set(target, p, newValue, receiver)
				if (!result) {
					console.error(
						`[t68ki1] ${name}.${p.toString()} could not be set:`,
						oldValue,
						`✏️`,
						newValue,
						`target:`,
						target,
					)
				}
				cbs?.set?.(name, target, p, newValue)
			}
			if (!hadKey && Array.isArray(target)) {
				// Array length changed. It is a computed property, so the callback must
				// be called explicitly.
				cbs?.set?.(name, target, 'length', target.length)
			}
			if (oldLength !== undefined && newValue < oldLength) {
				// Array was truncated: notify subscribers of each removed index.
				for (let i = newValue; i < oldLength; i++) {
					cbs?.delete?.(name, target, i + '')
				}
			}
			return result
		},

		// delete proxy.foo; pArray.splice(0, 1)
		deleteProperty(target, p) {
			let result = true
			if (p in target) {
				// The property exists before deletion.
				result = Reflect.deleteProperty(target, p)
				cbs?.delete?.(name, target, p)
			}
			return result
		},
	})
}

/**
 * Checks whether the given object is suitable for the proxify function. It must
 * be either an array, or a plain object.
 */
export function isProxifyable(o: unknown): boolean {
	return (
		o != null &&
		typeof o === 'object' &&
		(Array.isArray(o) ||
			Object.getPrototypeOf(o) === Object.prototype ||
			Object.getPrototypeOf(o) === null)
	)
}

/**
 * Get the source object or array of the given proxy; or the value itself, if it
 * is not a proxy.
 */
export function unproxify<T>(o: T): T {
	while (o != null && typeof o === 'object' && unwrapped in o) {
		o = o[unwrapped] as T
	}
	return o
}

// cmp.proxify = proxify
// cmp.unproxify = unproxify
// cmp.isProxifyable = isProxifyable
