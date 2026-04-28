import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { crawlHistory, insertCrawlHistorySchema, updateCrawlHistorySchema } from "./shared/schema";
import type { CrawlHistory, InsertCrawlHistory, UpdateCrawlHistory } from "./shared/schema";

export class CrawlHistoryManager {
  async createCrawlHistory(data: InsertCrawlHistory): Promise<CrawlHistory> {
    const db = await getDb();
    const validated = insertCrawlHistorySchema.parse(data);
    const [history] = await db.insert(crawlHistory).values(validated).returning();
    return history;
  }

  async getCrawlHistoryById(id: string): Promise<CrawlHistory | null> {
    const db = await getDb();
    const [history] = await db.select().from(crawlHistory).where(eq(crawlHistory.id, id));
    return history || null;
  }

  async updateCrawlHistory(id: string, data: UpdateCrawlHistory): Promise<CrawlHistory | null> {
    const db = await getDb();
    const validated = updateCrawlHistorySchema.parse(data);
    const [history] = await db
      .update(crawlHistory)
      .set(validated)
      .where(eq(crawlHistory.id, id))
      .returning();
    return history || null;
  }

  async getCrawlHistories(options: {
    skip?: number;
    limit?: number;
    crawlType?: string;
  } = {}): Promise<CrawlHistory[]> {
    const { skip = 0, limit = 50, crawlType } = options;
    const db = await getDb();

    const conditions = [];
    if (crawlType) {
      conditions.push(eq(crawlHistory.crawlType, crawlType));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(crawlHistory)
        .where(and(...conditions))
        .orderBy(desc(crawlHistory.startedAt))
        .limit(limit)
        .offset(skip);
    }

    return db
      .select()
      .from(crawlHistory)
      .orderBy(desc(crawlHistory.startedAt))
      .limit(limit)
      .offset(skip);
  }

  async getCrawlHistoryCount(crawlType?: string): Promise<number> {
    const db = await getDb();

    const conditions = [];
    if (crawlType) {
      conditions.push(eq(crawlHistory.crawlType, crawlType));
    }

    if (conditions.length > 0) {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(crawlHistory)
        .where(and(...conditions));
      return result.count;
    }

    const [result] = await db.select({ count: sql<number>`count(*)` }).from(crawlHistory);
    return result.count;
  }

  async deleteCrawlHistory(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(crawlHistory).where(eq(crawlHistory.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const crawlHistoryManager = new CrawlHistoryManager();
