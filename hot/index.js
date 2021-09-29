import paths from './paths'
import emit from './emit'

const express = require('express')
const expressWs = require('express-ws')
const fs = require('fs')

export default function Hot () {
  const app = express()
  expressWs(app)

  let ws = null
  app.ws("/hmr", function(_ws, req) {
    ws = _ws
    _ws.send('HMR listening!')
  })

  app.use(express.static(paths.appBuild))

  app.use('/', (_, res) => {
    const html = fs.readFileSync(paths.appIndex, {
      encoding: 'utf-8'
    })

    const els = html.split('</body>')
    els[0] += `  <script>(${emit.toString().replace(/[\r\n]/g, '')})(${'3000'})</script>` 
    res.send(els.join('</body>'))
  })

  /** 添加socket */
  setInterval(() => {
    if (ws && !ws.closed) {
      ws.send('HTR 123')
    }
  }, 1000);

  app.listen(3000, () => {
    console.log('listen at http://localhost:3000')
  })
  return {
    name: 'rollup-hot-reload-plugin',
    transform (source, id) {
      fs.writeFileSync('1.log', source, {
        encoding: 'utf-8'
      })
    }
  }
}