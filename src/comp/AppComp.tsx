import { defineComponent } from '../c-mp/fun/defineComponent'
import { useEffect } from '../c-mp/fun/useEffect'
import { GameLoop } from '../game/GameLoop'
import { Program } from '../game/Program'
import { Terrain } from '../game/Terrain'
import { WorldObject } from '../game/WorldObject'
import { Camera } from '../render/Camera'
import { WorldRenderer } from '../render/WorldRenderer'

export const AppComp = defineComponent<{}>('AppComp', (props, $) => {
	let canvas: HTMLCanvasElement | null = null

	useEffect('game effect', () => {
		if (!canvas) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// --- Smoke-test world: flat terrain, one object dropped onto it. ---
		const program = new Program()
		const terrain = new Terrain(2000, 1000)
		for (let x = 0; x < terrain.width; x++) {
			for (let y = 700; y < terrain.height; y++) {
				terrain.set(x, y, true)
			}
		}
		program.world.terrain = terrain

		const ball = new WorldObject(program.world)
		ball.name = 'Test ball'
		ball.health = 100
		ball.calculateHitSets()
		ball.location.x = 1000
		ball.location.y = 100
		program.world.addWorldObject(ball)

		// --- Camera + renderer ---
		const camera = new Camera()
		camera.center.x = terrain.width / 2
		camera.center.y = terrain.height / 2
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

		// --- Fixed-timestep loop ---
		const loop = new GameLoop(
			() => program.execute(),
			() => {
				if (!canvas) return
				ctx.clearRect(0, 0, canvas.width, canvas.height)
				renderer.render(ctx, program.world, camera)
			},
		)
		loop.start()

		return () => {
			loop.stop()
			removeEventListener('resize', resize)
			removeEventListener('mouseup', onMouseUp)
			canvas?.removeEventListener('mousedown', onMouseDown)
			canvas?.removeEventListener('mousemove', onMouseMove)
			canvas?.removeEventListener('wheel', onWheel)
		}
	})

	return <canvas ref={(it) => (canvas = it)} class='ccc_canvas' />
})
