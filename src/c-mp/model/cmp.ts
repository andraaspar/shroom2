import { getCmpIndex } from './getCmpTagName'

export const cmp: { [k: string]: any } = ((globalThis as any)[
	'cmp' + getCmpIndex()
] = {})
