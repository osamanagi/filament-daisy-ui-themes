import { spawn } from 'node:child_process'
import {
    mkdirSync,
    createWriteStream,
    writeFileSync,
    readFileSync,
} from 'node:fs'
import { resolve } from 'node:path'
const output = resolve(
    process.env.COMPAT_OUTPUT || 'docs/compatibility/milestone6/stock',
)
const browsers = (
    process.env.COMPAT_BROWSERS || 'chromium,firefox,webkit'
).split(',')
const suites = (
    process.env.COMPAT_SUITES || 'state-paint,switcher,state,visual'
).split(',')
// Suites are independent, so they run concurrently instead of one after the
// other: serially they took 794s a lane, and the lane is the whole job's wall
// clock. `visual` is the expensive one (512s, because it renders both Filament
// majors in a single process), so its majors are split into sibling processes.
// Splitting inside the lane rather than into more jobs keeps the ~100s fixture
// install un-duplicated, and this account queues jobs past ~17 concurrent, so
// more jobs would cost wall clock rather than save it.
const shards = {
    visual: [
        { name: 'visual-4', M2_MAJOR: '4' },
        { name: 'visual-5', M2_MAJOR: '5' },
    ],
}

// Two vCPUs plus a single-threaded PHP server per fixture: running all five
// processes at once would trade wall clock for timeouts. Overridable so the
// trade-off can be measured rather than guessed.
const concurrency = Number(process.env.COMPAT_CONCURRENCY || 3)

// Approximate relative cost, used to start the expensive work first. A bounded
// pool that begins with the cheapest suite finishes on the longest one.
const weights = { visual: 4, state: 3, switcher: 2, 'state-paint': 1 }

const run = (browser, directory, suite, shard) =>
    new Promise((settled) => {
        const name = shard?.name ?? suite
        const log = createWriteStream(`${directory}/${name}.log`)
        const child = spawn(
            process.execPath,
            [`tests/Compatibility/${suite}.mjs`],
            {
                env: {
                    ...process.env,
                    ...(shard ? { M2_MAJOR: shard.M2_MAJOR } : {}),
                    COMPAT_BROWSER: browser,
                    COMPAT_OUTPUT: directory,
                    COMPAT_FIXTURES:
                        process.env.COMPAT_FIXTURES ||
                        '/tmp/daisy-filament-milestone6',
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            },
        )
        child.stdout.pipe(log, { end: false })
        child.stderr.pipe(log, { end: false })
        child.on('exit', async (code) => {
            await new Promise((close) => log.end(close))
            settled({ browser, suite: name, exitCode: code })
        })
    })

const results = []
await Promise.all(
    browsers.map(async (browser) => {
        const directory = `${output}/${browser}`
        mkdirSync(directory, { recursive: true })
        const queue = suites
            .flatMap((suite) =>
                (shards[suite] ?? [null]).map((shard) => ({ suite, shard })),
            )
            .sort((a, b) => (weights[b.suite] ?? 0) - (weights[a.suite] ?? 0))
            .map(
                ({ suite, shard }) =>
                    () =>
                        run(browser, directory, suite, shard),
            )
        const outcomes = []
        await Promise.all(
            Array.from(
                { length: Math.min(concurrency, queue.length) },
                async () => {
                    for (let task; (task = queue.shift());)
                        outcomes.push(await task())
                },
            ),
        )
        results.push(...outcomes)
        for (const { suite, exitCode } of outcomes) {
            console.log(
                `${browser}/${suite}: ${exitCode === 0 ? 'PASS' : 'FAIL (see log)'}`,
            )
            if (exitCode !== 0) {
                process.exitCode = 1
                console.error(readFileSync(`${directory}/${suite}.log`, 'utf8'))
            }
        }
    }),
)
writeFileSync(`${output}/run.json`, JSON.stringify(results, null, 2))
