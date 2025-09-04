import { Hono } from "hono";
import { promise, z } from "zod"
import { db } from "../src/main";
import { commentTable, meepTable } from "../src/db/schema";
import { followingTable } from "../src/db/schema";
import { desc, eq, Param } from "drizzle-orm";
import { DatabaseService } from "../src/services/db";
import { MeepDatabaseService } from "../src/services/meepdb";
import { CookieSharp } from "@mui/icons-material";
import { meepImgTable } from "../src/db/schema";
import { blob } from "drizzle-orm/sqlite-core";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { useParams } from "react-router-dom";

const bucketName= process.env.MEEP_BUCKET_NAME!  

const commentBucketName = process.env.COMMENT_BUCKET_NAME!
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


const meepSchema = z.object({

    title: z.string(),
    body: z.string(),
    creatorId: z.number(),
    creationTime: z.number()

})
const meepImgSchema = z.object({

   
    body: z.string(),
    imageText:z.string(),
    imageName: z.string(),
    creatorId: z.number(),
    creationTime: z.number()

})
enum MeepTypeReturned {
  UsersMeep,
  Userfeed

}
type comment = {
  id:number;
  imageText:string;
  body: string;
  creatorId: number;
  imageUrl:string |null;
  meepId:number
};
type comments = comment[]


const database_service = new DatabaseService("file:mockmimi.db");

const meep_service = new MeepDatabaseService("file:mockmimi.db")
export const meepRoutes = new Hono()
    .get("/getmeeps", async (c) => {

        //const meeps = await db.select().from(meepTable)
        const meeps = await meep_service.get_meeps(null,null,null,s3);
        return c.json({ meeps: meeps })
    })
    .get("/getusermeep/:uid",async (c)=>{

        const meepId = c.req.param('uid');
        const id = +meepId!
        console.log(id)
        const meep = await db.select().from(meepImgTable).where(eq(meepImgTable.id,id))
        if(!(meep[0].imageText ==='N/A')){
const GetObjectParams = {
    Bucket: bucketName,
    Key:meep[0].id.toString()
}

const command = new GetObjectCommand(GetObjectParams);
const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
meep[0].imageUrl = url
 

        }
            
        return c.json({meep})
    })
    
    .get("/usermeepfeed/:uid", async (c) => {
        const userId = c.req.param('uid');
        const id = +userId
        // const following = await db.select().from(followingTable).where(eq(followingTable.followingId, id))
        // let meepfeed;
        // let usermeepfeed = new Array();

        // for (const followed of following) {

        //     meepfeed = await db.select().from(meepTable).where(eq(meepTable.creatorId, followed.following))

        //     meepfeed.forEach((meepfeed) => {

        //         usermeepfeed.push(meepfeed)

        //     })

        //}

        const usermeepfeed = await meep_service.get_meeps(MeepTypeReturned.Userfeed,id,null,s3)
        return c.json({ usermeepfeed: usermeepfeed })
    })
    .get("/getusermeeps/:uid", async (c) => {
        const userId = c.req.param("uid")
const res = c.req.queries("page")
        let page;
        if(res){
        page = +res 
    }else{
            page = null
        }
        const id = +userId
        //const usermeeps = await db.select().from(meepTable).where(eq(meepTable.creatorId, id))
        const usermeeps = await meep_service.get_meeps(MeepTypeReturned.UsersMeep,id,page,s3)
        return c.json({ usermeeps: usermeeps })
    }).get("/getuserimgmeeps/:uid",async (c)=>{

        const userId = +c.req.param("uid")
const res = c.req.queries("page")
const meeps = await db.select().from(meepImgTable).where(eq(meepImgTable.creatorId,userId))
for (const meep of meeps){
const GetObjectParams = {
    Bucket: bucketName,
    Key:meep.id.toString()
}

const command = new GetObjectCommand(GetObjectParams);
const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
meep.imageUrl = url
 
}
       return c.json({meeps: meeps})
    })
    .get("getmeepcomments/:uid",async (c)=>{
const meepId = +c.req.param('uid')
let comments:comments 
try{
    
comments = await db.select().from(commentTable).orderBy(desc(commentTable.id)).where(eq(commentTable.meepId,meepId))
}catch(err){
console.log(err)
}

for (const comment of comments!){
    if(!(comment.imageText ==="N/A")){
const GetObjectParams = {
    Bucket: commentBucketName,
    Key:comment.id.toString()
}

const command = new GetObjectCommand(GetObjectParams);
const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
comment.imageUrl = url
    }
} 
return c.json({comments:comments!})


    })
    .post("/createmeep", async (c) => {

        const usermeep = await c.req.json()
        // const meep = await db.insert(meepTable).values({
        //     title: "yes",
        //     body: usermeep.body,
        //     creatorId: usermeep.creatorId,
        // })
       const meep = meep_service.create_meep(usermeep);
        return c.json({ message: 'success',meep:meep })
    })
    .post("/createimgmeep", async (c) =>{
        const body = await c.req.parseBody()
        console.log(body.body)
        if(body.image){

        
        const file = <File>body.image
        const buffer = Buffer.from(await file.arrayBuffer())
        let meepImg
        console.log(body,file,buffer)
        try{
         meepImg = await db.insert(meepImgTable).values({
             body: body.body.toString(),
             imageText: file.name,
             creatorId: +body.creatorId,
    }).returning({id:meepImgTable.id})  
 
        }catch(err){
console.log(err)
        }
        console.log(bucketName)
   if(meepImg){
        const params = {
        Bucket: bucketName,
        Key: meepImg[0].id.toString(),
        Body: buffer,
        ContentType: file.type

        }
        const command = new PutObjectCommand(params)
        await s3.send(command)
    }
    }else{
        const result = await db.insert(meepImgTable).values({
            body:body.body.toString(),
            imageText:"N/A",
            creatorId: +body.creatorId
        })
    

}
        return c.json({message:"yippie!"})
    })
    .post("/likemeep/:uid", async(c) =>{

        const meepToLike = await +c.req.param("uid");
        const id = await c.req.json();
        const userWhoLiked = id.userId;
        const message = await meep_service.like_meep(meepToLike,userWhoLiked)
        return c.json({message:"yuhh", meepToLike: meepToLike, userWhoLiked: userWhoLiked})
    })
