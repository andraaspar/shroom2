import { defineComponent } from '../c-mp/fun/defineComponent'
import { For } from '../c-mp/comp/For'
import { uiState } from './state'
import { RoundWeightItemComp } from './RoundWeightItemComp'

const RoundWeightConfigComp = defineComponent('RoundWeightConfigComp', (_props, $) => {
	return (
		<div class='round-weight-config'>
			<h3>Round Weights</h3>
			<For
				debugName='round-weight-list'
				each={() => uiState.setupRoundWeights}
				getKey={(_, i) => i}
				render={({ get, getIndex }) => (
					<RoundWeightItemComp getEntry={get} getIndex={getIndex} />
				)}
			/>
		</div>
	)
})

export { RoundWeightConfigComp }