import { timestamp } from "drizzle-orm/mysql-core"
import { numeric, sqliteTable, integer, text, index, uniqueIndex, blob } from "drizzle-orm/sqlite-core"
import { number } from "zod"
import { Many, relations, sql } from "drizzle-orm"
import { boolean } from "drizzle-orm/gel-core"

export const userTable = sqliteTable("users", {
    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    name: text("name", { length: 20 }).notNull(),
    avatarUrl: text("avatarUrl"),
    bannerUrl: text("bannerUrl"),
    username: text("username", { length: 20 }).notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    otpSecret: text("otpSecret").unique(),
    twofaEnabled: integer({ mode:'boolean'})

}, (table) => {

    return {
        passwordIdx: index("password_idx").on(table.password),
        emailIdx: uniqueIndex("email_idx").on(table.email),
    }
}

)
export const followersTable = sqliteTable("followers", {

    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    follower: integer("follower").notNull(),
    followedId: integer("followerId").references(() => userTable.id),
}, (table) => {

    return {
        followerIdx: index("follower_idx").on(table.follower),
        followedIdIdx: index("followerId_idx").on(table.followedId),
    }
}

)


export const followingTable = sqliteTable("following", {

    id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
    following: integer("following").notNull(),
    followingId: integer("followingId").references(() => userTable.id),

}, (table) => {

    return {
        followingIdx: index("following_idx").on(table.following),
        followingIdIdx: index("followingId_idx").on(table.followingId),
    }
})

export const petTable = sqliteTable("pets", {

    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name", { length: 20 }).notNull(),
    breed: text("breed"),
    age: integer("age"),


})

export const meepTable = sqliteTable("meeps", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title", { length: 30 }).notNull(),
    body: text("body", { length: 400 }).notNull(),
    creatorId: integer("creatorId").notNull().references(() => userTable.id),
    creationTime: integer({ mode: 'timestamp' }).notNull().default(sql`(current_timestamp)`)

})
export const meepImgTable = sqliteTable("meepsImgs", {
id:integer("id").primaryKey({autoIncrement:true}),
imageText:text("imageText").notNull(),
imageUrl:text("imageUrl"),
body: text("body", { length: 400 }).notNull(),
creatorId: integer("creatorId").notNull().references(() => userTable.id),
creationTime: integer({ mode: 'timestamp' }).notNull().default(sql`(current_timestamp)`)


})
export const likeTable = sqliteTable("likes", {

id:integer("id").primaryKey({autoIncrement: true}),
meepId:integer("meepImgId").notNull().references(()=>meepImgTable.id),
userId:integer("userId").notNull().references(()=>userTable.id),
})
export const likeCommentTable = sqliteTable("commentLikes",{
    id:integer("id").primaryKey({autoIncrement:true}),
    commentId:integer("comment").notNull().references(()=>commentTable.id),
    userId:integer("userId").notNull().references(()=>userTable.id),
})

export const commentTable = sqliteTable("comments",{
id:integer("id").primaryKey({autoIncrement: true}),
imageText:text("imageText").notNull(),
imageUrl:text("imageUrl"),
body: text("body", { length: 400 }).notNull(),
creatorId: integer("creatorId").notNull().references(() => userTable.id),
meepId: integer("meepId").notNull().references(() => meepImgTable.id),


})
export const notificationTable = sqliteTable("notification", {

id:integer("id").primaryKey({autoIncrement: true}),
sendUserId:integer("sendUserId").notNull().references(()=>userTable.id),
recieveUserId:integer("recieveUserId").notNull().references(()=>userTable.id),
action: text("action").notNull(),
creationTime: integer({ mode: 'timestamp' }).notNull().default(sql`(current_timestamp)`)

})
export const chatTable = sqliteTable("chat",{
    id: integer("id").primaryKey({autoIncrement: true}),
    topic: integer("topic").notNull(),
    userId: integer("userId").notNull().references(()=>userTable.id),
    message: text("message").notNull(),
    messageTime: integer({mode:'timestamp'}).notNull().default(sql`(current_timestamp)`)



})

export type MeepImg = typeof  meepImgTable.$inferSelect;

export type InsertMeepImg = typeof  meepImgTable.$inferInsert;