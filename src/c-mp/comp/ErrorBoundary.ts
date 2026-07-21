import {
	Comp,
	defineComponent,
	type IComponentInit,
} from '../fun/defineComponent'
import { h } from '../fun/h'
import { stripStack } from '../fun/stripStack'
import { unchain, untrack, useEffect } from '../fun/useEffect'
import { mutateState, useState } from '../fun/useState'
import { EMPTY_FRAGMENT } from '../model/EMPTY_FRAGMENT'
import { type IProps } from '../model/IProps'

export interface IErrorBoundaryProps {
	try: IComponentInit
	catch: IComponentInit<IErrorBoundaryCatchParams>
}

export interface IErrorBoundaryCatchParams extends IProps {
	error: string
	stack: string
	reset: () => void
}

export const ErrorBoundary = defineComponent<IErrorBoundaryProps>(
	'ErrorBoundary',
	(props, $) => {
		const state = useState('state', {
			error: undefined as string | undefined,
			stack: undefined as string | undefined,
		})

		// Add error handler to c-mp.
		$.onError = (e) => {
			// Remove c-mp parts from stack trace.
			stripStack(e)
			console.error(`${$.debugName}:`, e)
			unchain('unChainErrorRender', () => {
				mutateState($.debugName, 'set error [taca6g]', () => {
					state.error = e + ''
					state.stack = e instanceof Error ? e.stack : e + ''
				})
			})
		}

		function reset() {
			// Render no error.
			mutateState($.debugName, 'reset [tc3xny]', () => {
				state.error = undefined
				state.stack = undefined
			})
		}

		let innerComponent: Comp | undefined

		// Render try content.
		useEffect('error effect [taca9z]', () => {
			innerComponent?.remove()

			const { error, stack } = state

			untrack('error effect [taca9z]', () => {
				// Create ad-hoc component for try & catch callbacks.
				if (error) {
					innerComponent = h(props.catch, {
						debugName: $.debugName,
						error,
						stack: stack ?? error,
						reset,
					})
				} else {
					innerComponent = h(props.try, {
						debugName: props.debugName,
					})
				}

				$.append(innerComponent)
			})
		})

		return EMPTY_FRAGMENT
	},
)
