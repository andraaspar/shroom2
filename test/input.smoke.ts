// Headless input-layer assertions: Regressions 2-4.
// Run: npx tsx test/input.smoke.ts
import { CharacterAppearance } from '../src/game/CharacterAppearance.ts'
import { FrameCommands } from '../src/game/FrameCommands.ts'
import { MessageBus, type ToProgram } from '../src/game/events.ts'
import { Point } from '../src/game/geom/Point.ts'
import { Team } from '../src/game/Team.ts'
import { TeamMember } from '../src/game/TeamMember.ts'
import { World } from '../src/game/World.ts'
import { Camera } from '../src/render/Camera.ts'
import { WorldInteraction } from '../src/ui/WorldInteraction.ts'

function assert(condition: boolean, message: string): void {
	if (!condition) {
		console.error(`FAIL: ${message}`)
		process.exit(1)
	}
	console.log(`ok: ${message}`)
}

// Identity camera: world coords == screen coords (scale 1, viewport 0, center 0).
const camera = new Camera()
camera.viewportWidth = 0
camera.viewportHeight = 0
camera.scale = 1
camera.center.x = 0
camera.center.y = 0

const world = new World()
const team = new Team()
team.isSelected = true
team.controller = Team.CONTROLLER_HUMAN
team.characterAppearance = new CharacterAppearance(
	{
		characterID: 0,
		characterName: 'Test',
		type: 0,
		animationAssetID: 1,
		colorAssetID: 2,
		inWaterSoundAssetID: 3,
		hitSoundAssetID: 4,
	},
	0xff0000,
	0,
)
const member = new TeamMember(world, team)
member.location.x = 1000
member.location.y = 500
world.addWorldObject(member)

const interaction = new WorldInteraction()
const bus = new MessageBus<ToProgram>()

function drain(): ToProgram[] {
	const messages: ToProgram[] = []
	bus.drain((m) => messages.push(m))
	return messages
}

// --- Regression 2: crosshairMove pushes a [0,1] power, never NaN. ---
interaction.crosshairMove(new Point(1100, 500), camera, bus, member)
const aimMessages = drain()
const powerMessage = aimMessages.find((m) => m.type === 'newPowerMultiplier')
assert(powerMessage !== undefined, 'crosshairMove pushes newPowerMultiplier with newAim')
assert(aimMessages.some((m) => m.type === 'newAim'), 'crosshairMove pushes newAim')

// Apply exactly as ShootRound.STATE_AIM does.
const commands = new FrameCommands()
for (const m of aimMessages) commands.apply(m)
if (!isNaN(commands.newAim)) {
	member.aim = commands.newAim
	member.facing = commands.newFacing
	if (!isNaN(commands.newPowerMultiplier)) member.powerMultiplier = commands.newPowerMultiplier
}
assert(Number.isNaN(member.powerMultiplier) === false, 'powerMultiplier is not NaN after crosshairMove')
assert(member.powerMultiplier >= 0 && member.powerMultiplier <= 1, `powerMultiplier in [0,1] (got ${member.powerMultiplier})`)

// Close cursor -> low power; far cursor -> power 1.
interaction.crosshairMove(new Point(1010, 500), camera, bus, member)
const closePower = drain().find((m) => m.type === 'newPowerMultiplier')
assert(closePower !== undefined && closePower.value >= 0 && closePower.value < 0.5, 'small drag gives low power')
interaction.crosshairMove(new Point(1200, 500), camera, bus, member)
const farPower = drain().find((m) => m.type === 'newPowerMultiplier')
assert(farPower !== undefined && farPower.value === 1, 'far drag gives full power')

// fire() builds a shot with finite velocity once power is real.
member.powerMultiplier = 0.7
member.aim = -Math.PI / 4
member.facing = 1
const shot = member.fire()
assert(shot != null, 'fire() returns a shot')
assert(
	Number.isFinite(shot!.velocity.x) && Number.isFinite(shot!.velocity.y),
	`shot velocity is finite (${shot!.velocity.x}, ${shot!.velocity.y})`,
)

// --- Regression 3: walkDragMove pushes a [0,1] speed multiplier. ---
interaction.walkDragStart(new Point(1000, 500), camera, world)
interaction.walkDragMove(new Point(1030, 500), camera, bus)
const speedMsg = drain().find((m) => m.type === 'newWalkingSpeedMultiplier')
assert(speedMsg !== undefined, 'walkDragMove pushes newWalkingSpeedMultiplier')
assert(
	speedMsg!.value >= 0 && speedMsg!.value <= 1,
	`newWalkingSpeedMultiplier in [0,1] (got ${speedMsg!.value})`,
)
// Slow the member down to check the multiplier is applied as a fraction, not an
// absolute speed: the x150 regression would put walkingSpeed far past maxWalkingSpeed.
if (speedMsg) member.setSpeedMultiplier(speedMsg.value)
assert(
	member.walkingSpeed <= member.maxWalkingSpeed + 1,
	`walkingSpeed stays within maxWalkingSpeed (${member.walkingSpeed.toFixed(1)} <= ${member.maxWalkingSpeed})`,
)

// --- Regression 4: shunpo option hit-test uses member.location + offset. ---
member.location.x = 1000
member.location.y = 500
const options = [new Point(-100, -100), new Point(100, -100), new Point(100, 100), new Point(-100, 100)]
const got = interaction.hitTestShunpoOptionIndex(new Point(1100, 600), camera, options, member)
assert(got === 2, `shunpo click at member.location + options[2] returns 2 (got ${got})`)
assert(
	interaction.hitTestShunpoOptionIndex(new Point(2000, 2000), camera, options, member) === -1,
	'shunpo click far away returns -1',
)

console.log('\nAll input smoke tests passed.')