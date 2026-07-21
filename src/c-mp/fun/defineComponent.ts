import { getCmpTagName } from '../model/getCmpTagName'
import { HIGHLIGHT } from '../model/HIGHLIGHT'
import type { IProps } from '../model/IProps'
import { logLevel } from './log'

/**
 * The debug name of each init function.
 */
const debugNameByInit = new Map<IComponentInit<any>, string>()

/**
 * Declares the shape of an init function to be passed to a c-mp web component.
 * Returning a JSX.Element is a requirement for JSX support. The returned value
 * itself is not used in any way.
 */
export interface IComponentInit<P extends IProps = IProps> {
	(props: P, $: Comp): JSX.Element
}

/**
 * The list of c-mp web components currently executing their init function.
 */
export const activeComps: Comp[] = []

export interface ICompProps<P extends IProps = IProps> {
	/**
	 * The props passed to this instance at init time. This field is set directly
	 * on the instance after it is constructed.
	 */
	props: P | undefined

	/**
	 * The init function used to set up this component. This field is set directly
	 * on the instance after it is constructed.
	 */
	init: IComponentInit<P> | undefined
}

/**
 * The c-mp web component.
 */
export class Comp extends HTMLElement {
	/**
	 * The props passed to this instance at init time. This field is set directly
	 * on the instance after it is constructed.
	 */
	props: IProps | undefined

	/**
	 * The init function used to set up this component. This field is set directly
	 * on the instance after it is constructed.
	 */
	init: IComponentInit<any> | undefined

	/**
	 * The name of this component as used in debug messages.
	 */
	debugName = getCmpTagName()

	/**
	 * The parent c-mp instance this belongs to. This may theoretically change
	 * [tack9d] on moveBefore, but I see no reason at this time to make this a
	 * state.
	 */
	parentComp: Comp | null | undefined

	/**
	 * Callbacks to call when this c-mp instance is disconnected.
	 */
	kills: (() => void)[] = []

	/**
	 * An optional error handler callback to be supplied by the init function.
	 */
	onError: ((e: unknown) => void) | undefined

	/**
	 * Whether this c-mp web component has already been connected.
	 */
	wasConnected = false

	/**
	 * How deeply this component is nested within the component tree. This may
	 * theoretically change [tack9d] on moveBefore, but I see no reason at this
	 * time to make this a state.
	 */
	level = 0

	/**
	 * Executes each time this c-mp web component is connected to the DOM.
	 */
	connectedCallback() {
		this.parentComp =
			activeComps.at(-1) ?? this.parentElement?.closest<Comp>(getCmpTagName())

		this.level = (this.parentComp?.level ?? -1) + 1

		this.debugName =
			((this.init && debugNameByInit.get(this.init)) ?? getCmpTagName()) +
			(this.props?.debugName ? `(${this.props.debugName})` : '')

		if (this.wasConnected) {
			throw new Error(
				`[swczjp] Component ${this.debugName} was already connected.`,
			)
		}

		// It makes no sense, but this can sometimes happen.
		if (!this.isConnected) {
			throw new Error(
				`[t2twu3] Component ${this.debugName} was not connected after all.`,
			)
		}
		this.wasConnected = true

		// The component enters the DOM. It initializes a context and calls the
		// component function inside.

		if (logLevel >= 3) {
			console.debug(
				`🔰 ☀️ Component connected: %c${this.debugName}%c inside %c${
					this.parentComp?.debugName ?? `<${this.parentNode?.nodeName}>`
				}%c`,
				HIGHLIGHT,
				undefined,
				HIGHLIGHT,
			)
		}

		this.setAttribute('is', this.debugName)
		this.setAttribute('c-mp', '')
		// this.setAttribute('level', this.level + '')

		activeComps.push(this)

		try {
			this.append(this.init!(this.props!, this))
		} catch (e) {
			this.handleError(e)
		} finally {
			activeComps.pop()
			if (logLevel >= 3) {
				console.debug(
					`🛑 ☀️ Component connected: %c${this.debugName}%c inside %c${
						this.parentComp?.debugName ?? `<${this.parentNode?.nodeName}>`
					}%c`,
					HIGHLIGHT,
					undefined,
					HIGHLIGHT,
				)
			}
		}
	}

