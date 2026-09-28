import assert from 'node:assert/strict'
import { test } from 'node:test'
import { paintedFrames } from './measure.mjs'

test('checks the closest pre-paint sample and all subsequent samples', () => {
    const frames = [269, 277, 301, 325].map((time) => ({ time }))
    const paints = [{ time: 288 }, { time: 290 }]
    assert.deepEqual(paintedFrames(frames, paints), frames.slice(1))
    assert.equal(frames.length, 4) // Original diagnostic samples remain intact.
})

test('retains an incorrect sample at or after first paint', () => {
    const frames = [
        { time: 288, dark: true },
        { time: 301, dark: false },
    ]
    assert.deepEqual(paintedFrames(frames, [{ time: 288 }]), frames)
    assert.deepEqual(paintedFrames(frames, [{ time: 280 }]), frames)
})

test('cannot pass without paint data and a post-paint sample', () => {
    assert.throws(() => paintedFrames([], [{ time: 288 }]))
    assert.throws(() => paintedFrames([{ time: 301 }], []))
    assert.throws(() => paintedFrames([{ time: 269 }], [{ time: 288 }]))
})
