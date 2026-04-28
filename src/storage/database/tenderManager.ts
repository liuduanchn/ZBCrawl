import { eq, and, SQL, like, desc, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { tenders, insertTenderSchema, updateTenderSchema } from "./shared/schema";
import type { Tender, InsertTender, UpdateTender } from "./shared/schema";

export class TenderManager {
  async createTender(data: InsertTender): Promise<Tender> {
    const db = await getDb();
    const validated = insertTenderSchema.parse(data);
    const [tender] = await db.insert(tenders).values(validated).returning();
    return tender;
  }

  async getTenders(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<Tender, 'schoolName' | 'id'>>
  } = {}): Promise<Tender[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(tenders.id, filters.id));
    }
    if (filters.schoolName !== undefined) {
      conditions.push(like(tenders.schoolName, `%${filters.schoolName}%`));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(tenders)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
        .orderBy(desc(tenders.createdAt), desc(tenders.crawledAt));
    }

    return db
      .select()
      .from(tenders)
      .limit(limit)
      .offset(skip)
      .orderBy(desc(tenders.createdAt), desc(tenders.crawledAt));
  }

  async getTenderCount(filters?: Partial<Pick<Tender, 'schoolName'>>): Promise<number> {
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters?.schoolName !== undefined) {
      conditions.push(like(tenders.schoolName, `%${filters.schoolName}%`));
    }

    if (conditions.length > 0) {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tenders)
        .where(and(...conditions));
      return result.count;
    }

    const [result] = await db.select({ count: sql<number>`count(*)` }).from(tenders);
    return result.count;
  }

  async getTenderById(id: string): Promise<Tender | null> {
    const db = await getDb();
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    return tender || null;
  }

  async getTendersBySchool(schoolName: string): Promise<Tender[]> {
    const db = await getDb();
    return db
      .select()
      .from(tenders)
      .where(eq(tenders.schoolName, schoolName))
      .orderBy(desc(tenders.crawledAt));
  }

  async updateTender(id: string, data: UpdateTender): Promise<Tender | null> {
    const db = await getDb();
    const validated = updateTenderSchema.parse(data);
    const [tender] = await db
      .update(tenders)
      .set(validated)
      .where(eq(tenders.id, id))
      .returning();
    return tender || null;
  }

  async deleteTender(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(tenders).where(eq(tenders.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async createBulkTenders(data: InsertTender[]): Promise<Tender[]> {
    const db = await getDb();
    const validated = data.map(item => insertTenderSchema.parse(item));
    return db.insert(tenders).values(validated).returning();
  }

  async deleteTendersBySchool(schoolName: string): Promise<number> {
    const db = await getDb();
    const result = await db.delete(tenders).where(eq(tenders.schoolName, schoolName));
    return result.rowCount ?? 0;
  }
}

export const tenderManager = new TenderManager();
