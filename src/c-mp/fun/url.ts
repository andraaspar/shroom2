/**
 * Encode all parameters as URI components in the template.
 */
export function url(strs: TemplateStringsArray, ...values: any[]) {
	return String.raw(strs, ...values.map((it) => encodeURIComponent(it + '')))
}
