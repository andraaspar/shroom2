const RE = /^[a-zA-Z]*Error:\s*/

export function errorToMessage(e: unknown) {
	return e ? (e + '').replace(RE, '') : ''
}
