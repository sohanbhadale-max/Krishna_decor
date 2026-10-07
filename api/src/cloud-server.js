import { createServer } from 'node:http'
import handler from '../[...path].js'

const port = Number(process.env.PORT || 10000)
const host = process.env.HOST || '0.0.0.0'

function requestUrl(request) {
  const protocol = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()
  const authority = request.headers.host || 'localhost'
  return protocol + '://' + authority + (request.url || '/')
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const method = incoming.method || 'GET'
    const hasBody = !['GET', 'HEAD'].includes(method)
    const request = new Request(requestUrl(incoming), {
      method,
      headers: incoming.headers,
      body: hasBody ? incoming : undefined,
      duplex: hasBody ? 'half' : undefined
    })
    const response = await handler.fetch(request)
    const headers = Object.fromEntries(response.headers)
    outgoing.writeHead(response.status, headers)
    outgoing.end(Buffer.from(await response.arrayBuffer()))
  } catch (error) {
    console.error('Cloud API request failed:', error)
    outgoing.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    outgoing.end(JSON.stringify({ error: 'The server could not complete this request.' }))
  }
})

server.listen(port, host, () => {
  console.log('Krishna Decor cloud API listening on port ' + port)
})
