import { useEffect } from './useEffect'
import { maybeReloadQueriesOnVisible } from './useQuery'

export function useReloadOnVisible() {
	useEffect('set handler [t6e0br]', () => {
		function onVisibilityChange() {
			if (document.visibilityState === 'visible') {
				const count = maybeReloadQueriesOnVisible()
				if (count) {
					console.debug(
						`[t57jfc] Document visible, reloading ${count} entries...`,
					)
				}
			}
		}
		window.addEventListener('visibilitychange', onVisibilityChange)
		return () => {
			window.removeEventListener('visibilitychange', onVisibilityChange)
		}
	})
}
