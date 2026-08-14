// Headless AI regression test: locks down Regression 1 — the AI aim generator
// must not deadlock on a stale command bag / intra-frame spinning.
// Run: npx tsx test/ai.smoke.ts
import { Game } from '../src/game/Game.ts'
import { noopGameUI } from '../src/game/GameUI.ts'
import { FrameCommands } from '../src/game/FrameCommands.ts'
import { MessageBus, type ToUI } from '../src/game/events.ts'
import { GameRound } from '../src/game/rounds/GameRound.ts'
import { DoubleMoveRound } from '../src/game/rounds/DoubleMoveRound.ts'
import { MoonwalkRound } from '../src/game/rounds/MoonwalkRound.ts'
import { MoveRound } from '../src/game/rounds/MoveRound.ts'
import { ShootRound } from '../src/game/rounds/ShootRound.ts'
import { ShunpoRound } from '../src/game/rounds/ShunpoRound.ts'
import { DawnRound } from '../src/game/rounds/DawnRound.ts'
import { DoughnutRound } from '../src/game/rounds/DoughnutRound.ts'
import { TeslaRound } from '../src/game/rounds/TeslaRound.ts'
import { Team } from '../src/game/Team.ts'

// Deterministic RNG so the match outcome is reproducible in CI: a seeded
// match that passes once passes always, and runs in bounded time.
function mulberry32(a: number) {
	return function () {
		let t = (a += 0x6d2b79f5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}
Math.random = mulberry32(20240814)

function assert(condition: boolean, message: string): void {
	if (!condition) {
		console.error(`FAIL: ${message}`)
		process.exit(1)
	}
	console.log(`ok: ${message}`)
}

// --- Build a 2-team all-AI game forced into ShootRound rounds. ---
const toUI = new MessageBus<ToUI>()
const game = new Game(toUI, noopGameUI)

game.commands = new FrameCommands()
game.execute()
assert(game.state === Game.STATE_SETUP, 'game reaches SETUP')

// Keep only 2 teams via the public command path.
let trimGuard = 100
while (game.teams.length > 2 && trimGuard-- > 0) {
	game.commands = new FrameCommands()
	game.commands.removeTeamRequested = true
	game.commands.removeTeamRequestedID = game.teams.length - 1
	game.execute()
	toUI.clear()
}
assert(game.teams.length === 2, 'trimmed to 2 teams')

// 2 members per team so the AI switches members mid-aim.
game.commands = new FrameCommands()
game.commands.membersPerTeam = 2
game.execute()
assert(game.membersPerTeam === 2, 'membersPerTeam set to 2')

// All-AI teams.
for (const team of game.teams) {
	team.controller = Team.CONTROLLER_AI
}

// Only ShootRound in the round pool: every round is a ShootRound.
for (const rc of [MoveRound, MoonwalkRound, DoubleMoveRound, ShunpoRound]) {
	game.setRoundWeight(rc, 0)
}
for (const rc of [DoughnutRound, TeslaRound, DawnRound]) {
	game.setRoundWeight(rc, 0)
}
game.setRoundWeight(ShootRound, 4)

// --- Start: SETUP -> LOADING -> SETTLE -> ROUNDS. ---
game.commands = new FrameCommands()
game.commands.gameStartRequested = true
game.execute()

let guard = 20000
while (game.state === Game.STATE_LOADING && guard-- > 0) {
	game.commands = new FrameCommands()
	game.execute()
}
assert(game.state === Game.STATE_SETTLE, 'placement finishes, game reaches SETTLE')

guard = 20000
while (!game.world.checkIfSleeping() && guard-- > 0) {
	game.commands = new FrameCommands()
	game.execute()
}
assert(game.world.checkIfSleeping(), 'world sleeps after placement settle')

game.commands = new FrameCommands()
game.commands.endTurnRequested = true
game.execute()
assert(game.state === Game.STATE_ROUNDS, 'endTurnRequested in SETTLE starts ROUNDS')

// --- Phase 1: the first ShootRound must enter STATE_AIM and reach
// STATE_ENDED within a bounded frame count (Regression 1 fails here by
// hanging in STATE_AIM forever). ---
let targetRound: ShootRound | null = null
let sawAim = false
let frames = 0
const AIM_CAP = 200000

while (game.state !== Game.STATE_OVER && frames < AIM_CAP) {
	const round = game.currentRound!
	const wasAim = round instanceof ShootRound && round.state === ShootRound.STATE_AIM
	const wasWait = round instanceof ShootRound && round.state === ShootRound.STATE_WAIT

	game.commands = new FrameCommands()
	// The real UI's NEXT ROUND button advances STATE_WAIT -> STATE_ENDED.
	if (wasWait) game.commands.endTurnRequested = true
	game.execute()
	toUI.clear()

	if (!targetRound && round instanceof ShootRound) targetRound = round
	if (targetRound === round) {
		if (wasAim) sawAim = true
		if (round.state === GameRound.STATE_ENDED || round.state === GameRound.STATE_GAME_OVER) break
	}
	frames++
}

	assert(targetRound != null, 'a ShootRound was current')
	assert(sawAim, 'the ShootRound entered STATE_AIM (AI aim ran)')
	assert(frames < AIM_CAP, `the ShootRound left AIM and reached STATE_ENDED within ${AIM_CAP} frames (took ${frames})`)
	assert(
		targetRound!.state === GameRound.STATE_ENDED || targetRound!.state === GameRound.STATE_GAME_OVER,
		`ShootRound.state is ${targetRound!.state} (not stuck in AIM)`,
	)

// --- Phase 2: run the full all-AI match to STATE_OVER. ---
const MATCH_CAP = 300000
while (game.state !== Game.STATE_OVER && frames < MATCH_CAP) {
	const round = game.currentRound!
	game.commands = new FrameCommands()
	if (round instanceof ShootRound && round.state === ShootRound.STATE_WAIT) {
		game.commands.endTurnRequested = true
	}
	game.execute()
	toUI.clear()
	frames++
}

assert(frames < MATCH_CAP, `full all-AI match reachable (${frames} frames)`)
assert(game.state === Game.STATE_OVER, 'full all-AI match reaches STATE_OVER')

console.log('\nAll AI smoke tests passed.')