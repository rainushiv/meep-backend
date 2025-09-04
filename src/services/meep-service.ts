import { DatabaseService } from "./db";
import { IndexingService } from "./elastic-search";

export class MeepService {
  private readonly dbService: DatabaseService;
  private readonly elasticSearchService: IndexingService;

  constructor(
    dbService: DatabaseService,
    elasticSearchService: IndexingService
  ) {
    this.dbService = dbService;
    this.elasticSearchService = elasticSearchService;
  }

  public async create_user(user: any) {
    /* TODO this is not implemented */
  }
}
