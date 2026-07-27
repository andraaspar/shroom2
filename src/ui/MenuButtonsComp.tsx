import { defineComponent } from '../c-mp/fun/defineComponent'
import { mutateState } from '../c-mp/fun/useState'
import { uiState } from './state'

const MenuButtonsComp = defineComponent('MenuButtonsComp', (_props, $) => {
	const onHelp = () => {
		window.open('help.html', '_blank')
	}

	const onMenu = () => {
		mutateState('MenuButtonsComp', 'toggle menu', () => {
			uiState.menuVisible = !uiState.menuVisible
		})
	}

	return (
		<div class='hud-menu-buttons'>
			<button class='hud-menu-btn' onclick={onMenu} title='Menu'>
				☰
			</button>
			<button class='hud-menu-btn' onclick={onHelp} title='Help'>
				?
			</button>
		</div>
	)
})

export { MenuButtonsComp }
