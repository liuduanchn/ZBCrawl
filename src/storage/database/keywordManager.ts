import { eq, and, SQL, desc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { keywords, insertKeywordSchema, updateKeywordSchema } from "./shared/schema";
import type { Keyword, InsertKeyword, UpdateKeyword } from "./shared/schema";

export class KeywordManager {
  async createKeyword(data: InsertKeyword): Promise<Keyword> {
    const db = await getDb();
    const validated = insertKeywordSchema.parse(data);
    const [keyword] = await db.insert(keywords).values(validated).returning();
    return keyword;
  }

  async getKeywords(options: {
    skip?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
  } = {}): Promise<Keyword[]> {
    const { skip = 0, limit = 100, category, isActive } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (category !== undefined) {
      conditions.push(eq(keywords.category, category));
    }
    if (isActive !== undefined) {
      conditions.push(eq(keywords.isActive, isActive ? 1 : 0));
    }

    if (conditions.length > 0) {
      return db
        .select()
        .from(keywords)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
        .orderBy(desc(keywords.isDefault), keywords.createdAt);
    }

    return db
      .select()
      .from(keywords)
      .limit(limit)
      .offset(skip)
      .orderBy(desc(keywords.isDefault), keywords.createdAt);
  }

  async getKeywordById(id: string): Promise<Keyword | null> {
    const db = await getDb();
    const [keyword] = await db.select().from(keywords).where(eq(keywords.id, id));
    return keyword || null;
  }

  async getKeywordsByCategory(category: string): Promise<Keyword[]> {
    const db = await getDb();
    return db
      .select()
      .from(keywords)
      .where(and(eq(keywords.category, category), eq(keywords.isActive, 1)))
      .orderBy(desc(keywords.isDefault), keywords.createdAt);
  }

  async updateKeyword(id: string, data: UpdateKeyword): Promise<Keyword | null> {
    const db = await getDb();
    const validated = updateKeywordSchema.parse(data);
    const [keyword] = await db
      .update(keywords)
      .set(validated)
      .where(eq(keywords.id, id))
      .returning();
    return keyword || null;
  }

  async deleteKeyword(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(keywords).where(eq(keywords.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async toggleKeywordActive(id: string): Promise<Keyword | null> {
    const db = await getDb();
    const keyword = await this.getKeywordById(id);
    if (!keyword) return null;

    const [updated] = await db
      .update(keywords)
      .set({ isActive: keyword.isActive === 1 ? 0 : 1 })
      .where(eq(keywords.id, id))
      .returning();
    return updated || null;
  }

  async initDefaultKeywords(): Promise<void> {
    const existing = await this.getKeywords({ category: "search" });
    if (existing.length > 0) return;

    const defaultKeywords = [
      { name: "培训", category: "search", isDefault: 1, isActive: 1 },
      { name: "招标", category: "search", isDefault: 1, isActive: 1 },
      { name: "采购", category: "search", isDefault: 1, isActive: 1 },
    ];

    for (const keyword of defaultKeywords) {
      await this.createKeyword(keyword);
    }
  }
}

export const keywordManager = new KeywordManager();
