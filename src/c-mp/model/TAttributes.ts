import type { IExtraAttributes } from './IExtraAttributes'
import type { TFns } from './TFns'

export type TAttributes<T> = IExtraAttributes<T> &
	Partial<TFns<Omit<T, 'children' | 'className' | 'style' | 'classList'>>>
