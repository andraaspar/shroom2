import type { Game } from '../Game.ts'
import { MoveRound } from './MoveRound.ts'

/** 1:1 port of com.pirkadat.logic.DoubleMoveRound. */
export class DoubleMoveRound extends MoveRound {
	constructor(game: Game) {
		super(game)

		this.type = MoveRound.TYPE_DOUBLE
	}

	override getName(): string {
		return 'Running Round'
	}

	override getHelpSectionID(): string {
		return '#running_round'
	}
}
