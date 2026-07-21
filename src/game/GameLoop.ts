/**
 * Fixed-timestep game loop, matching the original's ENTER_FRAME + 0.04s step.
 *
 * The simulation always advances in exactly 40ms increments (the original
 * assumes 25 fps and advances World.currentTime by .04 per frame), so
 * physics stays deterministic regardless of display refresh rate.
 */
export const STEP_SECONDS = 0.04
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
