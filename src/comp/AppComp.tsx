import { defineComponent } from '../c-mp/fun/defineComponent'
import { useEffect } from '../c-mp/fun/useEffect'
import { mutateState } from '../c-mp/fun/useState'
import { $when, Show } from '../c-mp/comp/Show'
import { GameLoop } from '../game/GameLoop'
import { Program } from '../game/Program'
import { GameUIImpl } from '../ui/GameUIImpl'
import { uiState } from '../ui/state'
import { ModalHostComp } from '../ui/ModalHostComp'
import { StartScreenComp, programBusSymbol } from '../ui/StartScreenComp'
import { GameSetupComp } from '../ui/GameSetupComp'
import { Camera } from '../render/Camera'
import { WorldRenderer } from '../render/WorldRenderer'
import type { SetupTeamEntry, SetupRoundWeightEntry } from '../ui/state'
import type { GameRound, RoundCtor } from '../game/rounds/GameRound'

const ROUND_DISPLAY_NAMES: Record<string, string> = {
	MoveRound: 'Moving',
	MoonwalkRound: 'Moonwalking',
	DoubleMoveRound: 'Running',
	ShunpoRound: 'Shunpo',
	ShootRound: 'Shooting Star',
	DoughnutRound: 'Doughnut',
	TeslaRound: 'Tesla',
	DawnRound: 'Dawn',
}

const gameUIImpl = new GameUIImpl()
const program = new Program(gameUIImpl)

