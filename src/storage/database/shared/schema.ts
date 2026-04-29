import { pgTable, text, varchar, timestamp, index, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 学校表
export const schools = pgTable(
  "schools",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sequence: varchar("sequence", { length: 10 }),
    name: varchar("name", { length: 255 }).notNull(),
    region: varchar("region", { length: 100 }),
    schoolType: varchar("school_type", { length: 50 }),
    highLevel: varchar("high_level", { length: 10 }),
    educationLevel: varchar("education_level", { length: 50 }),
    detailUrl: text("detail_url"),
    website: text("website"),
    crawlSourceUrl: text("crawl_source_url"),
    crawlSourceName: varchar("crawl_source_name", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    nameIdx: index("schools_name_idx").on(table.name),
  })
);

// 招标信息表
export const tenders = pgTable(
  "tenders",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    schoolName: varchar("school_name", { length: 255 }).notNull(),
    crawledAt: timestamp("crawled_at", { withTimezone: true }).notNull(),
    link: text("link"),
    remark: text("remark"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    schoolNameIdx: index("tenders_school_name_idx").on(table.schoolName),
    crawledAtIdx: index("tenders_crawled_at_idx").on(table.crawledAt),
  })
);

// 爬取进度表
export const crawlProgress = pgTable(
  "crawl_progress",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    crawlType: varchar("crawl_type", { length: 50 }).notNull(), // 爬取类型：tenders（招标信息）
    schoolName: varchar("school_name", { length: 255 }), // 当前爬取的学校名称
    currentIndex: integer("current_index").notNull().default(0), // 当前索引（学校数组中的位置）
    totalSchools: integer("total_schools").notNull().default(0), // 总学校数
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 状态：pending（等待中）、running（进行中）、completed（已完成）、failed（失败）
    completedSchools: integer("completed_schools").notNull().default(0), // 已完成的学校数
    failedSchools: integer("failed_schools").notNull().default(0), // 失败的学校数
    totalCount: integer("total_count").notNull().default(0), // 总爬取数量
    errorMessage: text("error_message"), // 错误信息
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }), // 最后爬取时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    crawlTypeIdx: index("crawl_progress_crawl_type_idx").on(table.crawlType),
    statusIdx: index("crawl_progress_status_idx").on(table.status),
  })
);

// 爬取历史记录表
export const crawlHistory = pgTable(
  "crawl_history",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    crawlType: varchar("crawl_type", { length: 50 }).notNull(), // 爬取类型：tenders（招标信息）
    regions: text("regions"), // 筛选的地区（逗号分隔）
    keywords: text("keywords"), // 使用的关键词（逗号分隔）
    totalSchools: integer("total_schools").notNull().default(0), // 总学校数
    successSchools: integer("success_schools").notNull().default(0), // 成功的学校数
    failedSchools: integer("failed_schools").notNull().default(0), // 失败的学校数
    tenderCount: integer("tender_count").notNull().default(0), // 爬取到的招标信息数量
    tenderData: text("tender_data"), // 招标信息结果数据（JSON格式）
    duration: integer("duration"), // 爬取耗时（秒）
    errorMessage: text("error_message"), // 错误信息（如果失败）
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(), // 开始时间
    completedAt: timestamp("completed_at", { withTimezone: true }), // 完成时间
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    crawlTypeIdx: index("crawl_history_crawl_type_idx").on(table.crawlType),
    startedAtIdx: index("crawl_history_started_at_idx").on(table.startedAt),
  })
);

// 关键词标签表
export const keywords = pgTable(
  "keywords",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(), // 关键词名称
    category: varchar("category", { length: 50 }), // 关键词分类：search（搜索词）、filter（过滤词）
    isDefault: integer("is_default").notNull().default(0), // 是否默认关键词（0=否，1=是）
    isActive: integer("is_active").notNull().default(1), // 是否启用（0=否，1=是）
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    categoryIdx: index("keywords_category_idx").on(table.category),
    nameIdx: index("keywords_name_idx").on(table.name),
  })
);

// 使用 createSchemaFactory 配置 date coercion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// 学校表验证 schemas
export const insertSchoolSchema = createCoercedInsertSchema(schools).pick({
  sequence: true,
  name: true,
  region: true,
  schoolType: true,
  highLevel: true,
  educationLevel: true,
  detailUrl: true,
  website: true,
  crawlSourceUrl: true,
  crawlSourceName: true,
});

