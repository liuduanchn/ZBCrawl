"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RegionSelector } from "@/components/RegionSelector";
import { HelpManual } from "@/components/HelpManual";
import { KeywordSelector, KeywordItem } from "@/components/KeywordSelector";
import { ExcludeKeywordSelector } from "@/components/ExcludeKeywordSelector";
import { DEFAULT_SEARCH_PROVIDER, SearchProvider } from "@/lib/search/types";
import { Search, Play, RefreshCw, Download, Trash2, List, Filter, History, ChevronUp, ChevronDown } from "lucide-react";

interface Tender {
  id: string;
  schoolName: string;
  crawledAt: string;
  link: string | null;
  remark: string | null;
  createdAt: string;
}

interface School {
  id: string;
  name: string;
  region: string | null;
  sequence: string | null;
  schoolType: string | null;
}

interface CrawlProgress {
  id: string;
  crawlType: string;
  schoolName: string | null;
  currentIndex: number;
  totalSchools: number;
  status: string;
  completedSchools: number;
  failedSchools: number;
  totalCount: number;
  errorMessage: string | null;
  lastCrawledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CrawlMessage {
  type: "progress" | "success" | "info" | "error" | "complete" | "tender" | "start" | "resume" | "warning" | "heartbeat" | "paused" | "auto_paused";
  schoolName?: string;
  message: string;
  progress?: number;
  count?: number;
  completed?: number;
  total?: number;
  current?: number;
  startIndex?: number;
  completedSchools?: number;
  failedSchools?: number;
  summary?: {
    total: number;
    completedSchools: number;
    failedSchools: number;
    totalCount: number;
  };
  data?: Tender;
  reason?: string; // 暂停原因
  currentCount?: number; // 本次爬取新增的招标信息条数
}

export default function TendersPage() {
  const SEARCH_PROVIDER_STORAGE_KEY = "tenders-search-provider";
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [paused, setPaused] = useState(false);
  const [searchSchoolName, setSearchSchoolName] = useState("");
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlLogs, setCrawlLogs] = useState<CrawlMessage[]>([]);
  const [crawlSummary, setCrawlSummary] = useState<{
    total: number;
    completedSchools: number;
    failedSchools: number;
    totalCount: number;
  } | null>(null);
  const [crawlStats, setCrawlStats] = useState<{
    completed: number;
    total: number;
  }>({ completed: 0, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pauseResolveRef = useRef<((value: boolean) => void) | null>(null);

  // 地区筛选
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  // 关键词选择
  const [selectedKeywords, setSelectedKeywords] = useState<KeywordItem[]>([]);
  const [searchProvider, setSearchProvider] = useState<SearchProvider>(DEFAULT_SEARCH_PROVIDER);
  // 排除关键词选择（只支持关键词名称列表，不参与 AND/OR 逻辑）
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>([]);
  const [isRegionSelectorOpen, setIsRegionSelectorOpen] = useState(false);

  // 学校清单
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);
  const [schoolCurrentPage, setSchoolCurrentPage] = useState(1);
  const [schoolPageSize] = useState(50);
  const [schoolTotalCount, setSchoolTotalCount] = useState(0);
  const [isSchoolListCollapsed, setIsSchoolListCollapsed] = useState(false);

  // 爬取进度信息
  const [currentCrawlProgress, setCurrentCrawlProgress] = useState<CrawlProgress | null>(null);
  // 本次爬取新增的招标信息条数
  const [currentCrawlCount, setCurrentCrawlCount] = useState(0);

  const fetchTenders = async (schoolName?: string, page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (schoolName) params.append("schoolName", schoolName);
      params.append("skip", String((page - 1) * pageSize));
      params.append("limit", String(pageSize));

      const response = await fetch(`/api/tenders?${params}`);
      const result = await response.json();

      if (result.success) {
        setTenders(result.data);
        setTotalCount(parseInt(result.total || 0, 10));
      }
    } catch (error) {
      console.error("获取招标信息列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 获取爬取进度
  const fetchCrawlProgress = async () => {
    try {
      const response = await fetch("/api/tenders/crawl");
      const result = await response.json();

      if (result.success && result.data) {
        setCurrentCrawlProgress(result.data);
      }
    } catch (error) {
      console.error("获取爬取进度失败:", error);
    }
  };

  // 重置爬取进度
  const resetCrawlProgress = async () => {
    if (!confirm("确定要重置爬取进度吗？\n\n这将清除当前的爬取记录，下次爬取将从头开始。")) {
      return;
    }

    try {
      const response = await fetch("/api/tenders/crawl", {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setCurrentCrawlProgress(null);
        setCrawlLogs([]);
        setCrawlSummary(null);
      } else {
        alert(result.error || "重置失败");
      }
    } catch (error) {
      console.error("重置爬取进度失败:", error);
      alert("重置失败，请重试");
    }
  };

  // 获取筛选后的学校列表
  const fetchFilteredSchools = async (regions?: string[], page: number = 1) => {
    const regionsToUse = regions || selectedRegions;
    if (regionsToUse.length === 0) {
      setFilteredSchools([]);
      setSchoolTotalCount(0);
      return;
    }

    setIsLoadingSchools(true);
    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regions: regionsToUse.join(","),
          limit: schoolPageSize,
          skip: (page - 1) * schoolPageSize,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setFilteredSchools(result.data);
        setSchoolTotalCount(parseInt(result.total || result.data.length, 10));
        setSchoolCurrentPage(page);
      } else {
        alert(result.error || "获取学校列表失败");
      }
    } catch (error) {
      console.error("获取学校列表失败:", error);
      alert("获取学校列表失败，请重试");
    } finally {
      setIsLoadingSchools(false);
    }
  };

  // 开始爬取
  const startCrawling = async (preserveLogs: boolean = false) => {
    if (crawling) return;

    // 检查是否选择了关键词
    if (selectedKeywords.length === 0) {
      alert("请先选择或添加爬取关键词");
      return;
    }

    // 构建关键词显示字符串（包含括号分组，OR 整体括起来）
    const buildKeywordDisplay = (keywords: KeywordItem[]): string => {
      if (keywords.length === 0) return "";
      
      // 找出所有 OR 连接的关键词块
      interface Group {
        indices: number[];
        needsParentheses: boolean;
      }
      
      const groups: Group[] = [];
      let i = 0;
      
      while (i < keywords.length) {
        // 从当前位置开始，找连续的 OR 链
        const orBlock: number[] = [];
        let j = i;
        
        orBlock.push(j);
        let hasOr = false;
        
        while (j < keywords.length - 1 && keywords[j].logic === "OR") {
          hasOr = true;
          j++;
          orBlock.push(j);
        }
        
        if (hasOr) {
          // 这是一个 OR 块，需要括号
          groups.push({
            indices: orBlock,
            needsParentheses: true
          });
          i = j + 1;
        } else {
          // 这是一个单独的 AND 关键词
          groups.push({
            indices: [i],
            needsParentheses: false
          });
          i++;
        }
      }
      
      // 构建显示字符串
      const groupStrs = groups.map(group => {
        const keywordStrs = group.indices.map(i => keywords[i].name).join(" OR ");
        return group.needsParentheses ? `(${keywordStrs})` : keywordStrs;
      });
      
      return groupStrs.join(" AND ");
    };

    const keywordDisplay = buildKeywordDisplay(selectedKeywords);
    const searchProviderLabel =
      searchProvider === "coze" ? "Coze WebSearch" : "Python/DuckDuckGo";

    // 添加提示信息
    let confirmMessage = `开始爬取招标信息？\n\n系统将使用以下关键词进行搜索：\n${keywordDisplay || "默认（培训、招标）"}\n`;
    if (excludeKeywords.length > 0) {
      confirmMessage += `\n排除关键词：${excludeKeywords.join("、")}\n`;
    }
    if (selectedRegions.length > 0) {
      confirmMessage += `\n筛选地区：${selectedRegions.join("、")}\n`;
    }
    confirmMessage += "\n将爬取目标院校，请耐心等待。\n\n注意：\n- 爬取过程可能需要较长时间\n- 系统已添加延迟避免限流\n- 如遇限流会自动重试";
    confirmMessage += `\n\n搜索源：${searchProviderLabel}`;
    if (searchProvider === "python") {
      confirmMessage += "\nPython 搜索不消耗 Coze 点数。";
    } else {
      confirmMessage += "\nCoze WebSearch 会消耗 Coze 资源点数。";
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    abortControllerRef.current = new AbortController();
    setCrawling(true);
    setCrawlProgress(0);
    if (!preserveLogs) {
      setCrawlLogs([]);
    }
    setCrawlSummary(null);

    try {
      console.log("开始发送爬取请求...");
      const response = await fetch("/api/tenders/crawl", {
        method: "POST",
        signal: abortControllerRef.current.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          regions: selectedRegions.length > 0 ? selectedRegions.join(",") : undefined,
          keywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
          excludeKeywords: excludeKeywords.length > 0 ? excludeKeywords : undefined,
          searchProvider,
        }),
      });

      console.log("收到响应，状态:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("响应错误:", errorText);
        throw new Error(`爬取请求失败: ${response.status} ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      console.log("开始读取响应流...");

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("流读取完成");
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const data = line.replace("data: ", "").trim();
          try {
            const message: CrawlMessage = JSON.parse(data);

            if (message.type === "start") {
              setCrawlLogs((prev) => [...prev, message]);
            }

            if (message.type === "resume") {
              setCurrentCrawlProgress({
                id: "resume",
                crawlType: "tenders",
                schoolName: null,
                currentIndex: message.startIndex || 0,
                totalSchools: message.total || 0,
                status: "running",
                completedSchools: message.completedSchools || 0,
                failedSchools: message.failedSchools || 0,
                totalCount: message.completedSchools || 0,
                errorMessage: null,
                lastCrawledAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              // 初始化爬取进度统计
              setCrawlStats({
                completed: message.startIndex || 0,
                total: message.total || 0,
              });
              // 设置本次爬取的基准招标信息数（初始为0）
              setCurrentCrawlCount(0);
              setCrawlLogs((prev) => [...prev, message]);
            }

            if (message.type === "warning") {
              setCurrentCrawlProgress({
                id: "completed",
                crawlType: "tenders",
                schoolName: null,
                currentIndex: message.completedSchools || 0,
                totalSchools: message.completedSchools || 0,
                status: "completed",
                completedSchools: message.completedSchools || 0,
                failedSchools: 0,
                totalCount: message.completedSchools || 0,
                errorMessage: null,
                lastCrawledAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              setCrawlLogs((prev) => [...prev, message]);
            }

            if (message.type === "paused" || message.type === "auto_paused") {
              setPaused(true);
              setPaused(true);
              setCrawlLogs((prev) => [...prev, message]);

              // 更新进度信息，使用本次新增的招标信息条数
              const currentCount = message.currentCount || 0;
              setCurrentCrawlCount(currentCount);

              if (currentCrawlProgress) {
                setCurrentCrawlProgress({
                  ...currentCrawlProgress,
                  status: "paused",
                  totalCount: currentCount, // 使用本次新增的招标信息条数
                  errorMessage: message.reason || null,
                });
              }
            }

            if (message.type === "progress") {
              setCrawlProgress(message.progress || 0);
              if (message.current !== undefined && message.total !== undefined) {
                setCrawlStats({
                  completed: Math.max(0, message.current - 1), // 已完成的学校数量
                  total: message.total,
                });
              }
              // 更新本次爬取新增的招标信息条数
              const currentCount = message.currentCount || 0;
              setCurrentCrawlCount(currentCount);
              if (currentCrawlProgress) {
                setCurrentCrawlProgress({
                  ...currentCrawlProgress,
                  totalCount: currentCount,
                });
              }
            }

            if (message.type === "tender" && message.data) {
              // 实时添加新爬取的招标信息到列表
              setTenders((prev) => [message.data!, ...prev]);
              // 更新总数
              setTotalCount((prev) => prev + 1);
            }

            if (message.type === "complete") {
              setCrawlSummary(message.summary || null);
              setCrawlProgress(100);
              setCurrentCrawlProgress(null);
              // 刷新列表确保数据完整
              setCurrentPage(1);
              fetchTenders(searchSchoolName, 1);
            }

            // 忽略心跳消息
            if (message.type !== "heartbeat") {
              setCrawlLogs((prev) => [...prev, message]);
            }
          } catch (e) {
            console.error("解析消息失败:", e, "原始数据:", data);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("爬取已取消");
        setCrawlLogs((prev) => [
          ...prev,
          {
            type: "info",
            message: "爬取已取消",
          },
        ]);
      } else {
        console.error("爬取失败:", error);
        setCrawlLogs((prev) => [
          ...prev,
          {
            type: "error",
            message: "爬取失败：" + (error as Error).message,
          },
        ]);
      }
    } finally {
      // 无论如何都设置 crawling 为 false
      // 如果是暂停状态，paused 会被设置为 true，用于显示恢复按钮
      setCrawling(false);
      abortControllerRef.current = null;
    }
  };

  // 停止爬取
  const stopCrawling = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setCrawling(false);
      setPaused(false);
    }
  };

  // 暂停爬取
  const pauseCrawling = async () => {
    if (!crawling || paused) return;

    try {
      const response = await fetch("/api/tenders/crawl/pause", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setCrawlLogs((prev) => [
          ...prev,
          {
            type: "info",
            message: "暂停指令已发送，等待当前学校爬取完成...",
          },
        ]);
      } else {
        alert(result.error || "暂停失败");
      }
    } catch (error) {
      console.error("暂停失败:", error);
      alert("暂停失败，请重试");
    }
  };

  // 恢复爬取
  const resumeCrawling = async () => {
    if (!paused || crawling) return;

    try {
      // 先恢复暂停状态
      const response = await fetch("/api/tenders/crawl/pause", {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setPaused(false);
        await startCrawling(true); // 保留已有日志
      } else {
        alert(result.error || "恢复失败");
      }
    } catch (error) {
      console.error("恢复失败:", error);
      alert("恢复失败，请重试");
    }
  };

  // 导出招标信息为CSV
  const exportTenders = () => {
    if (tenders.length === 0) {
      alert("没有可导出的数据");
      return;
    }

    // CSV表头
    const headers = ["学校名称", "发布时间", "爬取时间", "招标信息链接", "备注"];

    // 转换数据为CSV格式
    const csvContent = [
      headers.join(","),
      ...tenders.map((tender) => [
        `"${tender.schoolName.replace(/"/g, '""')}"`, // 转义双引号
        `"${new Date(tender.createdAt).toLocaleDateString("zh-CN")}"`,
        `"${new Date(tender.crawledAt).toLocaleString("zh-CN")}"`,
        `"${tender.link || ""}"`,
        `"${(tender.remark || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`, // 处理换行和引号
      ].join(",")),
    ].join("\n");

