
import { S3Client } from "@aws-sdk/client-s3";
import { DatabaseService } from "./db";
import { d } from "drizzle-kit/index-BAUrj6Ib";

const database_service = new DatabaseService("file:mockmimi.db");
enum UserLookupMethod {
  ById,
  ByEmail,
  ByUsername,
}
type user = {
  id: number,
  name: string,
  username: string,
  email: string,
  password: string
}

export class IndexingService {

  constructor() { }

  public async insert_user(userid: number,name:string,username:string, s3:S3Client) {
    console.log("WE MADE IT HERE")
    let user
    // try {

    // user = await database_service.get_user(UserLookupMethod.ById, userid,null,s3)
    // }catch(err){
    //   console.log("The error is over here")
    //   console.log(err)
    // }
     let response
try{
     response = await fetch(`http:localhost:9200/users/_doc/${userid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        username: username,
      }),
    });


}catch(err){
  console.log("error is here")
  console.log(err)
  response = err
}
 
   return response;
  }

  public async make_query(input: string) {


    try {
      const response = await fetch(`http:localhost:9200/users/_search`, {
        method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: 10,
          query: { match: { username: input } },
        }),
      });
      const data = await response.json()


      const result = data.hits
      return result
    } catch (error) {
      console.error("Elasticsearch Fetch Error:", error);
      return Error()
    }


  }}

