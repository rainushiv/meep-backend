import { Hono } from "hono";
import { z } from "zod";
import {
  followersTable,
  userTable,
  followingTable,
  notificationTable,
} from "../src/db/schema";
import { db } from "../src/main";
import { eq, and, like } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { Client, HttpConnection, errors } from "@elastic/elasticsearch";
import { SearchResponse } from "@elastic/elasticsearch/lib/api/types";
import { DatabaseService } from "../src/services/db";
import { IndexingService } from "../src/services/elastic-search";
import { MeepDatabaseService } from "../src/services/meepdb";
import { authenticator } from "otplib";
import * as qrcode from 'qrcode';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { d } from "drizzle-kit/index-BAUrj6Ib";
import { jwt, sign } from "hono/jwt";
import { tokenClaims } from "@kinde-oss/kinde-typescript-sdk/dist/types/sdk/utilities";
const bucketName = process.env.AVATAR_BUCKET_NAME!;

const bannerBucketName = process.env.BANNER_BUCKET_NAME!;

const bucketRegion = process.env.BUCKET_REGION!;

const accessKey = process.env.ACCESS_KEY!;

const secretAccessKey = process.env.SECRET_ACCESS_KEY!;
const s3 = new S3Client({
  region: bucketRegion,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
});

type Error = {
  error: Error;
};
enum UserLookupMethod {
  ById,
  ByEmail,
  ByUsername,
}
const client = new Client({
  node: "http://localhost:9200", // Make sure this is correct
});
const userSchema = z.object({
  username: z.string(),
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  followerId: z.number(),
  followingId: z.number(),
});

const database_service = new DatabaseService("file:mockmimi.db");
const elastic_service = new IndexingService();
export const userRoutes = new Hono()


  .get("/getusers", async (c) => {
    const res = c.req.queries("page");
    let page;
    if (res) {
      page = +res;
    } else {
      page = null;
    }
    const users = await database_service.get_user(null, null, page, s3);
    return c.json({ users: users });
  })
  .get("/getuserselastic", async (c) => {
    const users = await fetch("http://localhost:9200/users/_search");
    console.log(users);
    const data = await users.json();
    return c.json({ data: data });
  })
  .get("/testsearchuser",async (c)=>{
    const query = c.req.query("username")
    const user = await db.select().from(userTable).where(like(userTable.username,`${query}%`))

    return c.json({user:user})


  })
  .get("/getsearcheduser", async (c) => {
    const query = c.req.query("username");

    if (!query) {
      return c.json({ error: "Missing search query" }, 400);
    }
      const response = await fetch(`http:localhost:9200/users/_search`, {
        method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: { match: { username: query } },
        }),
      });
      const data = await response.json()


      const result = data.hits


    //const result = await elastic_service.make_query(query);
    return c.json({ result: result });
  })
  .get("/:uid/getcurrentuser", async (c) => {
    const userId = c.req.param("uid");
    const user = await database_service.get_user(
      UserLookupMethod.ById,
      userId,
      null,
      s3
    );
    return c.json({ user: user });
  })
  .get("/getcurrentuserfollowers/:uid", async (c) => {
    const id = +c.req.param("uid");
    const followers = await database_service.get_followers(id, s3);
    return c.json({ followers: followers });
  })

  .get("/getcurrentuserfollowing/:uid", async (c) => {
    const id = +c.req.param("uid");

    const following = await database_service.get_following(id, s3);
    return c.json({ following: following });
  })
  .get("/usernotifications/:uid", async (c) => {
    const id = +c.req.param("uid");

    const notifications = await db
      .select()
      .from(notificationTable)
      .innerJoin(userTable, eq(notificationTable.sendUserId, userTable.id))
      .where(eq(notificationTable.recieveUserId, id));
    return c.json({ notifications: notifications });
  })
  .post("/createuser", async (c) => {
    const body = await c.req.parseBody();

    if (!body.name || !body.username || (!body.email && !body.password)) {
      throw Error("Invalid params provided. Please check input.");
    }
    const db_user = await database_service.get_user(
      UserLookupMethod.ByEmail,
      body.email.toString(),
      null,
      s3
    );

    if (db_user?.length !== 0) {
      return c.json({ message: "User already exists" });
    }
    // if (db_user.length !== 0) {
    //   throw Error("User already exists!");
    // }
    console.log(db_user);
    let tempuser
    try{

    tempuser = await database_service.create_user(body,s3,elastic_service)
    }
    catch(err){
      console.log(err)
      return c.json({error:err})
    }
   return c.json ({userId:tempuser.userId,username: tempuser.username, token: tempuser.token})
  })
  .get("/:uid/activate2FA",async(c)=>{
    const userId = c.req.param("uid");
        const user = await database_service.get_user(
        UserLookupMethod.ById,
        userId,
        null,
        s3
        );
        console.log(user)
    const otpauth = authenticator.keyuri(user![0].username,"meepApp",user![0].otpSecret!);
    const qrCodeDataURL = await qrcode.toDataURL(otpauth)

    return c.json({qrcode:qrCodeDataURL, code:user![0].otpSecret})
  })
  .post("/verifyactivation",async(c)=>{

    const body = await c.req.json();
    const code = body.code
    const userId = body.userId
    const user = await database_service.get_user(
        UserLookupMethod.ById,
        userId,
        null,
        s3
        );

    const isValid = authenticator.verify({token:code, secret: user![0].otpSecret!})
    if (isValid){
        await db.update(userTable).set({twofaEnabled:true}).where(eq(userTable.id,userId))
        return c.json({isValid:isValid})
    }else{
        
        return c.json({isValid:isValid})
    }

  })