    // 创建Blob对象
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" }); // 添加BOM防止乱码

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `招标信息_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 清空所有招标信息
  const clearAllTenders = async () => {
    if (!confirm("确定要清空所有招标信息吗？此操作不可恢复！")) return;

    try {
      const response = await fetch("/api/tenders/clear-all", {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setCurrentPage(1);
        setTotalCount(0);
        setTenders([]);
        fetchTenders(searchSchoolName, 1);

        // 同时重置爬取进度
        await resetCrawlProgress();
      } else {
        alert(result.error || "清空失败");
      }
    } catch (error) {
      console.error("清空失败:", error);
      alert("清空失败，请重试");
    }
  };

  useEffect(() => {
    const storedSearchProvider = window.localStorage.getItem(
      SEARCH_PROVIDER_STORAGE_KEY,
    );
    if (storedSearchProvider === "coze" || storedSearchProvider === "python") {
      setSearchProvider(storedSearchProvider);
    }

    fetchTenders(undefined, 1);
    fetchCrawlProgress();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_PROVIDER_STORAGE_KEY, searchProvider);
  }, [SEARCH_PROVIDER_STORAGE_KEY, searchProvider]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">招标信息爬取</h1>
            <div className="flex items-center gap-2">
              <HelpManual page="tenders" />
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="/schools">学校管理</a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/history">爬取历史</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">返回首页</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          {/* 搜索和操作按钮 */}
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-1 items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索学校名称..."
                value={searchSchoolName}
                onChange={(e) => setSearchSchoolName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchTenders(searchSchoolName);
                }}
                className="max-w-sm"
              />
              <Button onClick={() => {
                setCurrentPage(1);
                fetchTenders(searchSchoolName, 1);
              }}>搜索</Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {searchSchoolName && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`确定要删除"${searchSchoolName}"的所有招标信息吗？`)) {
                      fetch(`/api/tenders?schoolName=${encodeURIComponent(searchSchoolName)}`, {
                        method: "DELETE",
                      })
                        .then(res => res.json())
                        .then(result => {
                          if (result.success) {
                            alert(result.message);
                            setCurrentPage(1);
                            fetchTenders(undefined, 1);
                          } else {
                            alert(result.error || "删除失败");
                          }
                        })
                        .catch(err => {
                          console.error("删除失败:", err);
                          alert("删除失败，请重试");
                        });
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  清空该学校数据
                </Button>
              )}

              <Button
                variant="outline"
                onClick={clearAllTenders}
                disabled={loading || tenders.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空全部
              </Button>

              <Button
                variant="outline"
                onClick={exportTenders}
                disabled={tenders.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                导出CSV
              </Button>

              {paused ? (
                <Button onClick={resumeCrawling}>
                  <Play className="mr-2 h-4 w-4" />
                  恢复爬取
                </Button>
              ) : crawling ? (
                <>
                  <Button variant="outline" onClick={pauseCrawling}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    暂停爬取
                  </Button>
                  <Button variant="destructive" onClick={stopCrawling}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    停止爬取
                  </Button>
                </>
              ) : (
                <Button onClick={() => startCrawling()} disabled={crawling}>
                  <Play className="mr-2 h-4 w-4" />
                  开始爬取
                </Button>
              )}

              {/* 显示当前爬取进度状态 */}
              {currentCrawlProgress && !crawling && (
                <>
                  {currentCrawlProgress.status === "completed" ? (
                    <Button
                      variant="outline"
                      onClick={resetCrawlProgress}
                      disabled={loading}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      重置进度
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* 显示当前爬取进度信息 */}
          {/* 爬取进度 */}
          {crawling && (
            <div className="rounded-lg border bg-card p-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">爬取进度</span>
                  <div className="flex-1 text-center">
                    {crawlStats.total > 0 && (
                      <span className="text-muted-foreground">
                        已爬取 {crawlStats.completed} / {crawlStats.total} 所学校
                      </span>
                    )}
                    {crawlStats.total === 0 && (
                      <span className="text-muted-foreground">正在初始化...</span>
                    )}
                  </div>
                  <span>{crawlProgress}%</span>
                </div>
                <Progress value={crawlProgress} />
              </div>
            </div>
          )}

          {/* 爬取日志 */}
          {(crawlLogs.length > 0 || currentCrawlProgress) && (
            <div className="rounded-lg border bg-card p-4">
              {/* 显示当前进度数据 */}
              {currentCrawlProgress && !crawling && (
                <div className="mb-4 border-b pb-4">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        currentCrawlProgress.status === "completed" ? "bg-green-500" :
                        currentCrawlProgress.status === "failed" ? "bg-red-500" :
                        currentCrawlProgress.status === "paused" ? "bg-amber-500" :
                        "bg-blue-500"
                      }`} />
                      <span className="font-semibold text-sm">
                        {currentCrawlProgress.status === "completed" ? "爬取已完成" :
                         currentCrawlProgress.status === "failed" ? "爬取失败" :
                         currentCrawlProgress.status === "paused" ? "爬取已暂停" :
                         "爬取进行中"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">{currentCrawlProgress.currentIndex + 1}</span>/{currentCrawlProgress.totalSchools} 所学校
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-green-600 dark:text-green-400">{currentCrawlProgress.completedSchools}</span> 成功
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-red-600 dark:text-red-400">{currentCrawlProgress.failedSchools}</span> 失败
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{currentCrawlProgress.totalCount}</span> 条招标信息
                    </div>
                  </div>
                </div>
              )}

              {/* 爬取日志 */}
              {crawlLogs.length > 0 && (
                <>
                  <h3 className="mb-2 font-semibold">爬取日志</h3>
                  <div className="space-y-1 max-h-[112px] overflow-y-auto">
                    {crawlLogs.slice().reverse().map((log, index) => (
                      <div
                        key={index}
                        className={`text-xs ${
                          log.type === "error"
                            ? "text-destructive"
                            : log.type === "success"
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {log.schoolName && <span className="font-medium">[{log.schoolName}]</span>}{" "}
                        {log.message}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 爬取摘要 */}
              {crawlSummary && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-semibold">爬取完成</h4>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{crawlSummary.total}</div>
                      <div className="text-sm text-muted-foreground">处理学校</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {crawlSummary.completedSchools}
                      </div>
                      <div className="text-sm text-muted-foreground">成功爬取</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-destructive">
                        {crawlSummary.failedSchools}
                      </div>
                      <div className="text-sm text-muted-foreground">失败</div>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {crawlSummary.totalCount}
                    </div>
                    <div className="text-sm text-muted-foreground">总招标信息</div>
                  </div>
                  <div className="mt-4 text-center">
                    <Button variant="outline" asChild>
                      <a href="/history">
                        <History className="mr-2 h-4 w-4" />
                        查看历史记录
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 学校清单 */}
          <div className="mt-4 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <List className="h-4 w-4" />
                学校清单
                {selectedRegions.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {isLoadingSchools ? "(加载中...)" : `(已选 ${schoolTotalCount} 所)`}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {/* 筛选地区按钮 */}
                <Dialog open={isRegionSelectorOpen} onOpenChange={setIsRegionSelectorOpen}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRegionSelectorOpen(true)}
                    disabled={crawling}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    筛选地区 {selectedRegions.length > 0 && `(${selectedRegions.length})`}
                  </Button>
                  <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>选择地区</DialogTitle>
                      <DialogDescription>
                        选择要爬取的地区，系统将只爬取这些地区的学校
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                      <RegionSelector
                        selectedRegions={selectedRegions}
                        onRegionChange={(regions) => {
                          setSelectedRegions(regions);
                          setSchoolCurrentPage(1);
                          if (regions.length > 0) {
                            fetchFilteredSchools(regions, 1);
                          } else {
                            setFilteredSchools([]);
                            setSchoolTotalCount(0);
                          }
                        }}
                        disabled={crawling}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => setIsRegionSelectorOpen(false)}
                        disabled={crawling}
                      >
                        确定
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {selectedRegions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRegions([]);
                      setFilteredSchools([]);
                      setSchoolTotalCount(0);
                    }}
                    disabled={crawling}
                  >
                    清除筛选
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsSchoolListCollapsed(!isSchoolListCollapsed)}
                  title={isSchoolListCollapsed ? "展开学校清单" : "折叠学校清单"}
                >
                  {isSchoolListCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {!isSchoolListCollapsed && (
              <>
                <div className="border rounded-md max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">序号</TableHead>
                        <TableHead>学校名称</TableHead>
                        <TableHead>地区</TableHead>
                        <TableHead>类型</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingSchools ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            加载中...
                          </TableCell>
                        </TableRow>
                      ) : filteredSchools.length === 0 && selectedRegions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            请先选择地区筛选学校
                          </TableCell>
                        </TableRow>
                      ) : filteredSchools.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            没有找到匹配的学校
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSchools.map((school, index) => (
                          <TableRow key={school.id}>
                            <TableCell className="text-center">{(schoolCurrentPage - 1) * schoolPageSize + index + 1}</TableCell>
                            <TableCell className="font-medium">{school.name}</TableCell>
                            <TableCell>{school.region || "-"}</TableCell>
                            <TableCell>{school.schoolType || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* 分页 */}
                {schoolTotalCount > schoolPageSize && (
                  <div className="mt-4 flex items-center justify-between">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => {
                              if (schoolCurrentPage > 1) {
                                fetchFilteredSchools(undefined, schoolCurrentPage - 1);
                              }
                            }}
                            className={schoolCurrentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>

                        {Array.from({ length: Math.ceil(schoolTotalCount / schoolPageSize) }, (_, i) => i + 1)
                          .filter(page => {
                            return (
                              page === 1 ||
                              page === Math.ceil(schoolTotalCount / schoolPageSize) ||
                              Math.abs(page - schoolCurrentPage) <= 2
                            );
                          })
                          .map((page, index, filteredPages) => {
                            if (index > 0 && filteredPages[index - 1] !== page - 1) {
                              return (
                                <PaginationItem key={`ellipsis-${page}`}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => fetchFilteredSchools(undefined, page)}
                                  isActive={page === schoolCurrentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => {
                              if (schoolCurrentPage < Math.ceil(schoolTotalCount / schoolPageSize)) {
                                fetchFilteredSchools(undefined, schoolCurrentPage + 1);
                              }
                            }}
                            className={schoolCurrentPage === Math.ceil(schoolTotalCount / schoolPageSize) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    <div className="text-sm text-muted-foreground">
                      共 {Math.ceil(schoolTotalCount / schoolPageSize)} 页，共 {schoolTotalCount} 所学校
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 爬取关键词选择 */}
        <div className="mb-4 rounded-lg border bg-card p-3">
          <div className="mb-4 rounded-md border p-3">
            <div className="mb-2 flex items-center gap-2">
              <h3 className="font-semibold text-sm">搜索源</h3>
              <Badge
                variant={searchProvider === "coze" ? "destructive" : "secondary"}
                className="text-xs"
              >
                {searchProvider === "coze" ? "消耗 Coze 点数" : "低成本"}
              </Badge>
            </div>
            <RadioGroup
              value={searchProvider}
              onValueChange={(value) => setSearchProvider(value as SearchProvider)}
              className="grid grid-cols-1 gap-3 md:grid-cols-2"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <RadioGroupItem
                  value="python"
                  id="search-provider-python"
                  disabled={crawling || paused}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">Python/DuckDuckGo</div>
                  <div className="text-xs text-muted-foreground">
                    低成本替代搜索源，不消耗 Coze 点数
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
                <RadioGroupItem
                  value="coze"
                  id="search-provider-coze"
                  disabled={crawling || paused}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-medium text-sm">Coze WebSearch</div>
                  <div className="text-xs text-muted-foreground">
                    保留当前搜索能力，会消耗 Coze 资源点数
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 搜索关键词 */}
            <div>
              <h3 className="mb-2 font-semibold text-sm flex items-center gap-2">
                搜索关键词
                <Badge variant="outline" className="text-xs">必须包含</Badge>
              </h3>
              <KeywordSelector
                selectedKeywords={selectedKeywords}
                onSelectionChange={setSelectedKeywords}
                category="search"
                placeholder="选择或添加搜索关键词..."
              />
              <div className="mt-2 text-xs text-muted-foreground">
                <p>点击关键词之间的按钮可切换逻辑关系：AND（同时包含）、OR（包含其一）</p>
              </div>
            </div>

            {/* 排除关键词 */}
            <div>
              <h3 className="mb-2 font-semibold text-sm flex items-center gap-2">
                排除关键词
                <Badge variant="destructive" className="text-xs">不包含</Badge>
              </h3>
              <ExcludeKeywordSelector
                selectedKeywords={excludeKeywords}
                onSelectionChange={setExcludeKeywords}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                <p>选择要排除的关键词，结果中包含这些关键词将被过滤</p>
              </div>
            </div>
          </div>
        </div>

        {/* 招标信息列表 */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center whitespace-nowrap">编号</TableHead>
                <TableHead>学校名称</TableHead>
                <TableHead className="whitespace-nowrap">发布时间</TableHead>
                <TableHead className="whitespace-nowrap">爬取时间</TableHead>
                <TableHead>招标信息链接</TableHead>
                <TableHead>备注</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : tenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    暂无招标信息，请点击"开始爬取"按钮
                  </TableCell>
                </TableRow>
              ) : (
                tenders.map((tender, index) => (
                  <TableRow key={tender.id}>
                    <TableCell className="text-center">{totalCount - ((currentPage - 1) * pageSize + index)}</TableCell>
                    <TableCell className="font-medium">{tender.schoolName}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(tender.createdAt).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(tender.crawledAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      {tender.link ? (
                        <a
                          href={tender.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {tender.link.length > 50
                            ? tender.link.substring(0, 50) + "..."
                            : tender.link}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {tender.remark || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        {totalCount > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        fetchTenders(searchSchoolName, currentPage - 1);
                      }
                    }}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                  .filter(page => {
                    // 显示当前页附近和首页尾页
                    return (
                      page === 1 ||
                      page === Math.ceil(totalCount / pageSize) ||
                      Math.abs(page - currentPage) <= 2
                    );
                  })
                  .map((page, index, filteredPages) => {
                    // 添加省略号
                    if (index > 0 && filteredPages[index - 1] !== page - 1) {
                      return (
                        <PaginationItem key={`ellipsis-${page}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => {
                            setCurrentPage(page);
                            fetchTenders(searchSchoolName, page);
                          }}
                          isActive={page === currentPage}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => {
                      if (currentPage < Math.ceil(totalCount / pageSize)) {
                        setCurrentPage(currentPage + 1);
                        fetchTenders(searchSchoolName, currentPage + 1);
                      }
                    }}
                    className={currentPage === Math.ceil(totalCount / pageSize) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground">
              共 {Math.ceil(totalCount / pageSize)} 页，共 {totalCount} 条招标信息
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
