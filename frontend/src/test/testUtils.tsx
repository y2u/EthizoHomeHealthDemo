import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createDemoDataset } from '../lib/demoData'

export function renderApp(ui: ReactElement, options?: RenderOptions) {
  return render(ui, options)
}

export function makeDataset() {
  return createDemoDataset()
}
