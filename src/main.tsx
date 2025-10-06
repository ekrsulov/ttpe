import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import { theme } from './theme'

// Conditionally expose test globals only in development environment
if (process.env.NODE_ENV === 'development') {
  import('./testing/testHelpers').then(({ exposeTestGlobals }) => exposeTestGlobals());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </StrictMode>,
)