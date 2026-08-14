/**
 * Fixed-timestep game loop: the simulation advances in STEP_SECONDS (1/60s)
 * increments, retuned from the original's ENTER_FRAME + 0.04s (25 fps) step,
 * so the real-time pace is unchanged while motion updates at 60 FPS.
 *
 * Physics stays deterministic regardless of display refresh rate.
 */
import { STEP_SECONDS } from './step.ts'
export { STEP_SECONDS }
const MAX_FRAME_SECONDS = 0.25 // avoid spiral of death after tab was hidden

export class GameLoop {
	private rafId = 0
	private lastTime = 0
	private accumulator = 0
	private running = false

	/**
	 * @param step advances the simulation by exactly STEP_SECONDS
	 * @param render draws the current state; called once per rAF
	 */
	constructor(
		private step: () => void,
		private render: () => void,
	) {}

	start(): void {
		if (this.running) return
		this.running = true
		this.lastTime = performance.now()
		this.accumulator = 0
		this.rafId = requestAnimationFrame(this.frame)
	}

	stop(): void {
		if (!this.running) return
		this.running = false
		cancelAnimationFrame(this.rafId)
	}

	private frame = (time: number): void => {
		if (!this.running) return

		let frameSeconds = (time - this.lastTime) / 1000
		this.lastTime = time
		if (frameSeconds > MAX_FRAME_SECONDS) frameSeconds = MAX_FRAME_SECONDS

		this.accumulator += frameSeconds
		while (this.accumulator >= STEP_SECONDS) {
			this.step()
			this.accumulator -= STEP_SECONDS
		}

		this.render()

		this.rafId = requestAnimationFrame(this.frame)
	}
}