.delete("unlikemeep/:uid",async(c)=>{
const meepToUnlike = +c.req.param("uid");
const id = await c.req.json();
const userWhoUnliked = id.userId;
const result = await meep_service.unlike_meep(meepToUnlike,userWhoUnliked)

return c.json({result: result})
})
    .post("/createcomment", async(c)=>{

        const body = await c.req.parseBody()

        let meepImg
        if(body.image){
    
        const file = <File>body.image
        const buffer = Buffer.from(await file.arrayBuffer())
        console.log(body,file,buffer)
        try{
         meepImg = await db.insert(commentTable).values({
             body: body.body.toString(),
             imageText: file.name,
             creatorId: +body.creatorId,
             meepId: +body.meepId
    }).returning({id:commentTable.id})  
 
        }catch(err){
console.log(err)
        }
   if(meepImg){
        const params = {
        Bucket: commentBucketName,
        Key: meepImg[0].id.toString(),
        Body: buffer,
        ContentType: file.type

        }
        const command = new PutObjectCommand(params)
        await s3.send(command)
    }

        }
else{
        const result = await db.insert(commentTable).values({
            body:body.body.toString(),
            imageText:"N/A",
            creatorId: +body.creatorId,
            meepId: +body.meepId
        })
    

}

return c.json({message:meepImg})

    })

    .post("/likecomment/:uid", async(c) =>{

        const commenttolike = await +c.req.param("uid");
        const id = await c.req.json();

        const userWhoLiked = id.userId;
        const result = await meep_service.like_comment(commenttolike,userWhoLiked);

        return c.json({message:"yippie!", data: result})
    })
    .post("/checklikecomment/:uid",async(c)=>{

        const commenttolike = await +c.req.param("uid");
        const id = await c.req.json();

        const userWhoLiked = id.userId;
     
        const result = await meep_service.check_commentlike(commenttolike,userWhoLiked);

        return c.json({message:"yippie!", data: result})
    })
    .post("/checklike/:uid", async(c)=>{

        const meepToLike = await +c.req.param("uid");
        const id = await c.req.json();
        const userWhoLiked = id.userId;

        const isLiked = await meep_service.check_like(meepToLike,userWhoLiked)
        return c.json({isLiked: isLiked})
    })
    .get("/getlikedmeeps/:uid",async(c)=>{

        const userId = +c.req.param("uid")



        const likedMeeps = await meep_service.get_liked_meeps(userId);

        return c.json({likemeeps:likedMeeps})


    })
    .get("getmeeplikecount/:uid",async (c)=>{
const userId = +c.req.param("uid")

const likedMeeps = await meep_service.get_meep_liked_count(userId);
return c.json({result:  likedMeeps})
    })
    .get("getmeepcommentlikecount/:uid",async(c)=>{

        const meepCommentId = +c.req.param("uid")
        const likeMeepComment = await meep_service.get_meep_likecomment_count(meepCommentId);
        return c.json({result:likeMeepComment})
    })
