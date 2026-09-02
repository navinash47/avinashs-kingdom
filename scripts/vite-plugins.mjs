import { handleOrchestratorRequest } from './lib/orchestrator-handlers.mjs'
import { createEmbedProxyMiddleware } from './lib/embed-proxy.mjs'

export function orchestratorApiPlugin() {
  return {
    name: 'kingdom-orchestrator-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) return next()
        void handleOrchestratorRequest(req, res).then((handled) => {
          if (!handled) next()
        })
      })
    },
  }
}

export function embedProxyPlugin() {
  const proxy = createEmbedProxyMiddleware()
  return {
    name: 'embed-proxy',
    configureServer(server) {
      server.middlewares.use(proxy)
    },
  }
}