	/**
	 * When this is defined, it will execute on moveBefore, rather than
	 * disconnectedCallback & connectedCallback, preserving state.
	 */
	connectedMoveCallback() {
		// [tack9d]
		this.parentComp = this.parentElement?.closest<Comp>(getCmpTagName())

		// [tack9d]
		this.level = (this.parentComp?.level ?? -1) + 1
	}

	/**
	 * Invoked when trying to handle an error in the init function or an effect.
	 */
	handleError(e: unknown) {
		let handled = false
		if (this.onError) {
			try {
				if (logLevel >= 3) {
					console.debug(`🔰 🎯 Handling error: %c${this.debugName}`, HIGHLIGHT)
				}
				this.onError(e)
				handled = true
			} catch (e) {
				console.error(e)
			} finally {
				if (logLevel >= 3) {
					console.debug(`🛑 🎯 Handling error: %c${this.debugName}`, HIGHLIGHT)
				}
			}
		}
		if (!handled) {
			if (this.parentComp) {
				if (logLevel >= 3) {
					console.debug(
						`🔰 🔍 Looking for error handler: %c${this.debugName}`,
						HIGHLIGHT,
					)
				}
				this.parentComp.handleError(e)
				if (logLevel >= 3) {
					console.debug(
						`🛑 🔍 Looking for error handler: %c${this.debugName}`,
						HIGHLIGHT,
					)
				}
			} else {
				if (logLevel >= 3) {
					console.debug(
						`🔰 ⚠️ Failed to handle error: %c${this.debugName}`,
						HIGHLIGHT,
					)
				}
				console.error(e)
				this.remove()
				if (logLevel >= 3) {
					console.debug(
						`🛑 ⚠️ Failed to handle error: %c${this.debugName}`,
						HIGHLIGHT,
					)
				}
			}
		}
	}

	/**
	 * Invoked when this c-mp web component is disconnected from the DOM.
	 */
	disconnectedCallback() {
		// This matters because of disconnected components going through the lifecycle.
		if (!this.wasConnected) return

		// The component is removed from the DOM, or is being moved around. It kills
		// the context.
		if (logLevel >= 3) {
			console.debug(
				`🔰 🌑 Component disconnected: %c${this.debugName}%c from %c${
					this.parentComp?.debugName ?? `<${this.parentNode?.nodeName}>`
				}%c`,
				HIGHLIGHT,
				undefined,
				HIGHLIGHT,
			)
		}

		this.parentComp = undefined

		// Execute kill callbacks. This ends effects. They are executed in reverse
		// order, as the end is where the kill functions begin to seek to remove
		// themselves.
		while (this.kills.length) {
			this.kills.pop()!()
		}

		// Remove all children.
		this.innerHTML = ''

		this.wasConnected = false
		if (logLevel >= 3) {
			console.debug(
				`🛑 🌑 Component disconnected: %c${this.debugName}`,
				HIGHLIGHT,
			)
		}
	}

	/**
	 * Used to make a getter available to all descendant components.
	 */
	setContext<T>(key: symbol, value: T) {
		;(this as any)[key] = value
	}

	/**
	 * Retrieve a getter from self or ancestor components.
	 */
	getContext(key: symbol): unknown {
		return key in this ? (this as any)[key] : this.parentComp?.getContext(key)
	}
}

// Let Comp be the custom element for <c-mp>.
customElements.define(getCmpTagName(), Comp)

/**
 * Define a new init function that can be used in a useComponent call. This
 * makes sure that each init function has a corresponding debug name, and it
 * also makes declaring the props easier.
 */
// This one is for basic needs. No separate interface required for declaring
// props.
export function defineComponent<
	P,
	I extends IComponentInit<P & IProps> = IComponentInit<P & IProps>,
>(debugName: string, init: I): I
// This one is for templated functions. Use it with a separate interface that
// extends IProps.
export function defineComponent<T extends IComponentInit<any>>(
	debugName: string,
	init: T,
): T
export function defineComponent<T extends IComponentInit<any>>(
	debugName: string,
	init: T,
): T {
	debugNameByInit.set(init, debugName)
	return init
}
