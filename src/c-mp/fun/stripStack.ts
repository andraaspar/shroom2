import { cmp } from '../model/cmp'
import { getNoError } from './getNoError'

const LINE_ENDING_RE = /[\r\n]+/
const STRIP_RE = /@.*\/c-mp\//

let stripStackDisabled: boolean = getNoError<boolean>(false, () =>
	JSON.parse(sessionStorage['STRIP_STACK_DISABLED']),
)

export function stripStack(e: unknown) {
	if (!stripStackDisabled && e instanceof Error && e.stack) {
		e.stack = e.stack
			.split(LINE_ENDING_RE)
			.filter((line) => !line.match(STRIP_RE))
			.join('\n')
	}
}

cmp.setStripStackDisabled = (flag: boolean) => {
	stripStackDisabled = flag
	sessionStorage['STRIP_STACK_DISABLED'] = JSON.stringify(flag)
}
cmp.getStripStackDisabled = () => stripStackDisabled
