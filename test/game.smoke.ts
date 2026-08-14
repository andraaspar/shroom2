// Headless full-match smoke test for the ported game logic.
// Run: npx tsx test/game.smoke.ts
import { Game } from '../src/game/Game.ts'
import { noopGameUI } from '../src/game/GameUI.ts'
import { FrameCommands } from '../src/game/FrameCommands.ts'
import { MessageBus, type ToUI } from '../src/game/events.ts'
import { GameRound } from '../src/game/rounds/GameRound.ts'
import { MoveRound } from '../src/game/rounds/MoveRound.ts'
import { ShootRound } from '../src/game/rounds/ShootRound.ts'
import { Team } from '../src/game/Team.ts'
import { TeamMember } from '../src/game/TeamMember.ts'
import { WorldObject } from '../src/game/WorldObject.ts'

function assert(condition: boolean, message: string): void {
	if (!condition) {
		console.error(`FAIL: ${message}`)
		process.exit(1)
	}
	console.log(`ok: ${message}`)
}

// --- Build a game: 2 teams x 2 members, generated level, headless UI. ---
const toUI = new MessageBus<ToUI>()
const game = new Game(toUI, noopGameUI)

// CREATED -> SETUP
game.commands = new FrameCommands()
game.execute()
assert(game.state === Game.STATE_SETUP, 'game reaches SETUP')

// Keep only 2 teams (the constructor creates 5) via the public command path,
// exactly as the real UI pushes removeTeamRequested (id included).
let trimGuard = 100
while (game.teams.length > 2 && trimGuard-- > 0) {
	game.commands = new FrameCommands()
	game.commands.removeTeamRequested = true
	game.commands.removeTeamRequestedID = game.teams.length - 1
	game.execute()
	toUI.clear()
}
assert(game.teams.length === 2, 'trimmed to 2 teams')

// 2 members per team.
game.commands = new FrameCommands()
game.commands.membersPerTeam = 2
game.execute()
assert(game.membersPerTeam === 2, 'membersPerTeam set to 2')

// Both teams human-controlled for deterministic scripting.
for (const team of game.teams) {
	team.controller = Team.CONTROLLER_HUMAN
}

// --- Start the game: SETUP -> LOADING -> (placement) -> SETTLE ---
game.commands = new FrameCommands()
game.commands.gameStartRequested = true
game.execute()
assert(game.state === Game.STATE_LOADING || game.state === Game.STATE_SETTLE, 'gameStartRequested leaves SETUP')

let guard = 10000
while (game.state === Game.STATE_LOADING && guard-- > 0) {
	game.commands = new FrameCommands()
	game.execute()
}
assert(game.state === Game.STATE_SETTLE, 'placement finishes, game reaches SETTLE')
assert(game.teams.every((t) => t.members.length === 2), 'each team has 2 members')

const terrain = game.world.terrain!
assert(terrain != null, 'terrain exists')

// All members placed on terrain (standing on a floor).
for (const team of game.teams) {
	for (const member of team.members) {
		assert(member.location.y > 0 && member.location.y < terrain.height, `member ${member.id} placed in bounds`)
	}
}

// Let members settle (they may fall a bit onto the terrain).
guard = 10000
while (!game.world.checkIfSleeping() && guard-- > 0) {
	game.commands = new FrameCommands()
	game.execute()
}
assert(game.world.checkIfSleeping(), 'world sleeps after placement settle')

// --- SETTLE -> ROUNDS ---
game.commands = new FrameCommands()
game.commands.endTurnRequested = true
game.execute()
assert(game.state === Game.STATE_ROUNDS, 'endTurnRequested in SETTLE starts ROUNDS')
assert(game.currentRound != null, 'a current round exists')

// --- Drive rounds until the game is over. ---
let sawMoveRound = false
let sawShootRound = false
let shotExploded = false
let solidPixelsBefore = countSolidPixels()
let damageDealt = false

const initialTotalHealth = totalHealth()

guard = 200000
while (game.state !== Game.STATE_OVER && guard-- > 0) {
	const round = game.currentRound!

	if (round instanceof MoveRound) sawMoveRound = true
	if (round instanceof ShootRound) sawShootRound = true

	// Script per-frame commands based on round state.
	game.commands = new FrameCommands()
	const c = game.commands

	if (round.state === MoveRound.STATE_MOVE || round.state === 2) {
		// Walk right briefly, then end the turn.
		if (Math.random() < 0.3) c.rightStartRequested = true
		if (Math.random() < 0.1) c.rightStopRequested = true
		if (Math.random() < 0.05) c.endTurnRequested = true
	}

	if (round instanceof ShootRound) {
		if (round.state === ShootRound.STATE_AIM) {
			// Aim up-ish, power to ~0.7, then finish aiming.
			const member = round.selectedTeam?.selectedMember
			if (member) {
				c.newAim = -Math.PI / 3
				c.newFacing = 1
				c.newPowerMultiplier = 0.7
				c.endTurnRequested = true
			}
		} else if (round.state === ShootRound.STATE_WAIT) {
			c.endTurnRequested = true
		}
	}

	const shotsBefore = game.world.objects.filter((o) => o !== null && o.constructor.name !== 'TeamMember').length

	game.execute()
	toUI.clear()

	const shotsAfter = game.world.objects.filter((o) => o.constructor.name !== 'TeamMember').length
	if (shotsAfter > shotsBefore) {
		// A shot is in flight; fast-forward until the world sleeps again.
		let settleGuard = 20000
		while (!game.world.checkIfSleeping() && game.state === Game.STATE_ROUNDS && settleGuard-- > 0) {
			game.commands = new FrameCommands()
			game.execute()
			toUI.clear()
		}
		if (countSolidPixels() < solidPixelsBefore) {
			shotExploded = true
			solidPixelsBefore = countSolidPixels()
		}
		if (totalHealth() < initialTotalHealth) damageDealt = true
	}
}

assert(game.state === Game.STATE_OVER, 'game reaches OVER')
assert(sawMoveRound, 'a move round occurred')
assert(sawShootRound, 'a shoot round occurred')
assert(shotExploded, 'a shot exploded and punched a hole in the terrain')
assert(damageDealt, 'damage was dealt')

const aliveTeams = game.teams.filter((t) => t.checkIfAlive())
assert(aliveTeams.length <= 1, 'at most one team remains alive')

// --- spawnNew produces a fresh playable game. ---
const fresh = game.spawnNew()
fresh.commands = new FrameCommands()
fresh.execute()
assert(fresh.state === Game.STATE_SETUP, 'spawnNew game reaches SETUP')
assert(fresh.teams.length === game.teams.length, 'spawnNew keeps team count')

console.log('\nAll game smoke tests passed.')

function countSolidPixels(): number {
	let count = 0
	const data = game.world.terrain!.data
	for (let i = 0; i < data.length; i++) {
		if (data[i]! >= 128) count++
	}
	return count
}

function totalHealth(): number {
	let health = 0
	for (const team of game.teams) {
		health += team.getHealth()
	}
	return health
}
