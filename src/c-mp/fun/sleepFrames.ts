import { AbortError } from '../model/AbortError'

export function sleepFrames(
	count: number,
	abortSetter?: (abort: () => void) => void,
) {
	let isAborted = false
	return new Promise<void>((resolve, reject) => {
		abortSetter?.(() => {
			isAborted = true
			reject(new AbortError())
		})
		function next() {
			if (!isAborted) {
				if (--count > 0) requestAnimationFrame(next)
				else resolve()
			}
		}
		next()
	})
}
