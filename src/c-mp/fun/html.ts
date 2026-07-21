import { escapeHtml } from './escapeHtml'

export class EscapedString extends String {
	constructor(value: string) {
		super(value)
	}
}

/**
 * Escape all variables with HTML entities.
 */
export function html(
	strs: TemplateStringsArray,
	...values: any[]
): EscapedString {
	return new EscapedString(
		String.raw(
			strs,
			...values.map((it) =>
				it == null
					? ''
					: it instanceof EscapedString
						? it.toString()
						: escapeHtml(it),
			),
		),
	) as any as string
}
