import { ErrorBoundary, type IErrorBoundaryProps } from '../comp/ErrorBoundary'
import { For, type IForProps } from '../comp/For'
import { Fragment } from '../comp/Fragment'
import { Icon } from '../comp/Icon'
import { type IShowProps, Show } from '../comp/Show'
import { type ISlotProps, Slot } from '../comp/Slot'
import type { TChild } from '../model/TChildren'
import { h } from './h'

export function $Fragment(...children: TChild[]) {
	return h(Fragment, { children })
}

export function $For<T>(props: IForProps<T>) {
	return h(For<T>, props)
}

export function $Slot(props: ISlotProps) {
	return h(Slot, props)
}

export function $Show(props: IShowProps) {
	return h(Show, props)
}

export function $ErrorBoundary(props: IErrorBoundaryProps) {
	return h(ErrorBoundary, props)
}

export function $Icon(svg: string) {
	return h(Icon, { svg })
}
