import { Hono } from "hono";
import { z } from "zod"
import { db } from "../src/main";
import { chatTable } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { Topic } from "@mui/icons-material";
import { d } from "drizzle-kit/index-BAUrj6Ib";
const chatSchema = z.object({
    id: z.number(),
    topic: z.number(),
    userId: z.number(),
    message: z.string()
})

export const chatRoutes = new Hono()
    .get("/getchat/:uid", async (c) => {

    const topic = +c.req.param("uid");

        const chat = await db.select().from(chatTable).where(eq(chatTable.topic,topic)).orderBy(chatTable.messageTime)
        console.log(chat)



        return c.json({ chat:chat })
    })
    .post("/insertchat", async (c) => {

        const data = await c.req.json()
        const messages = data.data
        const topic = data.topic
        try {
        const insertchat = await db.insert(chatTable).values({
            topic: topic,
            userId: messages.userId,
            message: messages.text
        })
    }catch(err){
        console.log(err)

    }
        
        return c.json({ message: "success" })
    })