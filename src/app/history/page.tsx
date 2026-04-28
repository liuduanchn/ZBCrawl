"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TenderDataTable } from "@/components/TenderDataTable";
import { History, Clock, CheckCircle, XCircle, FileText, Download, X } from "lucide-react";

interface CrawlHistoryItem {
  id: string;
  crawlType: string;
  regions: string | null;
  keywords: string | null;
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

export default function HistoryPage() {
  const [histories, setHistories] = useState<CrawlHistoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<CrawlHistoryItem | null>(null);

  // 获取历史记录
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
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("获取历史记录失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 删除历史记录
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
        fetchHistories(currentPage);
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除历史记录失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 导出历史记录数据
  const exportHistoryData = (history: CrawlHistoryItem) => {
    if (!history.tenderData) {
      alert("没有可导出的数据");
      return;
    }

    try {
      const data = JSON.parse(history.tenderData);

      // 转义 CSV 字段：包含逗号、双引号或换行符时，用双引号包裹，并将双引号转义为 ""
      const escapeCsvField = (field: any): string => {
        const str = String(field || "");
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvContent = [
        ["序号", "学校名称", "链接", "备注", "发布时间", "爬取时间"],
        ...data.map((item: any, index: number) => [
          index + 1,
          item.schoolName || "",
          item.link || "",
          item.remark || "",
          item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : "",
          item.crawledAt ? new Date(item.crawledAt).toLocaleString("zh-CN") : "",
        ])
      ].map(row => row.map(escapeCsvField).join(",")).join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `招标信息_${new Date(history.startedAt).toLocaleDateString("zh-CN")}.csv`;
      link.click();
    } catch (error) {
      console.error("导出失败:", error);
      alert("导出失败");
    }
  };

  useEffect(() => {
    fetchHistories();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            爬取历史记录
          </h1>
          <p className="text-muted-foreground mt-2">
            查看和管理历史爬取记录
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = "/tenders"}
          className="shrink-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">编号</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>地区筛选</TableHead>
                <TableHead>关键词</TableHead>
                <TableHead className="text-center">学校总数</TableHead>
                <TableHead className="text-center">成功</TableHead>
                <TableHead className="text-center">失败</TableHead>
                <TableHead className="text-center">招标信息</TableHead>
                <TableHead>耗时</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : histories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                    暂无历史记录
                  </TableCell>
                </TableRow>
              ) : (
                histories.map((history, index) => {
                  const historyNumber = totalCount - ((currentPage - 1) * pageSize + index);
                  return (
                    <TableRow key={history.id}>
                      <TableCell className="text-center">{historyNumber}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(history.startedAt).toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell>
                        {history.regions ? (
                          <div className="flex flex-wrap gap-1">
                            {history.regions.split(",").map((region, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {region.trim()}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">全部</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {history.keywords ? (
                          <div className="text-xs max-w-[200px]">
                            {history.keywords}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">默认</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{history.totalSchools}</TableCell>
                      <TableCell className="text-center text-green-600">
                        {history.successSchools}
                      </TableCell>
                      <TableCell className="text-center text-red-600">
                        {history.failedSchools}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-blue-600">
                          {history.tenderCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {history.duration ? formatDuration(history.duration) : "-"}
                      </TableCell>
                      <TableCell>
                        {history.errorMessage ? (
                          <Badge variant="destructive" className="text-xs">
                            失败
                          </Badge>
                        ) : history.completedAt ? (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            完成
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            进行中
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedHistory(history)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="!max-w-[80vw] w-full">
                              <DialogHeader>
                                <DialogTitle>爬取详情</DialogTitle>
                                <DialogDescription>
                                  查看本次爬取的详细信息
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 p-4">
                                  <div className="grid grid-cols-8 gap-2">
                                    <div>
                                      <p className="text-sm font-semibold">开始时间</p>
                                      <p className="text-xs text-muted-foreground truncate" title={new Date(history.startedAt).toLocaleString("zh-CN")}>
                                        {new Date(history.startedAt).toLocaleString("zh-CN")}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">完成时间</p>
                                      <p className="text-xs text-muted-foreground truncate" title={history.completedAt ? new Date(history.completedAt).toLocaleString("zh-CN") : "-"}>
                                        {history.completedAt
                                          ? new Date(history.completedAt).toLocaleString("zh-CN")
                                          : "-"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">地区筛选</p>
                                      <p className="text-xs text-muted-foreground truncate" title={history.regions || "全部"}>
                                        {history.regions || "全部"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">耗时</p>
                                      <p className="text-xs text-muted-foreground">
                                        {history.duration ? formatDuration(history.duration) : "-"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">学校总数</p>
                                      <p className="text-xs text-muted-foreground">
                                        {history.totalSchools}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">成功学校</p>
                                      <p className="text-xs text-muted-foreground text-green-600">
                                        {history.successSchools}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">失败学校</p>
                                      <p className="text-xs text-muted-foreground text-red-600">
                                        {history.failedSchools}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-semibold">招标信息</p>
                                      <p className="text-xs text-muted-foreground text-blue-600">
                                        {history.tenderCount}
                                      </p>
                                    </div>
                                  </div>

                                  {history.errorMessage && (
                                    <div className="p-4 bg-destructive/10 rounded-lg">
                                      <p className="text-sm font-semibold text-destructive">错误信息</p>
                                      <p className="text-sm text-destructive mt-1">
                                        {history.errorMessage}
                                      </p>
                                    </div>
                                  )}

                                  {history.tenderData && (
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm font-semibold">
                                          招标信息数据
                                          <span className="text-muted-foreground font-normal ml-2">
                                            (共 {history.tenderCount} 条，显示前 {JSON.parse(history.tenderData).length} 条)
                                          </span>
                                        </p>
                                        <Button
                                          onClick={() => exportHistoryData(history)}
                                          size="sm"
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          导出数据
                                        </Button>
                                      </div>
                                      <TenderDataTable data={JSON.parse(history.tenderData)} />
                                    </div>
                                  )}
                                </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteHistory(history.id)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {totalCount > pageSize && (
            <div className="mt-6 flex items-center justify-between">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (currentPage > 1) {
                          fetchHistories(currentPage - 1);
                        }
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.ceil(totalCount / pageSize) }, (_, i) => i + 1)
                    .filter(page => {
                      return (
                        page === 1 ||
                        page === Math.ceil(totalCount / pageSize) ||
                        Math.abs(page - currentPage) <= 2
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
                            onClick={() => fetchHistories(page)}
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
                          fetchHistories(currentPage + 1);
                        }
                      }}
                      className={currentPage === Math.ceil(totalCount / pageSize) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              <div className="text-sm text-muted-foreground">
                共 {Math.ceil(totalCount / pageSize)} 页，共 {totalCount} 条记录
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const parts = [];
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分`);
    if (remainingSeconds > 0) parts.push(`${remainingSeconds}秒`);
    return parts.join("");
  }
}