.post("/verifyuser",async(c)=>{

    const body = await c.req.json();
    const code = body.code
    const userId = body.userId
    const user = await database_service.get_user(
        UserLookupMethod.ById,
        userId,
        null,
        s3
        );

    const isValid = authenticator.verify({token:code, secret: user![0].otpSecret!})
    if (isValid){
        return c.json({isValid:isValid})
    }else{
        
        return c.json({isValid:isValid})
    }

  })
  .post("/updateuseravatar", async (c) => {
    const body = await c.req.parseBody();
    const file = <File>body.avatar;
    console.log(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const params = {
      Bucket: bucketName,
      Key: body.id.toString(),
      Body: buffer,
      ContentType: file.type,
    };
    const command = new PutObjectCommand(params);
    const result = await s3.send(command);
    console.log("THIS IS?", result);
    return c.json({ message: "it just works" });
  })
  .post("/updateuserbanner", async (c) => {
    const body = await c.req.parseBody();
    const file = <File>body.banner;
    console.log(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const params = {
      Bucket: bannerBucketName,
      Key: body.id.toString(),
      Body: buffer,
      ContentType: file.type,
    };
    const command = new PutObjectCommand(params);
    const result = await s3.send(command);
    console.log("THIS IS?", result);
    return c.json({ message: "it just works" });
  })
  .post("/login", async (c) => {
    const user = await c.req.json();
    let existingUser;
    try {
      existingUser = await database_service.login(user, s3);
    } catch (err) {
      throw new HTTPException(401, { message: "Wrong input" });
    }
    let token;
    token = await sign(
      {
        id: existingUser[0].id,
        email: existingUser[0].id,
        username: existingUser[0].username,
      },
      "mimisecretkey"
    );

    return c.json({
      message: "logged in",
      userId: existingUser[0].id,
      username: existingUser[0].username,
      user2fa: existingUser[0].twofaEnabled,
      token: token,
    });
  })
  .post("/follow/:uid", async (c) => {
    const userToFollowId = await +c.req.param("uid");
    const body = await c.req.json();
    const currentUserId = +body.profileId;

    const result = await database_service.follow_user(
      userToFollowId,
      currentUserId
    );
    return c.json({ result: result });
  })
  .delete("/unfollow/:uid", async (c) => {
    const userToUnfollowId = +c.req.param("uid");
    const body = await c.req.json();
    const currentUserId = +body.profileId;
    const result = await database_service.unfollow_user(
      userToUnfollowId,
      currentUserId
    );
  })
  .post("/checkfollowing/:uid", async (c) => {
    const userToFollowId = +c.req.param("uid");
    const body = await c.req.json();
    const currentUserId = +body.profileId;
    const result = await database_service.check_following(
      currentUserId,
      userToFollowId
    );
    return c.json({ message: result.message, following: result.following });
  })
  .get("/followingcount/:uid", async (c) => {
    const userId = +c.req.param("uid");
    const result = await database_service.get_following_count(userId);

    return c.json({ result: result });
  })
  .get("/followercount/:uid", async (c) => {
    const userId = +c.req.param("uid");

    const result = await database_service.get_follower_count(userId);
    return c.json({ result: result });
  })
  .patch("/:uid/updateuser")
  .delete("/:uid/deleteuser");

export default client;
