import { cmp } from '../model/cmp'
import { getNoError } from './getNoError'

// export const LOG_GROUP_START = `🔰`
// export const LOG_GROUP_END = `🛑`

export let logLevel = getNoError<number>(0, () =>
	JSON.parse(sessionStorage['LOG_LEVEL']),
)

export function setLogLevel(it: number) {
	sessionStorage['LOG_LEVEL'] = JSON.stringify(it)
	logLevel = it
}

cmp.setLogLevel = setLogLevel
cmp.getLogLevel = () => logLevel
