import {
  followersTable,
  userTable,
  followingTable,
  meepTable,
  likeTable,
  notificationTable,
  meepImgTable,
  likeCommentTable,
  commentTable,
} from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { drizzle, LibSQLDatabase } from "drizzle-orm/libsql";
import { HTTPException } from "hono/http-exception";
import { DatabaseService } from "./db";
import { z } from "zod";
import { GetObjectCommand, S3, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const bucketName= process.env.MEEP_BUCKET_NAME!  

const bucketRegion=process.env.BUCKET_REGION!

const accessKey=process.env.ACCESS_KEY!

const secretAccessKey=process.env.SECRET_ACCESS_KEY!
const s3 = new S3Client({

    region: bucketRegion,
    credentials:{
    accessKeyId: accessKey,
    secretAccessKey:secretAccessKey,
    },
    
})


type meep = {
  id:number;
  imageText:string;
  body: string;
  creatorId: number;
  imageUrl:string |null;
  creationTime:Date;
};

enum MeepTypeReturned {
  UsersMeep,
  Userfeed,
}

enum UserLookupMethod {
  ById,
  ByEmail,
  ByUsername,
}
const meepSchema = z.object({
  title: z.string(),
  body: z.string(),
  creatorId: z.number(),
  creationTime: z.number(),
});

const database_service = new DatabaseService("file:mimi.db");

export class MeepDatabaseService {
  private readonly db: LibSQLDatabase;

  constructor(db_file_name: string) {
    this.db = drizzle(db_file_name);
  }
  public async get_meeps(
    meeptypereturned: MeepTypeReturned | null,
    id: number | null,
    pageParam: number | null,
    s3:S3Client
  ) {

    let meepfeed;
    let meeper
    let returnedmeeps;

          const meeps: meep[] = [] 
    switch (meeptypereturned) {
      case MeepTypeReturned.Userfeed:
        if (id) {
          const following = await this.db
            .select()
            .from(followingTable)
            .where(eq(followingTable.followingId, id));
          for (const followed of following) {

            meepfeed=null;
            meepfeed = await this.db
              .select()
              .from(meepImgTable).orderBy(desc(meepImgTable.id))
              .where(eq(meepImgTable.creatorId, followed.following));

            meepfeed.forEach((userfeed) => {
              meeps.push(userfeed)
            }); 
            
            meeps.sort((a,b)=>b.id-a.id)
            for (const meep of meeps){
              if(!(meep.imageText === "N/A")){
                const GetObjectParams = {
    Bucket: bucketName,
    Key:meep.id.toString()
}

const command = new GetObjectCommand(GetObjectParams);
const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
meep.imageUrl = url
              }
            }
            returnedmeeps= meeps
          }
        }
        break;

      case MeepTypeReturned.UsersMeep:

        if (id && pageParam) {

          const meeps: meep[] = [] 
          const userMeeps = await this.db
            .select()
            .from(meepImgTable).orderBy(desc(meepImgTable.id))
            .where(eq(meepImgTable.creatorId, id)).limit(pageParam * 8).offset((pageParam - 1) *8);
userMeeps.forEach((userfeed) => {
              meeps.push(userfeed)
            }); 
            for (const meep of meeps){
              if(!(meep.imageText === "N/A")){
                const GetObjectParams = {
    Bucket: bucketName,
    Key:meep.id.toString()
}

const command = new GetObjectCommand(GetObjectParams);
const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
meep.imageUrl = url
              }
            }
        returnedmeeps =meeps 
        }
        break;

      default:
        returnedmeeps = await this.db.select().from(meepTable);
    }

    return returnedmeeps;
  }
  public async create_meep(usermeep: meep) {
    const meep = await this.db.insert(meepTable).values({
      title: "test",
      body: usermeep.body,
      creatorId: usermeep.creatorId,
    });

    return meep;
  }

  public async like_meep(meeptolike: number, userwholiked: number) {
    const gettingfollowUser = await this.db.insert(likeTable).values({
      meepId: meeptolike,
      userId: userwholiked,
    });

    const getLikedUser = await this.db.select({id: meepImgTable.creatorId}).from(meepImgTable).where(eq(meepImgTable.id,meeptolike))
    const notification = await this.db.insert(notificationTable).values({
      sendUserId: userwholiked,
      recieveUserId: getLikedUser[0].id,
      action:"liked"
    })
    return {
      message: "success",
    };
  }
public async like_comment(commenttolike:number,userwholiked:number){
const result = await this.db.insert(likeCommentTable).values({
  commentId: commenttolike,
  userId:userwholiked
})
const recieveUser = await this.db.select({id: commentTable.creatorId}).from(commentTable).where(eq(commentTable.id,commenttolike))
const notification = await this.db.insert(notificationTable).values({
sendUserId:userwholiked,
recieveUserId:recieveUser[0].id,
action:"likedcomment"
})
return result

}
  public async check_like(meepliked: number, userwholiked: number) {
    const isLiked = await this.db
      .select()
      .from(likeTable)
      .where(
        and(eq(likeTable.userId, userwholiked), eq(likeTable.meepId, meepliked))
      );

    return isLiked;
  }
public async unlike_meep(meepToUnlike:number, userWhoUnliked:number){

  const unLike = await this.db.delete(likeTable).where(and(eq(likeTable.userId,userWhoUnliked),eq(likeTable.meepId,meepToUnlike)))

  return unLike
}
public async check_commentlike(commentliked:number, userwholiked:number){

  const isLiked = await this.db.select().from(likeCommentTable).where(and(eq(likeCommentTable.userId,userwholiked),eq(likeCommentTable.commentId,commentliked)))
return isLiked

}
  public async get_liked_meeps(userId: number) {

          const meeps: meep[] = [] 
    const likedmeeps = await this.db
      .select()
      .from(likeTable)
      .where(eq(likeTable.userId, userId));

      for(const liked of likedmeeps){

 const meep = await this.db.select().from(meepImgTable).where(eq(meepImgTable.id,liked.meepId))
meep.forEach((likedMeep)=>{
              if(!(likedMeep.imageText === "N/A")){
                const GetObjectParams = {
    Bucket: bucketName,
    Key:likedMeep.id.toString()
}
  meeps.push(likedMeep)
}})

      }


    return meeps;
  }
  public async get_meep_liked_count(meepId:number){

    const result = await this.db.$count(likeTable, eq(likeTable.meepId,meepId))

    return result 


  }
  public async get_meep_likecomment_count(meepCommentId:number){
const result = await this.db.$count(likeCommentTable,eq(likeCommentTable.commentId,meepCommentId))
return result 

  }
}
