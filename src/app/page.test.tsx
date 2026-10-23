import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import Home from './page'

test('the home page is titled in French', () => {
  expect(renderToStaticMarkup(<Home />)).toContain('<h1>Panel d’administration de Shor</h1>')
})
