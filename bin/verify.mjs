#!/usr/bin/env node
// Runs the repository's checks locally, replacing the CI workflows.
//
// `composer verify` covers everything the automatic `tests` workflow runs.
// `composer verify -- --browser` additionally runs the browser suites, which
// need the disposable fixtures and Playwright (see tests/Compatibility/README.md).
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const withBrowser = process.argv.includes('--browser')
const archiveDirectory = mkdtempSync(resolve(tmpdir(), 'daisy-verify-'))

const steps = [
    {
        name: 'validate',
        command: 'composer',
        args: ['validate', '--strict'],
    },
    {
        name: 'lint:workflows',
        command: 'node',
        args: ['bin/lint-workflows.mjs'],
    },
    {
        name: 'lint',
        command: './vendor/bin/pint',
        args: ['--test'],
    },
    {
        name: 'analyse',
        command: './vendor/bin/phpstan',
        args: ['analyse', '--no-progress'],
    },
    {
        name: 'test',
        command: './vendor/bin/pest',
        args: [],
    },
    {
        name: 'check:js',
        command: 'npm',
        args: ['run', '--silent', 'check:js'],
    },
    {
        name: 'check:themes',
        command: 'npm',
        args: ['run', '--silent', 'check:themes'],
    },
    {
        name: 'audit:themes',
        command: 'node',
        args: ['bin/audit-themes.mjs'],
    },
    {
        name: 'archive',
        command: 'composer',
        args: [
            'archive',
            '--format=zip',
            `--dir=${archiveDirectory}`,
            '--file=themes',
            '--quiet',
        ],
    },
    {
        name: 'check:archive',
        command: 'python3',
        args: [
            'tests/Compatibility/check-archive.py',
            `${archiveDirectory}/themes.zip`,
        ],
    },
]

if (withBrowser) {
    const fixtures =
        process.env.COMPAT_FIXTURES || '/tmp/daisy-filament-milestone7'
    if (!existsSync(fixtures))
        console.error(
            `browser suites skipped: fixtures not found at ${fixtures}. See tests/Compatibility/README.md.`,
        )
    else
        steps.push({
            name: 'browser',
            command: 'node',
            args: ['tests/Compatibility/release.mjs'],
            timeout: 30 * 60_000,
        })
}

const results = []
for (const step of steps) {
    process.stdout.write(`${step.name.padEnd(14)} … `)
    const timeout = step.timeout ?? 10 * 60_000
    try {
        execFileSync(step.command, step.args, {
            cwd: root,
            stdio: ['ignore', 'pipe', 'pipe'],
            // A step that hangs would otherwise block the whole run forever,
            // which a Playwright script that never closes its browser does.
            timeout,
        })
        results.push({ name: step.name, ok: true })
        console.log('PASS')
    } catch (error) {
        const timedOut = error.code === 'ETIMEDOUT'
        results.push({ name: step.name, ok: false })
        console.log(timedOut ? 'TIMEOUT' : 'FAIL')
        const output = `${error.stdout || ''}${error.stderr || ''}`.trim()
        if (output) console.log(output.split('\n').slice(-25).join('\n'))
        if (timedOut)
            console.log(
                `killed after ${Math.round(timeout / 1000)}s: a hanging step usually means a runaway background process or a browser that is never closed.`,
            )
    }
}

const failed = results.filter((result) => !result.ok)
console.log(
    `\n${results.length - failed.length}/${results.length} checks passed${withBrowser ? '' : ' (run with -- --browser for the browser suites)'}`,
)
process.exitCode = failed.length ? 1 : 0
