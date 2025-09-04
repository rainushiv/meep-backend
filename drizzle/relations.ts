import { relations } from "drizzle-orm/relations";
import { users, followers, following, meepsImgs, notification, likes, meeps } from "./schema";

export const followersRelations = relations(followers, ({one}) => ({
	user: one(users, {
		fields: [followers.followerId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	followers: many(followers),
	followings: many(following),
	meepsImgs: many(meepsImgs),
	notifications_recieveUserId: many(notification, {
		relationName: "notification_recieveUserId_users_id"
	}),
	notifications_sendUserId: many(notification, {
		relationName: "notification_sendUserId_users_id"
	}),
	likes: many(likes),
	meeps: many(meeps),
}));

export const followingRelations = relations(following, ({one}) => ({
	user: one(users, {
		fields: [following.followingId],
		references: [users.id]
	}),
}));

export const meepsImgsRelations = relations(meepsImgs, ({one}) => ({
	user: one(users, {
		fields: [meepsImgs.creatorId],
		references: [users.id]
	}),
}));

export const notificationRelations = relations(notification, ({one}) => ({
	user_recieveUserId: one(users, {
		fields: [notification.recieveUserId],
		references: [users.id],
		relationName: "notification_recieveUserId_users_id"
	}),
	user_sendUserId: one(users, {
		fields: [notification.sendUserId],
		references: [users.id],
		relationName: "notification_sendUserId_users_id"
	}),
}));

export const likesRelations = relations(likes, ({one}) => ({
	user: one(users, {
		fields: [likes.userId],
		references: [users.id]
	}),
	meep: one(meeps, {
		fields: [likes.meepId],
		references: [meeps.id]
	}),
}));

export const meepsRelations = relations(meeps, ({one, many}) => ({
	likes: many(likes),
	user: one(users, {
		fields: [meeps.creatorId],
		references: [users.id]
	}),
}));