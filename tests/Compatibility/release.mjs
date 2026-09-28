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
const results = []
await Promise.all(
    browsers.map(async (browser) => {
        const directory = `${output}/${browser}`
        mkdirSync(directory, { recursive: true })
        for (const suite of suites) {
            const log = createWriteStream(`${directory}/${suite}.log`)
            const child = spawn(
                process.execPath,
                [`tests/Compatibility/${suite}.mjs`],
                {
                    env: {
                        ...process.env,
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
            const code = await new Promise((resolve) =>
                child.on('exit', resolve),
            )
            await new Promise((resolve) => log.end(resolve))
            results.push({ browser, suite, exitCode: code })
            console.log(
                `${browser}/${suite}: ${code === 0 ? 'PASS' : 'FAIL (see log)'}`,
            )
            if (code !== 0) {
                process.exitCode = 1
                console.error(readFileSync(`${directory}/${suite}.log`, 'utf8'))
            }
        }
    }),
)
writeFileSync(`${output}/run.json`, JSON.stringify(results, null, 2))
