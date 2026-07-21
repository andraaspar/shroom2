declare module JSX {
	/**
	 * This links "div" to HTMLDivElement, "a" to HTMLAnchorElement, etc. Each
	 * interface is made partial so not all fields have to be set. Each field
	 * handled in a special way is omitted. The rest of the fields will be
	 * optionally set to a function, to have effects defined easily. Additional
	 * attributes supported by c-mp are also mixed in.
	 */
	export type IntrinsicElements = {
		[P in keyof HTMLElementTagNameMap]: import('./model/TAttributes').TAttributes<
			HTMLElementTagNameMap[P]
		>
	}

	/**
	 * Specifies the name of the children field in props.
	 */
	export interface ElementChildrenAttribute {
		children: {}
	}

	export type Element = globalThis.HTMLElement | globalThis.DocumentFragment
}
