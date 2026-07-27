import { Slot } from '../c-mp/comp/Slot'
import { defineComponent } from '../c-mp/fun/defineComponent'
import type { ToProgram } from '../game/events'
import { programBusSymbol } from './StartScreenComp'

export interface RoundWeightItemCompProps {
	getEntry: () => { className: string; displayName: string; weight: number; isMoveRound: boolean }
	getIndex: () => number
}

const RoundWeightItemComp = defineComponent<RoundWeightItemCompProps>('RoundWeightItemComp', (props, $) => {
	const programBus = $.getContext(programBusSymbol) as { push: (msg: ToProgram) => void } | undefined

	const entry = () => props.getEntry()

	const onDec = () => {
		programBus?.push({ type: 'weightModifyRound', roundClass: entry().className, newWeight: entry().weight - 1 })
	}

	const onInc = () => {
		programBus?.push({ type: 'weightModifyRound', roundClass: entry().className, newWeight: entry().weight + 1 })
	}

	return (
		<div class='round-weight-item'>
			<span class='round-weight-label'><Slot get={() => entry().displayName} /></span>
			<div class='round-weight-controls'>
				<button class='round-weight-btn' onclick={onDec}>-</button>
				<span class='round-weight-value'><Slot get={() => String(entry().weight)} /></span>
				<button class='round-weight-btn' onclick={onInc}>+</button>
			</div>
		</div>
	)
})

export { RoundWeightItemComp }