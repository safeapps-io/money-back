import { createProxyMiddleware } from 'http-proxy-middleware'

export const reportErrorProxy = createProxyMiddleware({
  target: 'https://catchjs.com',
  changeOrigin: true,
  pathRewrite: (_, req) => `/api/${req.params.path}?domain=money.safeapps.io`,
})
