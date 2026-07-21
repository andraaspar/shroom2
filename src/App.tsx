import { Slot } from './c-mp/comp/Slot'
import { defineComponent } from './c-mp/fun/defineComponent'

export const AppComp = defineComponent<{}>('AppComp', (props, $) => {
	return <h1><Slot get={() => 'Hello World'} /></h1>
})
