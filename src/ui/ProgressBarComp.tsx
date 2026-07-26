import { defineComponent } from '../c-mp/fun/defineComponent'
import { Slot } from '../c-mp/comp/Slot'

export interface ProgressBarProps {
	getLabel: () => string
	getValue: () => number
}

export const ProgressBarComp = defineComponent<ProgressBarProps>(
	'ProgressBarComp',
	(props) => {
		return (
			<div class='progress-bar'>
				<span class='progress-bar-label'><Slot get={() => props.getLabel()} /></span>
				<div class='progress-bar-track'>
					<div class='progress-bar-fill' style={() => ({ width: `${Math.max(0, Math.min(1, props.getValue())) * 100}%` })} />
				</div>
			</div>
		)
	},
)