import {
  followersTable,
  userTable,
  followingTable,
  meepTable,
  notificationTable,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { HTTPException } from "hono/http-exception";
import { GetObjectCommand, PutObjectCommand, S3, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import errorMap from "zod/lib/locales/en";
import { following } from "../../drizzle/schema";
import {sign, decode, verify} from "hono/jwt"
import { authenticator } from "otplib";
import { IndexingService } from "./elastic-search";
const bucketName = process.env.AVATAR_BUCKET_NAME!;
const bannerBucketName = process.env.BANNER_BUCKET_NAME!;
enum UserLookupMethod {
  ById,
  ByEmail,
  ByUsername,
}
type createuser = {
      [x: string]: string | File;

}
type user = {
  name: string;
  username: string;
  email: string;
  password: string;
  avatar: string | File;
};
type meep = {
  title: string;
  body: string;
  creatorId: number;
};

enum MeepTypeReturned {
  UsersMeep,
  Userfeed,
}

const userSchema = z.object({
  username: z.string(),
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  followerId: z.number(),
  followingId: z.number(),
});
const meepSchema = z.object({
  title: z.string(),
  body: z.string(),
  creatorId: z.number(),
  creationTime: z.number(),
});

export class DatabaseService {
  private readonly db: LibSQLDatabase;

  constructor(db_file_name: string) {
    this.db = drizzle(db_file_name);
  }

  public async get_user(
    lookup_method: UserLookupMethod | null,
    lookup_id: string | number | null,
    pageParam: number | null,
    s3: S3Client
  ) {
    let query;

    switch (lookup_method) {
      case UserLookupMethod.ById:
        query = await this.db
          .select()
          .from(userTable)
          .where(eq(userTable.id, lookup_id as number));
        for (const user of query) {
          const GetObjectParams = {
            Bucket: bucketName,
            Key: user.id.toString(),
          };
          

          const command = new GetObjectCommand(GetObjectParams);
          const avatarUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
          user.avatarUrl = avatarUrl;
        try{
           const GetObjectParams = {
            Bucket: bannerBucketName,
            Key: user.id.toString(),
          };
 
          const command = new GetObjectCommand(GetObjectParams);
          const bannerUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });         
          user.bannerUrl = bannerUrl
        }catch(err){

        }         

        }
        break;

      case UserLookupMethod.ByEmail:
        query = await this.db
          .select()
          .from(userTable)
          .where(eq(userTable.email, lookup_id as string));
        for (const user of query) {
          const GetObjectParams = {
            Bucket: bucketName,
            Key: user.id.toString(),
          };

          const command = new GetObjectCommand(GetObjectParams);
          const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
          user.avatarUrl = url;
        }
        break;

      case UserLookupMethod.ByUsername:
        query = await this.db
          .select()
          .from(userTable)
          .where(eq(userTable.username, lookup_id as string));
        for (const user of query) {
          const GetObjectParams = {
            Bucket: bucketName,
            Key: user.id.toString(),
          };

          const command = new GetObjectCommand(GetObjectParams);
          const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
          user.avatarUrl = url;
        }
        break;

      default:
        if (pageParam) {
          query = await this.db
            .select()
            .from(userTable)
            .limit(pageParam * 8)
            .offset((pageParam - 1) *8);
            for (const user of query) {
              const GetObjectParams = {
                Bucket: bucketName,
                Key: user.id.toString(),
              };
    
              const command = new GetObjectCommand(GetObjectParams);
              const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
              user.avatarUrl = url;
        }
      }
    }

    return await query;
  }

  public async create_user(body: createuser, s3: S3Client,  elastic_service: IndexingService){
    // check if user exists

    let hashedpassword;
    try {
      hashedpassword = await Bun.password.hash(body.password.toString());
    } catch (err) {
      console.log(err);
    }

    const otpSecret = authenticator.generateSecret();
    
    const file = <File>body.avatar;
    const buffer = Buffer.from(await file.arrayBuffer());

    let user;

      let token;
    try {
      user = await this.db
        .insert(userTable)
        .values({
          name: body.name.toString(),
          username: body.username.toString(),
          email: body.email.toString(),
          password: hashedpassword!,
          otpSecret: otpSecret,
          twofaEnabled: false
        })
        .returning({ id: userTable.id });

    console.log(user);
    }
    catch(err){
      console.log(err)
    }
    
      let newelasticuser
    try{

      if(user){
      const params = {
        Bucket: bucketName,
        Key: user[0].id.toString(),
        Body: buffer,
        ContentType: file.type,
      };
      const command = new PutObjectCommand(params);
      await s3.send(command);
      newelasticuser = await elastic_service.insert_user(user[0].id,body.name.toString(),body.username.toString(), s3);
      token = sign(
        { id: user[0].id, email: body.email, username: body.username },
        "mimisecretkey"
      );
 
      }
   }
 catch (err) {
  console.log(newelasticuser)
      console.log("EEROR IS HERE");
      console.log(err);
    }
     if (user) { return { userId: user[0].id,username: body.username.toString(), token: token };
  }
     else {
      return ({ user: "fail" });
    }
  }
  public async login(user: user, s3: S3Client) {
    let existingUser
    try{
     existingUser = await this.get_user(
      UserLookupMethod.ByEmail,
      user.email,
      null,
      s3
    );
    }catch(err){
      console.log(err)
      throw Error("Failed try again later")
    }
    if (!existingUser ) {

      throw new HTTPException(401, { message: "Wrong Password please try again" });
    } 
    let isValid;
try{
  
    isValid = await Bun.password.verify(user.password,existingUser[0].password)
}catch(err){

  console.log(err)
}

    if(!isValid){

    throw new HTTPException(401,{message:"invalid credentials"});
    }


    return existingUser
  }

  public async get_following(id: number,s3:S3Client) {
    const followingId = await this.db
      .select()
      .from(followingTable)
      .where(eq(followingTable.followingId, id));
    const userFollowing = [];
    for (const following of followingId) {
      const user = await this.get_user(UserLookupMethod.ById,following.following,null,s3)
      if(user){

      userFollowing.push(user[0]);
      }
    }

    return await userFollowing;
  }

  public async get_followers(id: number,s3:S3Client) {
const followerId = await this.db
      .select()
      .from(followersTable)
      .where(eq(followersTable.followedId, id));
    const userFollower = [];
    for (const following of followerId) {
      const user = await this.get_user(UserLookupMethod.ById,following.follower,null,s3)
      if(user){

      userFollower.push(user[0]);
      }
    }
    return userFollower;
  }

  public async follow_user(userToFollowId: number, currentUserId: number) {
    try {
      const gettingfollowUser = await this.db.insert(followersTable).values({
        followedId: userToFollowId,
        follower: currentUserId,
      });
      const followingUser = await this.db.insert(followingTable).values({
        followingId: currentUserId,
        following: userToFollowId,
      });
      const notification = await this.db.insert(notificationTable).values({
        sendUserId: currentUserId,
        recieveUserId: userToFollowId,
        action: "followed",
      });
      return {
        message: "success",
        gettingfollowUser: userToFollowId,
        followingUser: currentUserId,
      };
    } catch (err) {
      throw new HTTPException(401, { message: "shit!" });
    }
  }
  public async unfollow_user(userToUnfollowId:number,currentUserId:number){

  }
  public async check_following(currentUserId: number, userToFollowId: number) {
    try {
      const following = await this.db
        .select()
        .from(followersTable)
        .where(
          and(
            eq(followersTable.follower, currentUserId),
            eq(followersTable.followedId, userToFollowId)
          )
        );

      return { message: "success", following: following };
    } catch (err) {
      throw new HTTPException(401, { message: "oops" });
    }
  }
public async get_follower_count(meepId:number){

    const result = await this.db.$count(followersTable, eq(followersTable.followedId,meepId))

    return result 


  }
public async get_following_count(meepId:number){

    const result = await this.db.$count(followingTable, eq(followingTable.followingId,meepId))

    return result 


  }
}
