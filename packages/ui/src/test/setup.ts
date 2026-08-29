import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * jsdom has no layout, and so no ResizeObserver. The charting library behind
 * `components/Chart` measures its container with one, so without this a
 * component holding a chart cannot render here at all. A stub that never
 * reports a size is enough: a chart is asserted on through the data table it
 * renders beside itself, never through its SVG.
 */
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver ??= ResizeObserverStub

afterEach(() => {
  cleanup()
})
