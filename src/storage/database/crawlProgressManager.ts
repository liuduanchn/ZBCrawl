import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { crawlProgress, insertCrawlProgressSchema, updateCrawlProgressSchema } from "./shared/schema";
import type { CrawlProgress, InsertCrawlProgress, UpdateCrawlProgress } from "./shared/schema";

export class CrawlProgressManager {
  async createCrawlProgress(data: InsertCrawlProgress): Promise<CrawlProgress> {
    const db = await getDb();
    const validated = insertCrawlProgressSchema.parse(data);
    const [progress] = await db.insert(crawlProgress).values(validated).returning();
    return progress;
  }

  async getCrawlProgress(crawlType: string): Promise<CrawlProgress | null> {
    const db = await getDb();
    const [progress] = await db
      .select()
      .from(crawlProgress)
      .where(eq(crawlProgress.crawlType, crawlType))
      .orderBy(desc(crawlProgress.createdAt))
      .limit(1);
    return progress || null;
  }

  async updateCrawlProgress(
    id: string,
    data: UpdateCrawlProgress
  ): Promise<CrawlProgress | null> {
    const db = await getDb();
    const validated = updateCrawlProgressSchema.parse({
      ...data,
      updatedAt: new Date(),
    });

    const [updated] = await db
      .update(crawlProgress)
      .set(validated)
      .where(eq(crawlProgress.id, id))
      .returning();

    return updated || null;
  }

  async markAsRunning(crawlType: string, schoolName?: string): Promise<CrawlProgress> {
    const db = await getDb();

    // 先查找是否存在进行中的记录
    const existing = await this.getCrawlProgress(crawlType);

    if (existing && existing.status === "running") {
      // 更新现有记录
      const updated = await this.updateCrawlProgress(existing.id, {
        schoolName,
        lastCrawledAt: new Date(),
      });
      return updated!;
    }

    // 创建新记录
    const [newProgress] = await db
      .insert(crawlProgress)
      .values({
        crawlType,
        schoolName,
        status: "running",
        currentIndex: 0,
        totalSchools: 0,
        completedSchools: 0,
        failedSchools: 0,
        totalCount: 0,
        lastCrawledAt: new Date(),
      })
      .returning();

    return newProgress;
  }

  async updateSchoolProgress(
    id: string,
    currentIndex: number,
    completedSchools: number,
    failedSchools: number,
    totalCount: number,
    schoolName?: string
  ): Promise<CrawlProgress | null> {
    return this.updateCrawlProgress(id, {
      currentIndex,
      completedSchools,
      failedSchools,
      totalCount,
      schoolName,
      lastCrawledAt: new Date(),
    });
  }

  async markAsCompleted(id: string, totalCount: number): Promise<CrawlProgress | null> {
    return this.updateCrawlProgress(id, {
      status: "completed",
      totalCount,
      lastCrawledAt: new Date(),
    });
  }

  async markAsFailed(id: string, errorMessage: string): Promise<CrawlProgress | null> {
    return this.updateCrawlProgress(id, {
      status: "failed",
      errorMessage,
      lastCrawledAt: new Date(),
    });
  }

  async resetCrawlProgress(crawlType: string): Promise<void> {
    const db = await getDb();

    // 删除所有该类型的爬取进度记录
    await db.delete(crawlProgress).where(eq(crawlProgress.crawlType, crawlType));
  }
}

export const crawlProgressManager = new CrawlProgressManager();