export const updateSchoolSchema = createCoercedInsertSchema(schools)
  .pick({
    sequence: true,
    name: true,
    region: true,
    schoolType: true,
    highLevel: true,
    educationLevel: true,
    detailUrl: true,
    website: true,
    crawlSourceUrl: true,
    crawlSourceName: true,
  })
  .partial();

// 招标信息表验证 schemas
export const insertTenderSchema = createCoercedInsertSchema(tenders).pick({
  schoolName: true,
  crawledAt: true,
  link: true,
  remark: true,
  createdAt: true,
});

export const updateTenderSchema = createCoercedInsertSchema(tenders)
  .pick({
    link: true,
    remark: true,
  })
  .partial();

// 爬取进度表验证 schemas
export const insertCrawlProgressSchema = createCoercedInsertSchema(crawlProgress).pick({
  crawlType: true,
  schoolName: true,
  currentIndex: true,
  totalSchools: true,
  status: true,
  completedSchools: true,
  failedSchools: true,
  totalCount: true,
  errorMessage: true,
  lastCrawledAt: true,
});

export const updateCrawlProgressSchema = createCoercedInsertSchema(crawlProgress)
  .pick({
    schoolName: true,
    currentIndex: true,
    totalSchools: true,
    status: true,
    completedSchools: true,
    failedSchools: true,
    totalCount: true,
    errorMessage: true,
    lastCrawledAt: true,
    updatedAt: true,
  })
  .partial();

// 爬取历史记录表验证 schemas
export const insertCrawlHistorySchema = createCoercedInsertSchema(crawlHistory).pick({
  crawlType: true,
  regions: true,
  keywords: true,
  totalSchools: true,
  successSchools: true,
  failedSchools: true,
  tenderCount: true,
  tenderData: true,
  duration: true,
  errorMessage: true,
  startedAt: true,
  completedAt: true,
});

export const updateCrawlHistorySchema = createCoercedInsertSchema(crawlHistory)
  .pick({
    totalSchools: true,
    successSchools: true,
    failedSchools: true,
    tenderCount: true,
    tenderData: true,
    duration: true,
    errorMessage: true,
    completedAt: true,
  })
  .partial();

// 关键词标签表验证 schemas
export const insertKeywordSchema = createCoercedInsertSchema(keywords).pick({
  name: true,
  category: true,
  isDefault: true,
  isActive: true,
});

export const updateKeywordSchema = createCoercedInsertSchema(keywords)
  .pick({
    name: true,
    category: true,
    isDefault: true,
    isActive: true,
  })
  .partial();

// TypeScript types
export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type UpdateSchool = z.infer<typeof updateSchoolSchema>;

export type Tender = typeof tenders.$inferSelect;
export type InsertTender = z.infer<typeof insertTenderSchema>;
export type UpdateTender = z.infer<typeof updateTenderSchema>;

export type CrawlProgress = typeof crawlProgress.$inferSelect;
export type InsertCrawlProgress = z.infer<typeof insertCrawlProgressSchema>;
export type UpdateCrawlProgress = z.infer<typeof updateCrawlProgressSchema>;

export type CrawlHistory = typeof crawlHistory.$inferSelect;
export type InsertCrawlHistory = z.infer<typeof insertCrawlHistorySchema>;
export type UpdateCrawlHistory = z.infer<typeof updateCrawlHistorySchema>;

export type Keyword = typeof keywords.$inferSelect;
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type UpdateKeyword = z.infer<typeof updateKeywordSchema>;

// 排除名单表
export const excludedDomains = pgTable(
  "excluded_domains",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    domain: varchar("domain", { length: 255 }).notNull().unique(), // 标准域名
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    domainIdx: index("excluded_domains_domain_idx").on(table.domain),
  })
);

// 排除名单表验证 schemas
export const insertExcludedDomainSchema = createCoercedInsertSchema(excludedDomains).pick({
  domain: true,
});

export const deleteExcludedDomainSchema = z.object({
  id: z.string(),
});

// TypeScript types
export type ExcludedDomain = typeof excludedDomains.$inferSelect;
export type InsertExcludedDomain = z.infer<typeof insertExcludedDomainSchema>;



