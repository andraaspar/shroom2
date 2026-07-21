// Headless smoke test for the ported physics. Run: npx tsx test/sim.smoke.ts
import { Gravity } from '../src/game/Gravity.ts'
import { Terrain } from '../src/game/Terrain.ts'
import { World } from '../src/game/World.ts'
import { WorldObject } from '../src/game/WorldObject.ts'

function assert(condition: boolean, message: string): void {
	if (!condition) {
		console.error(`FAIL: ${message}`)
		process.exit(1)
	}
	console.log(`ok: ${message}`)
}

// Flat terrain, floor at y=700.
const world = new World()
world.forces.push(new Gravity())
const terrain = new Terrain(2000, 1000)
for (let x = 0; x < terrain.width; x++) {
	for (let y = 700; y < terrain.height; y++) {
		terrain.set(x, y, true)
	}
}
world.terrain = terrain

const ball = new WorldObject(world)
ball.name = 'Test ball'
ball.health = 100
ball.calculateHitSets()
ball.location.x = 1000
ball.location.y = 100
world.addWorldObject(ball)

// Simulate 10 seconds (250 steps of 0.04s).
for (let i = 0; i < 250; i++) {
	world.execute()
}

assert(ball.hasBeenNotified, 'ball was notified')
assert(!ball.hasBeenFlying, 'ball landed (hasBeenFlying = false)')
const expectedY = 700 - ball.radius
assert(
	Math.abs(ball.location.y - expectedY) < 2,
	`ball rests on the surface (y=${ball.location.y.toFixed(2)}, expected ~${expectedY})`,
)
assert(Math.abs(ball.velocity.x) < 1 && Math.abs(ball.velocity.y) < 1, 'ball is at rest')
assert(world.checkIfSleeping(), 'world is sleeping')
// Fall from y=100 to y=700: impact speed ~693 > damageResistance 500, so the
// original takes (693-500)/6 ~ 32 damage too. This asserts faithful behavior.
assert(ball.health < 100 && ball.health > 50, `ball took fall damage like the original (health=${ball.health.toFixed(1)})`)

// Second scenario: walking.
const walker = new WorldObject(world)
walker.name = 'Walker'
walker.health = 100
walker.calculateHitSets()
walker.location.x = 500
walker.location.y = 700 - walker.radius
walker.hasBeenFlying = false
walker.startWalking(1)
world.addWorldObject(walker)

const startX = walker.location.x
for (let i = 0; i < 25; i++) {
	world.execute()
}

assert(walker.location.x > startX + 50, `walker moved right (x=${walker.location.x.toFixed(2)} from ${startX})`)
assert(Math.abs(walker.location.y - (700 - walker.radius)) < 2, 'walker stays on the surface')
assert(walker.stamina < 1, `walking burns stamina (stamina=${walker.stamina.toFixed(3)})`)

console.log('\nAll smoke tests passed.')
