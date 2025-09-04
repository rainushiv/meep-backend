import { password } from "bun";
import { DatabaseService } from "../src/services/db";
import { IndexingService } from "../src/services/elastic-search";
import { MeepService } from "../src/services/meep-service";
import { MeepDatabaseService } from "../src/services/meepdb";
import { UserDTO } from "./mock-user";
import {faker} from '@faker-js/faker'
import { S3Client } from "@aws-sdk/client-s3";
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


interface meep {
  title: string |null;
  body: string;
  creatorId: number;
}
interface mocktweet{
  Username: string,
  Tweet: string,


}
type user = {
        [x: string]: string | File;
}
async function start_bootstrap() {
  const db_service = new DatabaseService("file:../mockmimi.db");
  const meep_service = new MeepDatabaseService("file:../mockmimi.db") 
  const indexService = new IndexingService();
  // const meepService: MeepService = new MeepService(dbService, indexService);
  console.log("hello")
  for (let i = 0; i < 10000; i++) {
    const user:user = {
      name: faker.person.firstName(),
      username: faker.internet.username(),
      email: faker.internet.email(),
      password: faker.internet.password(),

    }
    db_service.create_user(user, s3,indexService)
   }



  }

start_bootstrap()
// console.log(fetchUser().then(async (u) => console.log(await u.json())));
