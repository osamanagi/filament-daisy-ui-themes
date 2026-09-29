#!/usr/bin/env node
// Guards the workflow files against two YAML authoring mistakes that parse
// "fine" in spec-compliant parsers but silently corrupt `run:` scripts on
// GitHub, where the script executes as a single line and fails confusingly:
//
//   1. A `run:` value written as a plain scalar over several lines. Plain
//      scalars fold, so the shell receives every command joined by spaces.
//   2. A comment after a block scalar indicator (`run: | # note`).
//
// `composer verify` runs this so the mistake is caught before CI.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workflows = join(root, '.github', 'workflows')

const blockIndicator = /^[|>]/
const indicatorWithComment = /^[|>][-+0-9]*\s+#/

/** Collect the more-indented lines that make up a block-style value. */
function block(lines, start, indent) {
    const body = []
    for (let index = start + 1; index < lines.length; index += 1) {
        const text = lines[index]
        if (text.trim() === '') continue
        if (text.length - text.trimStart().length <= indent) break
        body.push({ number: index + 1, text: text.trim() })
    }
    return body
}

function inspect(source) {
    const problems = []
    const lines = source.split('\n')

    lines.forEach((line, index) => {
        const match = /^(\s*)run:(\s*)(\S.*)?$/.exec(line)
        if (!match) return

        const [, indentation, , value] = match

        if (value === undefined) {
            // The value sits on the following, more-indented lines.
            const body = block(lines, index, indentation.length)
            const head = body[0]?.text ?? ''
            if (blockIndicator.test(head)) {
                if (indicatorWithComment.test(head))
                    problems.push({
                        number: body[0].number,
                        message:
                            'block scalar indicator carries a trailing comment',
                    })
                return
            }
            if (body.length > 1)
                problems.push({
                    number: index + 1,
                    message:
                        'plain scalar spans several lines; YAML folds it into one line',
                })
            return
        }

        if (indicatorWithComment.test(value))
            problems.push({
                number: index + 1,
                message: 'block scalar indicator carries a trailing comment',
            })
    })

    return problems
}

const files = readdirSync(workflows)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort()

let failures = 0

for (const name of files) {
    const path = join(workflows, name)
    for (const problem of inspect(readFileSync(path, 'utf8'))) {
        failures += 1
        console.error(
            `${relative(root, path)}:${problem.number}: ${problem.message}`,
        )
    }
}

if (failures > 0) {
    console.error(`\n${failures} workflow YAML problem(s)`)
    process.exit(1)
}

console.log(`workflows: ${files.length} files use explicit block scalars`)
