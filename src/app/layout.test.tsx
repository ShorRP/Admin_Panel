import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import RootLayout from './layout'

test('the root layout declares every page French', () => {
  expect(renderToStaticMarkup(<RootLayout><p /></RootLayout>)).toContain('<html lang="fr">')
})