export const AppComp = defineComponent<{}>('AppComp', (props, $) => {
	let canvas: HTMLCanvasElement | null = null

	function syncSetupState() {
		const game = program.game
		uiState.setupTeams = game.teams.map((team, idx) => ({
			id: idx,
			name: team.name,
			memberCount: team.members.length,
			controller: team.controller,
			aiLevel: team.aiLevel,
			appearanceName: team.characterAppearance?.characterName ?? '',
			appearanceColor: team.characterAppearance?.color ?? 0xff99cc,
		}))
		uiState.setupEditedTeamIndex = game.teams.indexOf(game.editedTeam!)
		uiState.setupMembersPerTeam = game.membersPerTeam
		uiState.setupRoundWeights = [...game.roundWeights.entries()].map(([ctor, weight]) => ({
			className: ctor.name,
			displayName: ROUND_DISPLAY_NAMES[ctor.name] ?? ctor.name,
			weight,
			isMoveRound: game.moveRoundClasses.includes(ctor),
		}))
		uiState.setupLevelName = 'Generated Level'
		uiState.setupAvailableAppearances = game.characterAppearances.map((ca, idx) => ({
			characterName: ca.characterName,
			color: ca.color,
			colorNumber: ca.colorNumber,
			index: idx,
		}))
		uiState.setupInitialized = true
	}

	useEffect('game effect', () => {
		if (!canvas) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// --- Camera + renderer ---
		const camera = new Camera()
		const renderer = new WorldRenderer()

		function resize() {
			if (!canvas) return
			if (!canvas.clientWidth || !canvas.clientHeight) return
			canvas.width = canvas.clientWidth * devicePixelRatio
			canvas.height = canvas.clientHeight * devicePixelRatio
			camera.fitToViewport(canvas.width, canvas.height)
		}
		resize()
		addEventListener('resize', resize)

		// --- Pan / zoom ---
		let dragLast: { x: number; y: number } | null = null
		const onMouseDown = (e: MouseEvent) => (dragLast = { x: e.offsetX, y: e.offsetY })
		const onMouseUp = () => (dragLast = null)
		const onMouseMove = (e: MouseEvent) => {
			if (!dragLast) return
			camera.panByScreenDelta(
				(e.offsetX - dragLast.x) * devicePixelRatio,
				(e.offsetY - dragLast.y) * devicePixelRatio,
			)
			dragLast = { x: e.offsetX, y: e.offsetY }
		}
		const onWheel = (e: WheelEvent) => {
			e.preventDefault()
			camera.zoomAt(
				{ x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio } as never,
				e.deltaY < 0 ? 1.1 : 1 / 1.1,
			)
		}
		canvas.addEventListener('mousedown', onMouseDown)
		addEventListener('mouseup', onMouseUp)
		canvas.addEventListener('mousemove', onMouseMove)
		canvas.addEventListener('wheel', onWheel, { passive: false })

		// --- Keyboard debug UI ---
		const keyMap: Record<string, { down: () => void; up: () => void }> = {
			ArrowLeft: {
				down: () => program.toProgram.push({ type: 'leftChanged', active: true }),
				up: () => program.toProgram.push({ type: 'leftChanged', active: false }),
			},
			ArrowRight: {
				down: () => program.toProgram.push({ type: 'rightChanged', active: true }),
				up: () => program.toProgram.push({ type: 'rightChanged', active: false }),
			},
			ArrowUp: {
				down: () => program.toProgram.push({ type: 'upChanged', active: true }),
				up: () => program.toProgram.push({ type: 'upChanged', active: false }),
			},
			ArrowDown: {
				down: () => program.toProgram.push({ type: 'downChanged', active: true }),
				up: () => program.toProgram.push({ type: 'downChanged', active: false }),
			},
			' ': {
				down: () => program.toProgram.push({ type: 'fire1Changed', active: true }),
				up: () => program.toProgram.push({ type: 'fire1Changed', active: false }),
			},
			Enter: {
				down: () => program.toProgram.push({ type: 'endTurnRequested' }),
				up: () => {},
			},
			Tab: {
				down: () => program.toProgram.push({ type: 'switchMemberRequested' }),
				up: () => {},
			},
		}
		const onKeyDown = (e: KeyboardEvent) => {
			const binding = keyMap[e.key]
			if (!binding) return
			e.preventDefault()
			if (!e.repeat) binding.down()
		}
		const onKeyUp = (e: KeyboardEvent) => {
			const binding = keyMap[e.key]
			if (!binding) return
			e.preventDefault()
			binding.up()
		}
		addEventListener('keydown', onKeyDown)
		addEventListener('keyup', onKeyUp)

		// --- Fixed-timestep loop ---
		let cameraInitialized = false
		const loop = new GameLoop(
			() => program.execute(),
			() => {
				if (!canvas) return

				// Handle setup screen
				if (uiState.screen === 'setup') {
					if (!uiState.setupInitialized) {
						mutateState('AppComp', 'initSetup', () => syncSetupState())
					}
					program.toUI.drain((msg) => {
						if (msg.type === 'setupStateChanged') {
							mutateState('AppComp', 'setupStateChanged', () => syncSetupState())
						}
					})
					program.toUI.clear()
					return
				}

				if (uiState.screen !== 'game' || !program.game.world.terrain) {
					program.toUI.clear()
					return
				}

				// Drain toUI messages into reactive state
				program.toUI.drain((msg) => {
					switch (msg.type) {
						case 'newMessageBox':
							mutateState('AppComp', 'newMessageBox', () => {
								uiState.messageBox = { text: msg.text, time: msg.time, remaining: msg.time }
							})
							break
						case 'newDoneButtonText':
							mutateState('AppComp', 'newDoneButtonText', () => {
								uiState.doneButtonText = msg.text
							})
							break
						case 'newBounceCount':
							mutateState('AppComp', 'newBounceCount', () => {
								uiState.bounceCount = msg.value
							})
							break
						case 'teamQueueUpdated':
							mutateState('AppComp', 'teamQueueUpdated', () => {
								uiState.teamQueue = msg.queue
							})
							break
						case 'gameRoundsUpdated':
							mutateState('AppComp', 'gameRoundsUpdated', () => {
								uiState.gameRounds = msg.rounds
							})
							break
						case 'newState':
							mutateState('AppComp', 'newState', () => {
								uiState.uiState = msg.state
							})
							break
						case 'memberSelectionChanged':
							mutateState('AppComp', 'memberSelectionChanged', () => {
								uiState.currentMemberName = msg.member?.name ?? ''
							})
							break
						case 'teamSelectionChanged':
							mutateState('AppComp', 'teamSelectionChanged', () => {
								uiState.currentTeamName = msg.team?.name ?? ''
							})
							break
					}
				})

				const world = program.game.world
				if (!cameraInitialized && world.terrain) {
					camera.center.x = world.terrain.width / 2
					camera.center.y = world.terrain.height / 2
					cameraInitialized = true
				}
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				renderer.render(ctx, world, camera)
				program.toUI.clear()
			},
		)
		loop.start()

		return () => {
			loop.stop()
			removeEventListener('resize', resize)
			removeEventListener('mouseup', onMouseUp)
			removeEventListener('keydown', onKeyDown)
			removeEventListener('keyup', onKeyUp)
			canvas?.removeEventListener('mousedown', onMouseDown)
			canvas?.removeEventListener('mousemove', onMouseMove)
			canvas?.removeEventListener('wheel', onWheel)
		}
	})

	$.setContext(programBusSymbol, program.toProgram)

	return (
		<div>
			<Show it={$when(() => uiState.screen === 'start', StartScreenComp)} />
			<Show it={$when(() => uiState.screen === 'setup', GameSetupComp)} />
			<canvas
				ref={(it) => (canvas = it)}
				class='ccc_canvas'
				style={() => uiState.screen !== 'game' ? { display: 'none' } : { display: 'block' }}
			/>
			<ModalHostComp getGameUI={() => gameUIImpl} />
		</div>
	)
})