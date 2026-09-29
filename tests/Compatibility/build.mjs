import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'

const fixtures = resolve(process.argv[2] || '/tmp/daisy-filament-milestone1')
const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
execFileSync('node', [`${root}/bin/build-themes.mjs`], { stdio: 'inherit' })
// Optional host demo: only the badge module, no daisyUI base modules or preflight.
writeFileSync(
    `${fixtures}/badge.css`,
    `@layer theme, base, components, utilities;\n@import 'tailwindcss/theme.css' layer(theme);\n@import 'tailwindcss/utilities.css' layer(utilities) source(none);\n@plugin 'daisyui' { themes: false; include: badge; logs: false; }\n@source inline('badge badge-info');\n`,
)
execFileSync(
    `${fixtures}/node_modules/.bin/tailwindcss`,
    [
        '-i',
        `${fixtures}/badge.css`,
        '-o',
        `${fixtures}/badge-compiled.css`,
        '--minify',
    ],
    { stdio: 'inherit' },
)
for (const major of [4, 5]) {
    const output = `${fixtures}/filament${major}/public/compatibility`
    mkdirSync(output, { recursive: true })
    copyFileSync(`${root}/resources/dist/themes.css`, `${output}/tokens.css`)
    copyFileSync(`${root}/resources/dist/adapter.css`, `${output}/adapter.css`)
    copyFileSync(`${fixtures}/badge-compiled.css`, `${output}/badge.css`)
    // A real host custom theme, compiled independently against each installed Filament.
    const input = `${fixtures}/filament${major}/resources/css/compatibility.css`
    mkdirSync(dirname(input), { recursive: true })
    writeFileSync(
        input,
        `@import '../../vendor/filament/filament/resources/css/theme.css';\n@source '${here}';\n:root .fi-body { --topbar-height: 4.5rem; }\n`,
    )
    execFileSync(
        `${fixtures}/node_modules/.bin/tailwindcss`,
        ['-i', input, '-o', `${output}/host.css`, '--minify'],
        { stdio: 'inherit' },
    )
}
