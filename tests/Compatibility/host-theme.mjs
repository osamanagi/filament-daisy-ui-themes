import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, symlinkSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
const fixtures = resolve(
    process.env.COMPAT_FIXTURES || '/tmp/daisy-filament-milestone6',
)
const tooling = resolve(
    process.env.TAILWIND_DIR || '/tmp/daisy-m6-tailwind-floor',
)
for (const major of [4, 5]) {
    const app = `${fixtures}/filament${major}`
    mkdirSync(`${app}/public/compatibility`, { recursive: true })
    writeFileSync(
        `${app}/resources/css/compatibility.css`,
        `@import '../../vendor/filament/filament/resources/css/theme.css';\n@source '${resolve('tests/Compatibility')}';\n:root .fi-body { --topbar-height: 4.5rem; }\n`,
    )
    // Resolve Tailwind from the host's CSS import tree during this build only.
    symlinkSync(`${tooling}/node_modules`, `${app}/node_modules`, 'dir')
    try {
        execFileSync(
            `${tooling}/node_modules/.bin/tailwindcss`,
            [
                '-i',
                `${app}/resources/css/compatibility.css`,
                '-o',
                `${app}/public/compatibility/host.css`,
                '--minify',
            ],
            { stdio: 'inherit' },
        )
    } finally {
        unlinkSync(`${app}/node_modules`)
    }
}
