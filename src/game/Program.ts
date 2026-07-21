import { MessageBus, type ToProgram, type ToUI } from './events.ts'
import { Gravity } from './Gravity.ts'
import { World } from './World.ts'

/**
 * Root of the game logic. Will grow into the 1:1 port of
 * com.pirkadat.logic.Program (asset loading states) + Game (match states).
 *
 * For now it owns the message buses and a World with gravity, which is
 * enough to run and verify the ported physics end to end.
 */
export class Program {
	readonly toProgram = new MessageBus<ToProgram>()
	readonly toUI = new MessageBus<ToUI>()

	world: World

	constructor() {
		this.world = new World()
		this.world.forces.push(new Gravity())
	}

	/** One fixed simulation step (0.04s), matching the original onFrameEntered. */
	execute(): void {
		this.toProgram.drain((message) => this.handleCommand(message))

		this.world.execute()

		// UI events are drained by the render/UI layer after execute().
	}

	private handleCommand(_message: ToProgram): void {
		// Commands are handled here as the corresponding Program/Game
		// functionality is ported (walking, aiming, team setup, ...).
	}
}
