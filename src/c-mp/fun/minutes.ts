import { seconds } from './seconds'

export function minutes(n: number) {
	return seconds(60) * n
}
