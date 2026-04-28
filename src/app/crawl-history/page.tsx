"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Eye, Trash2, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";

interface CrawlHistoryRecord {
  id: string;
  crawlType: string;
  regions: string | null;
  totalSchools: number;
  successSchools: number;
  failedSchools: number;
  tenderCount: number;
  tenderData: string | null;
  duration: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

interface Tender {
  id: string;
  schoolName: string;
  crawledAt: string;
  link: string | null;
  remark: string | null;
}

export default function CrawlHistoryPage() {
  const [histories, setHistories] = useState<CrawlHistoryRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState<CrawlHistoryRecord | null>(null);

  const fetchHistories = async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("skip", String((page - 1) * pageSize));
      params.append("limit", String(pageSize));
      params.append("crawlType", "tenders");

      const response = await fetch(`/api/crawl-history?${params}`);
      const result = await response.json();

      if (result.success) {
        setHistories(result.data);
        setTotalCount(parseInt(result.total || 0, 10));
      }
    } catch (error) {
      console.error("获取爬取历史记录失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm("确定要删除这条历史记录吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/crawl-history/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert("删除成功");
        fetchHistories(currentPage);
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      alert("删除失败，请重试");
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTendersFromData = (tenderData: string | null): Tender[] => {
    if (!tenderData) return [];
    try {
      return JSON.parse(tenderData);
    } catch (e) {
      console.error("解析招标信息数据失败:", e);
      return [];
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            爬取历史记录
          </h1>
          <p className="text-muted-foreground mt-2">
            查看和管理招标信息爬取的历史记录
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>编号</TableHead>
              <TableHead>筛选地区</TableHead>
              <TableHead>学校统计</TableHead>
              <TableHead>招标信息</TableHead>
              <TableHead>耗时</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  加载中...
                </TableCell>
              </TableRow>
            ) : histories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  暂无历史记录
                </TableCell>
              </TableRow>
            ) : (
              histories.map((history, index) => (
                <TableRow key={history.id}>
                  <TableCell className="text-center">
                    {totalCount - ((currentPage - 1) * pageSize + index)}
                  </TableCell>
                  <TableCell>
                    {history.regions ? (
                      <Badge variant="secondary">{history.regions}</Badge>
                    ) : (
                      <span className="text-muted-foreground">全部地区</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{history.totalSchools}</span> 总数
                      <span className="mx-2 text-muted-foreground">|</span>
                      <CheckCircle2 className="inline h-3 w-3 text-green-500" />
                      <span className="text-green-600 ml-1">{history.successSchools}</span>
                      <span className="mx-2 text-muted-foreground">|</span>
                      <XCircle className="inline h-3 w-3 text-red-500" />
                      <span className="text-red-600 ml-1">{history.failedSchools}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{history.tenderCount}</span>
                      <span className="text-muted-foreground">条</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(history.duration)}</TableCell>
                  <TableCell className="text-sm">
                    {formatDate(history.startedAt)}
                  </TableCell>
                  <TableCell>
                    {history.completedAt ? (
                      <Badge variant="default" className="bg-green-500">
                        已完成
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        失败
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedHistory(history)}
                          >
                            <Eye className="h-4 w-4" />
                            查看
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                          <DialogHeader>
                            <DialogTitle>爬取详情</DialogTitle>
                            <DialogDescription>
                              查看本次爬取的详细信息
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="flex-1 mt-4">
                            {selectedHistory && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">基本信息</h4>
                                    <div className="space-y-1 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">爬取类型：</span>
                                        <span>{selectedHistory.crawlType}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">筛选地区：</span>
                                        <span>
                                          {selectedHistory.regions || "全部地区"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">开始时间：</span>
                                        <span>{formatDate(selectedHistory.startedAt)}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">完成时间：</span>
                                        <span>
                                          {selectedHistory.completedAt
                                            ? formatDate(selectedHistory.completedAt)
                                            : "未完成"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">耗时：</span>
                                        <span>{formatDuration(selectedHistory.duration)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-semibold mb-2">统计信息</h4>
                                    <div className="space-y-1 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">总学校数：</span>
                                        <span className="font-medium">
                                          {selectedHistory.totalSchools}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">成功学校：</span>
                                        <span className="text-green-600 font-medium">
                                          {selectedHistory.successSchools}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">失败学校：</span>
                                        <span className="text-red-600 font-medium">
                                          {selectedHistory.failedSchools}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          招标信息数：
                                        </span>
                                        <span className="text-blue-600 font-medium">
                                          {selectedHistory.tenderCount}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {selectedHistory.errorMessage && (
                                  <div>
                                    <h4 className="font-semibold mb-2 text-red-600">错误信息</h4>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm text-red-600">
                                      {selectedHistory.errorMessage}
                                    </div>
                                  </div>
                                )}

                                {selectedHistory.tenderData && (
                                  <div>
                                    <h4 className="font-semibold mb-2">招标信息结果</h4>
                                    <div className="border rounded-md overflow-hidden">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>序号</TableHead>
                                            <TableHead>学校名称</TableHead>
                                            <TableHead>爬取时间</TableHead>
                                            <TableHead>链接</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {getTendersFromData(
                                            selectedHistory.tenderData
                                          ).map((tender: Tender, idx: number) => (
                                            <TableRow key={tender.id}>
                                              <TableCell className="text-center">
                                                {idx + 1}
                                              </TableCell>
                                              <TableCell>{tender.schoolName}</TableCell>
                                              <TableCell className="text-sm">
                                                {formatDate(tender.crawledAt)}
                                              </TableCell>
                                              <TableCell>
                                                {tender.link ? (
                                                  <a
                                                    href={tender.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline text-sm"
                                                  >
                                                    {tender.link.length > 50
                                                      ? tender.link.substring(0, 50) +
                                                        "..."
                                                      : tender.link}
                                                  </a>
                                                ) : (
                                                  <span className="text-muted-foreground text-sm">
                                                    -
                                                  </span>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteHistory(history.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* 分页 */}
        {totalCount > pageSize && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage > 1) {
                  setCurrentPage(currentPage - 1);
                  fetchHistories(currentPage - 1);
                }
              }}
              disabled={currentPage === 1}
            >
              上一页
            </Button>
            <span className="text-sm text-muted-foreground">
              第 {currentPage} 页，共 {Math.ceil(totalCount / pageSize)} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentPage < Math.ceil(totalCount / pageSize)) {
                  setCurrentPage(currentPage + 1);
                  fetchHistories(currentPage + 1);
                }
              }}
              disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
