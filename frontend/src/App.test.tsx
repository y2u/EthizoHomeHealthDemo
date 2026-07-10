import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { renderApp } from './test/testUtils'

describe('App', () => {
  it('shows the login screen before opening the workspace', async () => {
    renderApp(<App />)

    expect(screen.getByRole('heading', { name: 'Sign in to Ethizo Home Health Care' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Patients' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Continue in demo mode' }))

    expect(await screen.findByRole('button', { name: 'Patients' })).toBeVisible()
  })
})
