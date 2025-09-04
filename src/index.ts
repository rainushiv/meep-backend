import { Hono } from 'hono'
import { ServerWebSocket, WebSocketServeOptions } from 'bun'
import { userRoutes } from '../routes/user-routes'
import { meepRoutes } from '../routes/meep-routes'
import { chatRoutes } from '../routes/chat-routes'
import { Client } from '@elastic/elasticsearch'
import { Query } from 'mysql2/typings/mysql/lib/protocol/sequences/Query'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import {createBunWebSocket}from 'hono/bun';
import { DataToSend, Message, MessageFormSchema } from '../shared/types'
import {zValidator} from "@hono/zod-validator"
import { FRONTEND_DEV_URL, publishActions } from '../shared/constants'



const messages:Message[] = []


const app = new Hono()

app.use('/api/*', cors())

app.use(
  '/api2/*',
  cors({
    origin: 'http://localhost:5173',
    allowHeaders: ['X-Custom-Header', 'Upgrade-Insecure-Requests','Authorization'],
    allowMethods: ['POST','DELETE','PUT', 'GET', 'OPTIONS'],
    exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
    maxAge: 600,
    credentials: true,
  })
)
app.get('/', (c) => {
  return c.text("I'm still brown :,(")
})
app.get("/healthz", (c) => c.text("ok"))


app.route("/api/users", userRoutes)
app.route("/api/chat", chatRoutes)
//app.use("/api/*",jwt({secret: "mimisecretkey"}))
app.route("/api/usermeeps", meepRoutes)

const server = Bun.serve<{topic:string}>({
  port:3001,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      const topic = getTopicFromReq(req);
      const success = server.upgrade(req, { data: { topic } });
      return success
        ? undefined
        : new Response("WebSocket upgrade error", { status: 400 });
    }

    return new Response("Hello world");
  },
  websocket: { 
  open(ws) {
      console.log("connected")
      const topic = ws.data.topic
      console.log(topic)
      ws.subscribe(topic);
    },
    message(ws, message) {
      // this is a group chat
      // so the server re-broadcasts incoming message to everyone
  const msg = JSON.parse(message.toString());
  console.log(msg)


      server.publish(ws.data.topic, `${msg.userId}: ${msg.text}`);
    },
    close(ws) {
      ws.unsubscribe(ws.data.topic);
    },
  },
});
const getTopicFromReq = (req: any) => {
          const url = new URL(req.url);
      const topic = url.searchParams.get("topic");

  return topic
}
console.log(`Listening on ${server.hostname}:${server.port}`);
export default app
