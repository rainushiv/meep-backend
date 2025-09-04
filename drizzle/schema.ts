import { sqliteTable, AnySQLiteColumn, index, foreignKey, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const followers = sqliteTable("followers", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	follower: integer().notNull(),
	followerId: integer().references(() => users.id),
},
(table) => [
	index("followerId_idx").on(table.followerId),
	index("follower_idx").on(table.follower),
]);

export const following = sqliteTable("following", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	following: integer().notNull(),
	followingId: integer().references(() => users.id),
},
(table) => [
	index("followingId_idx").on(table.followingId),
	index("following_idx").on(table.following),
]);

export const pets = sqliteTable("pets", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text({ length: 20 }).notNull(),
	breed: text(),
	age: integer(),
});

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	name: text({ length: 20 }).notNull(),
	username: text({ length: 20 }).notNull(),
	email: text().notNull(),
	password: text().notNull(),
	avatarUrl: text(),
},
(table) => [
	uniqueIndex("email_idx").on(table.email),
	index("password_idx").on(table.password),
	uniqueIndex("users_email_unique").on(table.email),
]);

export const meepsImgs = sqliteTable("meepsImgs", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	imageText: text().notNull(),
	imageUrl: text(),
	body: text({ length: 400 }).notNull(),
	creatorId: integer().notNull().references(() => users.id),
	creationTime: integer().default(sql`(current_timestamp)`).notNull(),
});

export const notification = sqliteTable("notification", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	sendUserId: integer().notNull().references(() => users.id),
	recieveUserId: integer().notNull().references(() => users.id),
	action: text().notNull(),
	creationTime: integer().default(sql`(current_timestamp)`).notNull(),
});

export const likes = sqliteTable("likes", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	meepId: integer().notNull().references(() => meeps.id),
	userId: integer().notNull().references(() => users.id),
});

export const meeps = sqliteTable("meeps", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	title: text({ length: 30 }).notNull(),
	body: text({ length: 400 }).notNull(),
	creatorId: integer().notNull().references(() => users.id),
	creationTime: integer().default(sql`(current_timestamp)`).notNull(),
});

