import { MessageBus, type ToProgram, type ToUI } from './events.ts'
import { FrameCommands } from './FrameCommands.ts'
import { Game } from './Game.ts'
import { noopGameUI, type GameUI } from './GameUI.ts'

/**
 * Root of the game logic: the 1:1 port of com.pirkadat.logic.Program's
 * STATE_WORKING frame (asset-loading states are out of scope).
 *
 * Frame order, matching the original onFrameEntered:
 * 1. drain the toProgram bus into the per-frame FrameCommands bag
 *    (replaces "mbToP = new MBToP()" + UI writing fields)
 * 2. game.execute() — reads/writes the command bag, pushes toUI messages
 * 3. recreate-on-destroy semantics (gameDestroyRequested -> spawnNew)
 * 4. UI events are drained by the render/UI layer after execute()
 */
export class Program {
	readonly toProgram = new MessageBus<ToProgram>()
	readonly toUI = new MessageBus<ToUI>()

	readonly ui: GameUI
	game: Game

	private commands = new FrameCommands()

	constructor(ui: GameUI = noopGameUI) {
		this.ui = ui
		this.game = new Game(this.toUI, this.ui)
	}

	/** One fixed simulation step (STEP_SECONDS = 1/60s). */
	execute(): void {
		this.commands = new FrameCommands()
		this.toProgram.drain((message) => {
			if (message.type === 'weightModifyRound') {
				const ctor = this.game.resolveRoundCtor(message.roundClass)
				if (ctor) {
					this.commands.weightModifyRound = ctor
					this.commands.newRoundWeight = message.newWeight
				}
				return
			}
			this.commands.apply(message)
		})

		this.game.commands = this.commands
		this.game.execute()

		if (this.commands.gameDestroyRequested) {
			this.game.destroy()
			this.game = this.game.spawnNew()
			this.game.commands = this.commands
			this.game.execute()
		}

		// UI events are drained by the render/UI layer after execute().
	}
}
