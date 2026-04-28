import { eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { excludedDomains, ExcludedDomain } from "./shared/schema";

// 简单的日志函数
const logger = {
  info: (message: string, ...args: unknown[]) => console.log(`[INFO] ${message}`, ...args),
  error: (message: string, ...args: unknown[]) => console.error(`[ERROR] ${message}`, ...args),
};

class ExcludedDomainManager {
  /**
   * 获取所有排除域名列表
   */
  async getAllDomains(): Promise<ExcludedDomain[]> {
    try {
      const db = await getDb();
      const result = await db
        .select()
        .from(excludedDomains)
        .orderBy(excludedDomains.createdAt);
      return result;
    } catch (error) {
      logger.error("获取排除域名列表失败:", error);
      throw error;
    }
  }

  /**
   * 添加单个域名
   */
  async addDomain(domain: string): Promise<ExcludedDomain> {
    try {
      // 提取标准域名
      const standardDomain = this.extractDomain(domain);
      const db = await getDb();
      
      const [result] = await db
        .insert(excludedDomains)
        .values({
          domain: standardDomain,
        })
        .returning();
      
      logger.info(`添加排除域名成功: ${standardDomain}`);
      return result;
    } catch (error: unknown) {
      // 检查是否是唯一约束冲突
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        throw new Error(`域名 ${domain} 已存在`);
      }
      logger.error("添加排除域名失败:", error);
      throw error;
    }
  }

  /**
   * 批量添加域名
   */
  async addDomainsBatch(domains: string[]): Promise<{ added: number; skipped: number; errors: string[] }> {
    const result = {
      added: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // 去重
    const uniqueDomains = [...new Set(domains.map(d => this.extractDomain(d)))];

    for (const domain of uniqueDomains) {
      if (!domain) {
        result.skipped++;
        continue;
      }

      try {
        await this.addDomain(domain);
        result.added++;
      } catch (error: unknown) {
        if (error instanceof Error && error.message.includes("已存在")) {
          result.skipped++;
        } else {
          result.errors.push(`${domain}: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }
    }

    return result;
  }

  /**
   * 删除域名
   */
  async deleteDomain(id: string): Promise<boolean> {
    try {
      const db = await getDb();
      const result = await db
        .delete(excludedDomains)
        .where(eq(excludedDomains.id, id))
        .returning();
	
      if (result.length > 0) {
        logger.info(`删除排除域名成功: ${result[0].domain}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error("删除域名失败:", error);
      throw error;
    }
  }

  /**
   * 检查 URL 是否在排除名单中
   */
  isDomainExcluded(url: string, excludedList: string[]): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      return excludedList.some(excluded => {
        const domain = excluded.toLowerCase();
        // 完全匹配或子域名匹配
        return hostname === domain || hostname.endsWith(`.${domain}`);
      });
    } catch {
      return false;
    }
  }

  /**
   * 提取标准域名
   * - 去除 https://, http://, www. 等前缀
   * - 只保留域名部分
   */
  extractDomain(input: string): string {
    let domain = input.trim().toLowerCase();

    // 去除协议
    domain = domain.replace(/^https?:\/\//, '');

    // 去除路径
    domain = domain.split('/')[0];

    // 去除 www. 前缀（可选保留，根据需求调整）
    // domain = domain.replace(/^www\./, '');

    return domain;
  }
}

// 导出单例
export const excludedDomainManager = new ExcludedDomainManager();
