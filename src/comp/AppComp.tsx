import { defineComponent } from '../c-mp/fun/defineComponent'
import { useEffect } from '../c-mp/fun/useEffect'
import { GameLoop } from '../game/GameLoop'
import { Program } from '../game/Program'
import { noopGameUI } from '../game/GameUI'
import { Camera } from '../render/Camera'
import { WorldRenderer } from '../render/WorldRenderer'

export const AppComp = defineComponent<{}>('AppComp', (props, $) => {
	let canvas: HTMLCanvasElement | null = null

	useEffect('game effect', () => {
		if (!canvas) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// --- Program + Game (headless UI; keyboard debug controls below). ---
		const program = new Program(noopGameUI)

		// --- Camera + renderer ---
		const camera = new Camera()
		const renderer = new WorldRenderer()

		function resize() {
			if (!canvas) return
			canvas.width = canvas.clientWidth * devicePixelRatio
			canvas.height = canvas.clientHeight * devicePixelRatio
			camera.fitToViewport(canvas.width, canvas.height)
		}
		resize()
		addEventListener('resize', resize)

		// --- Pan / zoom (replaces WorldWindow mouse handling) ---
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

		// --- Keyboard debug UI: arrows/space/enter mapped to bus commands. ---
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

		// Start the game immediately (skips the setup window for now).
		program.toProgram.push({ type: 'gameStartRequested' })

		// --- Fixed-timestep loop ---
		let cameraInitialized = false
		const loop = new GameLoop(
			() => program.execute(),
			() => {
				if (!canvas) return
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

	return <canvas ref={(it) => (canvas = it)} class='ccc_canvas' />
})
