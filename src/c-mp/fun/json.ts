/**
 * Encode all parameters as URI components in the template.
 */
export function json(strs: TemplateStringsArray, ...values: any[]) {
	return String.raw(strs, ...values.map((it) => JSON.stringify(it)))
}
