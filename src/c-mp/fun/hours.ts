import { minutes } from './minutes'

export function hours(n: number) {
	return minutes(60) * n
}
