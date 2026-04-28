import { eq, and, SQL, like, desc, sql, asc } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { schools, insertSchoolSchema, updateSchoolSchema } from "./shared/schema";
import type { School, InsertSchool, UpdateSchool } from "./shared/schema";

export class SchoolManager {
  async createSchool(data: InsertSchool): Promise<School> {
    const db = await getDb();
    const validated = insertSchoolSchema.parse(data);
    const [school] = await db.insert(schools).values(validated).returning();
    return school;
  }

  async getSchools(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<School, 'id' | 'name' | 'region'>>
  } = {}): Promise<School[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters.id !== undefined) {
      conditions.push(eq(schools.id, filters.id));
    }
    if (filters.name !== undefined) {
      conditions.push(like(schools.name, `%${filters.name}%`));
    }
    if (filters.region) {
      // 支持多地区筛选（用逗号分隔）
      const regions = filters.region.split(',').map(r => r.trim()).filter(r => r);
      console.log("地区筛选，原始regions:", regions);
      if (regions.length > 0) {
        // 将地区名称转换为前缀，与数据库中的"省份 城市"格式匹配
        // 数据库中的格式：如"广东 肇庆市"、"四川 成都市"、"内蒙古 包头市"
        // 提取省份部分（空格前的部分）进行匹配
        const regionPrefixes = regions.map(region => {
          // 特殊处理：内蒙古
          // 可能是"内蒙古自治区"或"内蒙古"，统一提取"内蒙古"
          const prefix = region.startsWith("内蒙古") ? "内蒙古" : region.substring(0, 2);
          console.log(`地区 "${region}" 的前缀: "${prefix}"`);
          // 匹配 "省份" 开头，如 "广东" 匹配 "广东 肇庆市"
          return sql`(${schools.region} LIKE ${prefix + ' %'} OR ${schools.region} = ${prefix})`;
        });
        const regionCondition = sql`(${sql.join(regionPrefixes, sql` OR `)})`;
        console.log("地区筛选条件已添加");
        conditions.push(regionCondition);
      }
    }

    // 按序号降序排列（转换为数字排序，空值排在最后）
    const orderByClause = desc(sql`CAST(COALESCE(NULLIF(${schools.sequence}, ''), '0') AS INTEGER)`);

    if (conditions.length > 0) {
      return db
        .select()
        .from(schools)
        .where(and(...conditions))
        .limit(limit)
        .offset(skip)
        .orderBy(orderByClause);
    }

    return db.select().from(schools).limit(limit).offset(skip).orderBy(orderByClause);
  }

  async getSchoolCount(filters?: Partial<Pick<School, 'name' | 'region'>>): Promise<number> {
    const db = await getDb();

    const conditions: SQL[] = [];
    if (filters?.name !== undefined) {
      conditions.push(like(schools.name, `%${filters.name}%`));
    }
    if (filters?.region) {
      // 支持多地区筛选（用逗号分隔）
      const regions = filters.region.split(',').map(r => r.trim()).filter(r => r);
      if (regions.length > 0) {
        // 将地区名称转换为前缀，与数据库中的"省份 城市"格式匹配
        // 数据库中的格式：如"广东 肇庆市"、"四川 成都市"、"内蒙古 包头市"
        // 提取省份部分（空格前的部分）进行匹配
        const regionPrefixes = regions.map(region => {
          // 特殊处理：内蒙古
          // 可能是"内蒙古自治区"或"内蒙古"，统一提取"内蒙古"
          const prefix = region.startsWith("内蒙古") ? "内蒙古" : region.substring(0, 2);
          return sql`(${schools.region} LIKE ${prefix + ' %'} OR ${schools.region} = ${prefix})`;
        });
        conditions.push(sql`(${sql.join(regionPrefixes, sql` OR `)})`);
      }
    }

    if (conditions.length > 0) {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schools)
        .where(and(...conditions));
      return result.count;
    }

    const [result] = await db.select({ count: sql<number>`count(*)` }).from(schools);
    return result.count;
  }

  async getSchoolById(id: string): Promise<School | null> {
    const db = await getDb();
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school || null;
  }

  async updateSchool(id: string, data: UpdateSchool): Promise<School | null> {
    const db = await getDb();
    const validated = updateSchoolSchema.parse(data);
    const [school] = await db
      .update(schools)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(schools.id, id))
      .returning();
    return school || null;
  }

  async deleteSchool(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.delete(schools).where(eq(schools.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getSchoolNames(): Promise<{ id: string; name: string }[]> {
    const db = await getDb();
    const orderByClause = desc(sql`CAST(COALESCE(NULLIF(${schools.sequence}, ''), '0') AS INTEGER)`);
    return db
      .select({ id: schools.id, name: schools.name })
      .from(schools)
      .orderBy(orderByClause);
  }

  async deleteAllSchools(): Promise<number> {
    const db = await getDb();
    const result = await db.delete(schools);
    return result.rowCount ?? 0;
  }

  // 批量更新地区字段，只保留省份信息（去除城市信息）
  async batchUpdateRegions(): Promise<{ updated: number; failed: number }> {
    const db = await getDb();

    // 获取所有包含空格的地区
    const allSchools = await db.select().from(schools);
    const schoolsToUpdate = allSchools.filter(s => s.region && s.region.includes(' '));

    let updated = 0;
    let failed = 0;

    for (const school of schoolsToUpdate) {
      try {
        const newRegion = school.region!.split(' ')[0];
        await db
          .update(schools)
          .set({ region: newRegion, updatedAt: new Date() })
          .where(eq(schools.id, school.id));
        updated++;
      } catch (error) {
        console.error(`更新学校 ${school.name} 的地区字段失败:`, error);
        failed++;
      }
    }

    return { updated, failed };
  }
}

export const schoolManager = new SchoolManager();
