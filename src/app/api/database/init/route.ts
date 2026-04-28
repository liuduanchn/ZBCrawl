import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { schools, tenders, crawlProgress, crawlHistory, keywords } from "@/storage/database/shared/schema";

// POST /api/database/init - 初始化数据库表
export async function POST(request: NextRequest) {
  try {
    const db = await getDb();

    // 创建所有表（如果不存在）
    // 使用 SQL 直接创建表，确保 keywords 表存在
    await db.execute(`
      CREATE TABLE IF NOT EXISTS keywords (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50),
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS keywords_category_idx ON keywords(category)
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS keywords_name_idx ON keywords(name)
    `);

    // 创建 excluded_domains 表（如果不存在）
    await db.execute(`
      CREATE TABLE IF NOT EXISTS excluded_domains (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        domain VARCHAR(255) NOT NULL UNIQUE,
        display_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // 创建索引
    await db.execute(`
      CREATE INDEX IF NOT EXISTS excluded_domains_domain_idx ON excluded_domains(domain)
    `);

    // 为 crawl_history 表添加 keywords 字段（如果不存在）
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'crawl_history' AND column_name = 'keywords'
        ) THEN
          ALTER TABLE crawl_history ADD COLUMN keywords TEXT;
        END IF;
      END $$;
    `);

    // 为 crawl_history 表添加 excluded_domains 字段（如果不存在）
    await db.execute(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'crawl_history' AND column_name = 'excluded_domains'
        ) THEN
          ALTER TABLE crawl_history ADD COLUMN excluded_domains TEXT;
        END IF;
      END $$;
    `);

    return NextResponse.json({
      success: true,
      message: "数据库初始化成功",
      tables: ["schools", "tenders", "crawl_progress", "crawl_history", "keywords", "excluded_domains"],
    });
  } catch (error) {
    console.error("初始化数据库失败:", error);
    return NextResponse.json(
      { success: false, error: "初始化数据库失败" },
      { status: 500 }
    );
  }
}
