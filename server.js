/**
 * Minimal Next.js production server for hosts that require a single entry file
 * (e.g. SiteGround Node.js App Manager "Application startup file").
 *
 * Build first: `npm run build`
 * Start: `node server.js`
 */

require('./lib/env.server')
const http = require('http')
const next = require('next')

const port = parseInt(process.env.PORT || '3000', 10)
const hostname = process.env.HOSTNAME || '0.0.0.0'

const app = next({ dev: false, hostname, port })
const handle = app.getRequestHandler()

app
  .prepare()
  .then(() => {
    http
      .createServer((req, res) => handle(req, res))
      .listen(port, hostname, () => {
        // eslint-disable-next-line no-console
        console.log(`> Ready on http://${hostname}:${port}`)
      })
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err)
    process.exit(1)
  })

