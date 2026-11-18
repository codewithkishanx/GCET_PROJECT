import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AlgorithmPage } from './algorithm-page'

function renderAlgorithm(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/algorithms/${slug}`]}>
      <Routes>
        <Route path="/algorithms/:slug" element={<AlgorithmPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AlgorithmPage', () => {
  it('renders an unknown slug as a clear empty state', () => {
    renderAlgorithm('not-a-real-algorithm')
    expect(screen.getByText('Algorithm not found')).toBeInTheDocument()
  })

  it('renders a sorting trace with controls and step copy', () => {
    renderAlgorithm('bubble-sort')
    expect(screen.getByRole('heading', { name: 'Bubble sort' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Visualisation' })).toBeInTheDocument()
    expect(screen.getByText('Compare neighbours and bubble the largest value to the right each pass.')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Timeline position' })).toBeInTheDocument()
    // Complexity is derived from the trace, not hard-coded on the page.
    expect(screen.getAllByText(/best O\(n\)/).length).toBeGreaterThan(0)
  })

  it('steps forward and backward through the trace', async () => {
    const user = userEvent.setup()
    renderAlgorithm('bubble-sort')

    expect(screen.getByText('step 1/', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('step 2/', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous step' }))
    expect(screen.getByText('step 1/', { exact: false })).toBeInTheDocument()
  })

  it('rejects invalid input without crashing the visualiser', async () => {
    const user = userEvent.setup()
    renderAlgorithm('bubble-sort')

    const values = screen.getByLabelText('Array values')
    await user.clear(values)
    await user.type(values, '1, 2, nope')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('"nope" is not a whole number.')).toBeInTheDocument()
    // The previous trace is still shown so the user does not lose context.
    expect(screen.getByRole('slider', { name: 'Timeline position' })).toBeInTheDocument()
  })

  it('applies a valid new input and regenerates the trace', async () => {
    const user = userEvent.setup()
    renderAlgorithm('bubble-sort')

    const values = screen.getByLabelText('Array values')
    await user.clear(values)
    await user.type(values, '3, 1, 2')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Compare neighbours and bubble the largest value to the right each pass.')).toBeInTheDocument()
    expect(screen.queryByText('"nope" is not a whole number.')).not.toBeInTheDocument()
  })

  it('renders the BST visualiser with an accessible image description', () => {
    renderAlgorithm('bst-search')
    expect(screen.getByRole('img', { name: /binary search tree with 9 nodes/i })).toBeInTheDocument()
  })

  it('renders the N-Queens board as a grid', () => {
    renderAlgorithm('n-queens')
    expect(screen.getByRole('grid', { name: /6 by 6 n-queens board/i })).toBeInTheDocument()
  })
})
