/**
 * Renders each property of an object such that optionally a function may be
 * provided that returns a new value for it. Properties taking a function as a
 * value are exluded from this. Useful for declaring effects inline.
 */
export type TFns<T> = {
	[P in keyof T]: T[P] extends Function ? T[P] : T[P] | (() => T[P])
}
