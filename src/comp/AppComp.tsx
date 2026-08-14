import { $when, Show } from '../c-mp/comp/Show'
import { defineComponent } from '../c-mp/fun/defineComponent'
import { useEffect } from '../c-mp/fun/useEffect'
import { mutateState } from '../c-mp/fun/useState'
import { GameLoop } from '../game/GameLoop'
import { Program } from '../game/Program'
import { Camera } from '../render/Camera'
import { Team } from '../game/Team'
import { WorldRenderer } from '../render/WorldRenderer'
import { GameMenuComp } from '../ui/GameMenuComp'
import { GameSetupComp } from '../ui/GameSetupComp'
import { GameUIImpl } from '../ui/GameUIImpl'
import { HudBounceComp } from '../ui/HudBounceComp'
import { HudEndTurnComp } from '../ui/HudEndTurnComp'
import { HudMessagesComp } from '../ui/HudMessagesComp'
import { HudRoundsComp } from '../ui/HudRoundsComp'
import { HudTeamQueueComp } from '../ui/HudTeamQueueComp'
import { HudTeamWindowComp } from '../ui/HudTeamWindowComp'
import { MenuButtonsComp } from '../ui/MenuButtonsComp'
import { ModalHostComp } from '../ui/ModalHostComp'
import { StartScreenComp, programBusSymbol } from '../ui/StartScreenComp'
import { uiState } from '../ui/state'
import { WorldInteraction } from '../ui/WorldInteraction'
import { WorldInteractionRenderer } from '../ui/WorldInteractionRenderer'
import { UI_STATE, type UIState } from '../game/events'
import { Point } from '../game/geom/Point'
import { findSelectedMember } from '../game/World'

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
		const worldInteraction = new WorldInteraction()
		const interactionRenderer = new WorldInteractionRenderer()

		function resize() {
			if (!canvas) return
			if (!canvas.clientWidth || !canvas.clientHeight) return
			canvas.width = canvas.clientWidth * devicePixelRatio
			canvas.height = canvas.clientHeight * devicePixelRatio
			camera.fitToViewport(canvas.width, canvas.height)
		}
		resize()
		addEventListener('resize', resize)

		let lastResizeW = 0
		let lastResizeH = 0

		// --- Pan / zoom: middle-click and right-click drag, scroll wheel zoom ---
		let dragLast: { x: number; y: number } | null = null
		const onMouseDown = (e: MouseEvent) => {
			if (uiState.controller !== Team.CONTROLLER_HUMAN && e.button === 0) return
			if (e.button === 0) program.toProgram.push({ type: 'iAmHere' })
			if (e.button === 1 || e.button === 2) {
				dragLast = { x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio }
				return
			}

			const screenPos = new Point(e.offsetX * devicePixelRatio, e.offsetY * devicePixelRatio)
			const uiStateVal = uiState.uiState

			if (uiStateVal === UI_STATE.MOVE) {
				worldInteraction.walkDragStart(screenPos, camera, program.game.world, program.toProgram)
				return
			}

			if (uiStateVal === UI_STATE.AIM) {
				const member = worldInteraction.hitTestMember(screenPos, camera, program.game.world)
				const selectedTeam = program.game.currentRound?.selectedTeam ?? null
				// Only a same-team member starts a new selection; clicking an
				// enemy or empty space starts the power-up instead.
				if (member && member.team === selectedTeam) {
					program.toProgram.push({ type: 'newSelectedTeamMember', member })
				} else {
					worldInteraction.crosshairClick(program.toProgram)
				}
				return
			}

			if (uiStateVal === UI_STATE.SHUNPO) {
				const selectedMember = findSelectedMember(program.game.world)
				const option = worldInteraction.hitTestShunpoOption(
					screenPos,
					camera,
					uiState.shunpoOptions,
					selectedMember,
				)
				if (option) {
					program.toProgram.push({ type: 'shunpoRequested', at: option })
				} else {
					const member = worldInteraction.hitTestMember(screenPos, camera, program.game.world)
					if (member) {
						program.toProgram.push({ type: 'newSelectedTeamMember', member })
					}
				}
				return
			}

			if (uiStateVal === UI_STATE.OVERVIEW || uiStateVal === UI_STATE.FOCUS) {
				dragLast = { x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio }
			}
		}
		const onMouseUp = (e: MouseEvent) => {
			// Clear a pan drag, then fall through so a release after panning
			// still fires / releases the walk (Regression 11).
			if (dragLast) dragLast = null

			if (e.button === 0 && uiState.uiState === UI_STATE.AIM) {
				worldInteraction.crosshairRelease(program.toProgram)
			}

			if (uiState.uiState === UI_STATE.MOVE) {
				worldInteraction.walkDragEnd(program.toProgram)
			}
		}
		const onMouseMove = (e: MouseEvent) => {
			const screenPos = new Point(e.offsetX * devicePixelRatio, e.offsetY * devicePixelRatio)
			const uiStateVal = uiState.uiState

			if (dragLast) {
				camera.panByScreenDelta(screenPos.x - dragLast.x, screenPos.y - dragLast.y)
				dragLast = { x: screenPos.x, y: screenPos.y }
				return
			}

			if (uiStateVal === UI_STATE.MOVE) {
				if (worldInteraction.isDragging) {
					worldInteraction.walkDragMove(screenPos, camera, program.toProgram)
				} else {
					worldInteraction.hoveredMember = worldInteraction.hitTestMember(screenPos, camera, program.game.world)
				}
				return
			}

			if (uiStateVal === UI_STATE.AIM) {
				const selectedMember = findSelectedMember(program.game.world)
				if (selectedMember) {
					worldInteraction.crosshairMove(screenPos, camera, program.toProgram, selectedMember)
				}
				worldInteraction.hoveredMember = worldInteraction.hitTestMember(screenPos, camera, program.game.world)
				return
			}

			if (uiStateVal === UI_STATE.SHUNPO) {
				worldInteraction.hoveredShunpoIndex = worldInteraction.hitTestShunpoOptionIndex(
					screenPos,
					camera,
					uiState.shunpoOptions,
					findSelectedMember(program.game.world),
				)
				worldInteraction.hoveredMember = worldInteraction.hitTestMember(screenPos, camera, program.game.world)
				return
			}
		}
		const onWheel = (e: WheelEvent) => {
			e.preventDefault()
			camera.zoomAt(
				new Point(e.offsetX * devicePixelRatio, e.offsetY * devicePixelRatio),
				e.deltaY < 0 ? 1.1 : 1 / 1.1,
			)
		}
		const onContextMenu = (e: MouseEvent) => e.preventDefault()
		const onMouseLeave = () => {
			worldInteraction.hoveredMember = null
			worldInteraction.hoveredShunpoIndex = -1
		}
		canvas.addEventListener('mousedown', onMouseDown)
		addEventListener('mouseup', onMouseUp)
		canvas.addEventListener('mousemove', onMouseMove)
		canvas.addEventListener('wheel', onWheel, { passive: false })
		canvas.addEventListener('contextmenu', onContextMenu)
		canvas.addEventListener('mouseleave', onMouseLeave)

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
			Shift: {
				down: () => program.toProgram.push({ type: 'special1Changed', active: true }),
				up: () => program.toProgram.push({ type: 'special1Changed', active: false }),
			},
		}
		const onKeyDown = (e: KeyboardEvent) => {
			if (uiState.controller !== Team.CONTROLLER_HUMAN) return
			const target = e.target as HTMLElement
			if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return

			if (e.key === 'Tab') {
				e.preventDefault()
				if (!e.repeat) {
					if (e.shiftKey) program.toProgram.push({ type: 'switchMemberReverseRequested' })
					else program.toProgram.push({ type: 'switchMemberRequested' })
				}
				return
			}

			const binding = keyMap[e.key]
			if (!binding) return
			e.preventDefault()
			if (!e.repeat) binding.down()
		}
		const onKeyUp = (e: KeyboardEvent) => {
			if (uiState.controller !== Team.CONTROLLER_HUMAN) return
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
								uiState.teamMembers = msg.team?.members.map(m => ({ name: m.name, health: m.health })) ?? []
							})
							break
						case 'newShunpoOptions':
							mutateState('AppComp', 'newShunpoOptions', () => {
								uiState.shunpoOptions = msg.options
							})
							break
						case 'newController':
							mutateState('AppComp', 'newController', () => {
								uiState.controller = msg.controller
							})
							break
					}
				})

				const world = program.game.world

				// Re-sync team health each frame (no health-update toUI message exists)
				if (uiState.currentTeamName) {
					const liveTeam = program.game.teams.find(t => t.name === uiState.currentTeamName)
					if (liveTeam) {
						const liveMembers = liveTeam.members.map(m => ({ name: m.name, health: m.health }))
						let changed = liveMembers.length !== uiState.teamMembers.length
						if (!changed) {
							for (let i = 0; i < liveMembers.length; i++) {
								if (liveMembers[i]!.health !== uiState.teamMembers[i]?.health) {
									changed = true
									break
								}
							}
						}
						if (changed) {
							mutateState('AppComp', 'syncHealth', () => {
								uiState.teamMembers = liveMembers
							})
						}
					}
				}

				// Re-sync canvas size when visible
				if (canvas.clientWidth !== lastResizeW || canvas.clientHeight !== lastResizeH) {
					lastResizeW = canvas.clientWidth
					lastResizeH = canvas.clientHeight
					resize()
				}

				if (!cameraInitialized && world.terrain) {
					camera.center.x = world.terrain.width / 2
					camera.center.y = world.terrain.height / 2
					camera.fitToTerrain(world.terrain.width, world.terrain.height)
					cameraInitialized = true
				}
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				renderer.render(ctx, world, camera)
				interactionRenderer.render(ctx, world, camera, worldInteraction, uiState.uiState as UIState, uiState.shunpoOptions)
			},
		)
		loop.start()

		return () => {
			loop.stop()
			removeEventListener('resize', resize)
			removeEventListener('keydown', onKeyDown)
			removeEventListener('keyup', onKeyUp)
			removeEventListener('mouseup', onMouseUp)
			canvas?.removeEventListener('mousedown', onMouseDown)
			canvas?.removeEventListener('mousemove', onMouseMove)
			canvas?.removeEventListener('wheel', onWheel)
			canvas?.removeEventListener('contextmenu', onContextMenu)
			canvas?.removeEventListener('mouseleave', onMouseLeave)
		}
	})

	$.setContext(programBusSymbol, program.toProgram)

	return (
		<div style={{ position: 'fixed', inset: '0' }}>
			<Show it={$when(() => uiState.screen === 'start', StartScreenComp)} />
			<Show it={$when(() => uiState.screen === 'setup', GameSetupComp)} />
			<canvas
				ref={(it) => (canvas = it)}
				class='ccc_canvas'
				style={() => uiState.screen !== 'game' ? { display: 'none' } : { display: 'block' }}
			/>
			<Show it={$when(() => uiState.screen === 'game', () => (
				<div class='hud-container'>
					<HudRoundsComp />
					<HudTeamQueueComp />
					<Show it={$when(() => uiState.teamWindowVisible, HudTeamWindowComp)} />
					<Show it={$when(() => uiState.bounceWindowVisible, HudBounceComp)} />
					<HudEndTurnComp />
					<Show it={$when(() => uiState.messageBox.text, HudMessagesComp)} />
					<MenuButtonsComp />
					<Show it={$when(() => uiState.menuVisible, GameMenuComp)} />
				</div>
			))} />
			<ModalHostComp getGameUI={() => gameUIImpl} />
		</div>
	)
})