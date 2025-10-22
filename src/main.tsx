import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import './index.css'
import App from './App.tsx'
import { theme } from './theme'
import { pluginManager } from './utils/pluginManager'
import { CORE_PLUGINS } from './plugins'
import { canvasStoreApi } from './store/canvasStore'

pluginManager.setStoreApi(canvasStoreApi)
CORE_PLUGINS.forEach((plugin) => {
  pluginManager.register(plugin)
})

// Conditionally expose test globals whenever we're not in production
if (process.env.NODE_ENV !== 'production') {
  import('./testing/testHelpers').then(({ exposeTestGlobals }) => exposeTestGlobals());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </StrictMode>,
)