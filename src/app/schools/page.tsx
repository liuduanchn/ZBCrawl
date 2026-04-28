"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Pencil, Trash2, Search, Plus, AlertCircle, CheckCircle, Loader2, Database } from "lucide-react";
import { HelpManual } from "@/components/HelpManual";

interface School {
  id: string;
  sequence: string | null;
  name: string;
  region: string | null;
  schoolType: string | null;
  highLevel: string | null;
  educationLevel: string | null;
  detailUrl: string | null;
  website: string | null;
  crawlSourceUrl: string | null;
  crawlSourceName: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface CrawlLog {
  type: "start" | "page" | "pageComplete" | "school" | "error" | "complete";
  message: string;
  timestamp: string;
  page?: number;
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCrawlDialogOpen, setIsCrawlDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolWebsite, setNewSchoolWebsite] = useState("");
  const [newSchoolRegion, setNewSchoolRegion] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // 爬取状态
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlLogs, setCrawlLogs] = useState<CrawlLog[]>([]);
  const [crawlStats, setCrawlStats] = useState({ created: 0, updated: 0, skipped: 0 });

  // 网络测试状态
  const [isTestingNetwork, setIsTestingNetwork] = useState(false);
  const [networkTestResult, setNetworkTestResult] = useState<string | null>(null);

  // 批量更新地区状态
  const [isBatchUpdateDialogOpen, setIsBatchUpdateDialogOpen] = useState(false);
  const [batchUpdateRegion, setBatchUpdateRegion] = useState("");
  const [batchUpdateSelectedSchools, setBatchUpdateSelectedSchools] = useState<string[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  // 获取学校列表
  const fetchSchools = async (name?: string, page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (name) params.append("name", name);
      params.append("skip", String((page - 1) * pageSize));
      params.append("limit", String(pageSize));

      const response = await fetch(`/api/schools?${params}`);
      const result = await response.json();

      if (result.success) {
        setSchools(result.data);
        setTotalCount(parseInt(result.total || 0, 10));
      }
    } catch (error) {
      console.error("获取学校列表失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 添加学校
  const handleAddSchool = async () => {
    if (!newSchoolName.trim()) {
      alert("请输入学校名称");
      return;
    }

    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSchoolName,
          website: newSchoolWebsite || null,
          region: newSchoolRegion || null,
        }),
      });

      const result = await response.json();

      console.log("添加学校响应:", result);

      if (result.success) {
        setNewSchoolName("");
        setNewSchoolWebsite("");
        setNewSchoolRegion("");
        setIsAddDialogOpen(false);
        setCurrentPage(1);
        fetchSchools(searchName, 1);
        alert("学校添加成功");
      } else {
        console.error("添加学校失败:", result.error, result.details);
        alert(`添加失败：${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("添加学校失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`添加失败：${errorMessage}\n请检查网络连接或稍后重试`);
    }
  };

  // 更新学校
  const handleUpdateSchool = async () => {
    if (!editingSchool) return;

    if (!newSchoolName.trim()) {
      alert("请输入学校名称");
      return;
    }

    try {
      const response = await fetch(`/api/schools/${editingSchool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSchoolName,
          website: newSchoolWebsite || null,
          sequence: editingSchool.sequence || null,
          region: editingSchool.region || null,
          schoolType: editingSchool.schoolType || null,
          highLevel: editingSchool.highLevel || null,
          educationLevel: editingSchool.educationLevel || null,
          detailUrl: editingSchool.detailUrl || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setEditingSchool(null);
        setIsEditDialogOpen(false);
        fetchSchools(searchName, currentPage);
        alert("学校信息更新成功");
      } else {
        alert(result.error || "更新失败，请重试");
      }
    } catch (error) {
      console.error("更新学校失败:", error);
      alert("更新失败，请检查网络连接或稍后重试");
    }
  };

  // 删除学校
  const handleDeleteSchool = async (id: string, schoolName: string) => {
    if (!confirm(`确定要删除学校 "${schoolName}" 吗？此操作不可恢复。`)) return;

    try {
      const response = await fetch(`/api/schools/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(`成功删除学校 "${schoolName}"`);
        fetchSchools(searchName, currentPage);
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除学校失败:", error);
      alert("删除失败，请重试");
    }
  };

  // 批量更新学校地区
  const handleBatchUpdateRegion = async () => {
    if (batchUpdateSelectedSchools.length === 0) {
      alert("请先选择要更新的学校");
      return;
    }

    if (!batchUpdateRegion.trim()) {
      alert("请输入地区");
      return;
    }

    if (!confirm(`确定要将 ${batchUpdateSelectedSchools.length} 所学校的地区更新为 "${batchUpdateRegion}" 吗？`)) {
      return;
    }

    setIsBatchUpdating(true);
    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchUpdate: true,
          updates: batchUpdateSelectedSchools.map(id => ({
            id,
            region: batchUpdateRegion,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setIsBatchUpdateDialogOpen(false);
        setBatchUpdateRegion("");
        setBatchUpdateSelectedSchools([]);
        fetchSchools(searchName, currentPage);
      } else {
        alert(result.error || "批量更新失败");
      }
    } catch (error) {
      console.error("批量更新失败:", error);
      alert("批量更新失败，请重试");
    } finally {
      setIsBatchUpdating(false);
    }
  };

  // 测试网络连通性
  const handleTestNetwork = async () => {
    setIsTestingNetwork(true);
    setNetworkTestResult(null);

    const testUrl = "http://school.nseac.com/a/zkyx.html";

    try {
      const response = await fetch("/api/test-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: testUrl }),
      });

      const result = await response.json();

      if (result.success) {
        const data = result.data;
        setNetworkTestResult(
          `✅ 网络测试通过\n\n` +
          `状态: ${data.status} ${data.statusText}\n` +
          `响应时间: ${data.duration}\n` +
          `内容长度: ${data.contentLength || 0} 字节\n` +
          `示例内容: ${data.sampleContent || '无'}`
        );
      } else {
        const diagnostic = result.diagnostic || {};
        let diagnosticInfo = "\n\n诊断信息:\n";
        if (diagnostic.isNetworkError) diagnosticInfo += "- 网络错误，可能是防火墙或网络限制\n";
        if (diagnostic.isTimeout) diagnosticInfo += "- 请求超时，网络响应过慢\n";
        if (diagnostic.isDNS) diagnosticInfo += "- DNS解析失败，域名无法访问\n";

        // 显示部署环境信息
        if (diagnostic.environment) {
          diagnosticInfo += "\n部署环境:\n";
          diagnosticInfo += `- 生产环境: ${diagnostic.environment.production ? '是' : '否'}\n`;
          if (diagnostic.environment.vercel === '是') {
            diagnosticInfo += `- 平台: Vercel\n`;
            diagnosticInfo += `⚠️ Vercel默认只允许HTTPS请求，HTTP请求会被阻止\n`;
            diagnosticInfo += `   建议升级到Pro版本或使用外部代理\n`;
          }
          if (diagnostic.environment.docker === '是') {
            diagnosticInfo += `- 平台: Docker容器\n`;
            diagnosticInfo += `⚠️ 容器可能有网络隔离\n`;
            diagnosticInfo += `   建议检查网络配置和端口映射\n`;
          }
        }

        // 显示建议
        let suggestionsInfo = "\n解决方案:\n";
        if (diagnostic.suggestions && diagnostic.suggestions.length > 0) {
          diagnostic.suggestions.forEach((s: string, i: number) => {
            suggestionsInfo += `${i + 1}. ${s}\n`;
          });
        } else {
          suggestionsInfo += `1. 检查生产环境网络配置\n`;
          suggestionsInfo += `2. 确认允许出站HTTP请求（端口80）\n`;
          suggestionsInfo += `3. 检查防火墙和安全组规则\n`;
          suggestionsInfo += `4. 如果是Vercel，考虑升级到Pro版本\n`;
        }

        setNetworkTestResult(
          `❌ 网络测试失败\n\n` +
          `错误: ${result.error}\n` +
          `响应时间: ${result.duration || '未知'}\n` +
          diagnosticInfo +
          suggestionsInfo
        );
      }
    } catch (error) {
      setNetworkTestResult(`❌ 测试请求失败: ${error}`);
    } finally {
      setIsTestingNetwork(false);
    }
  };

  // 清除所有学校数据
  const handleClearAllSchools = async () => {
    if (!confirm("确定要清空所有学校数据吗？此操作不可恢复！\n\n清空后需要重新爬取数据。")) return;
    if (!confirm("再次确认：确定要删除所有学校数据吗？")) return;

    try {
      const response = await fetch("/api/schools", {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setIsClearDialogOpen(false);
        setCurrentPage(1);
        fetchSchools(searchName, 1);
      } else {
        alert(result.error || "清除失败");
      }
    } catch (error) {
      console.error("清除学校数据失败:", error);
      alert("清除失败，请重试");
    }
  };

  // 爬取学校（流式）
  const handleCrawlSchools = async () => {
    setIsCrawling(true);
    setIsCrawlDialogOpen(true);
    setCrawlLogs([]);
    setCrawlStats({ created: 0, updated: 0, skipped: 0 });

    const addLog = (type: CrawlLog["type"], message: string, data?: any) => {
      setCrawlLogs(prev => [
        ...prev,
        {
          type,
          message,
          timestamp: new Date().toLocaleTimeString(),
          ...data,
        },
      ]);
    };

    try {
      const response = await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "" }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法获取响应流");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case "start":
                  addLog("start", data.message);
                  break;
                case "page":
                  addLog("page", data.message, { page: data.page, total: data.total });
                  break;
                case "pageComplete":
                  addLog("pageComplete", data.message, {
                    page: data.page,
                    pageCreated: data.pageCreated,
                    pageUpdated: data.pageUpdated,
                    pageSkipped: data.pageSkipped,
                  });
                  break;
                case "school":
                  addLog("school", data.message);
                  if (data.school?.action === "created") {
                    setCrawlStats(prev => ({ ...prev, created: prev.created + 1 }));
                  } else if (data.school?.action === "updated") {
                    setCrawlStats(prev => ({ ...prev, updated: prev.updated + 1 }));
                  }
                  break;
                case "complete":
                  addLog("complete", data.message, {
                    created: data.created,
                    updated: data.updated,
                    skipped: data.skipped,
                  });
                  setCrawlStats({
                    created: data.created || 0,
                    updated: data.updated || 0,
                    skipped: data.skipped || 0,
                  });
                  break;
                case "heartbeat":
                  // 心跳事件，忽略
                  break;
                case "error":
                  addLog("error", data.message);
                  break;
              }
            } catch (e) {
              console.error("解析SSE数据失败:", e);
            }
          }
        }
      }

      setTimeout(() => {
        setIsCrawling(false);
        setCurrentPage(1);
        fetchSchools(searchName, 1);
      }, 1500);
    } catch (error) {
      console.error("爬取学校失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 提供更详细的错误提示
      let detailedError = `爬取失败: ${errorMessage}`;
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        detailedError += "\n\n可能的原因:\n1. 生产环境网络限制，无法访问外部HTTP网站\n2. 防火墙或安全组规则阻止了出站请求\n3. DNS解析失败\n\n建议:\n- 检查生产环境的网络配置\n- 确认允许出站HTTP请求（端口80）\n- 检查防火墙规则";
      }

      addLog("error", detailedError);
      setIsCrawling(false);
    }
  };

  // 打开编辑对话框
  const openEditDialog = (school: School) => {
    setEditingSchool(school);
    setNewSchoolName(school.name);
    setNewSchoolWebsite(school.website || "");
    setIsEditDialogOpen(true);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">目标院校管理</h1>
            <div className="flex items-center gap-2">
              <HelpManual page="schools" />
              <Button variant="outline" asChild>
                <Link href="/">返回首页</Link>
              </Button>
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
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchSchools(searchName);
                }}
                className="max-w-sm"
              />
              <Button onClick={() => {
                setCurrentPage(1);
                fetchSchools(searchName, 1);
              }}>搜索</Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCrawlSchools} disabled={isCrawling}>
                {isCrawling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                开始爬取
              </Button>

              <Button
                variant="outline"
                onClick={handleTestNetwork}
                disabled={isTestingNetwork || isCrawling}
              >
                {isTestingNetwork && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                测试网络
              </Button>

              <Button
                variant="outline"
                onClick={() => setIsBatchUpdateDialogOpen(true)}
                disabled={totalCount === 0}
              >
                批量更新地区
              </Button>

              <Button
                variant="destructive"
                onClick={() => setIsClearDialogOpen(true)}
                disabled={totalCount === 0}
              >
                <Database className="mr-2 h-4 w-4" />
                清除数据
              </Button>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    添加学校
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加学校</DialogTitle>
                    <DialogDescription>输入学校信息</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="school-name">学校名称</Label>
                      <Input
                        id="school-name"
                        value={newSchoolName}
                        onChange={(e) => setNewSchoolName(e.target.value)}
                        placeholder="请输入学校名称"
                      />
                    </div>
                    <div>
                      <Label htmlFor="school-region">地区</Label>
                      <Input
                        id="school-region"
                        value={newSchoolRegion}
                        onChange={(e) => setNewSchoolRegion(e.target.value)}
                        placeholder="请输入地区（如：北京市、广东省）"
                      />
                    </div>
                    <div>
                      <Label htmlFor="school-website">官网</Label>
                      <Input
                        id="school-website"
                        value={newSchoolWebsite}
                        onChange={(e) => setNewSchoolWebsite(e.target.value)}
                        placeholder="请输入官网地址"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleAddSchool}>添加</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* 分页 */}
        {totalCount > 0 && (
          <div className="mb-4 flex items-center justify-between">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        fetchSchools(searchName, currentPage - 1);
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
                          onClick={() => {
                            setCurrentPage(page);
                            fetchSchools(searchName, page);
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
                        fetchSchools(searchName, currentPage + 1);
                      }
                    }}
                    className={currentPage === Math.ceil(totalCount / pageSize) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-muted-foreground">
              共 {Math.ceil(totalCount / pageSize)} 页，共 {totalCount} 所学校
            </div>
          </div>
        )}

        {/* 学校列表 */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <Checkbox
                    checked={batchUpdateSelectedSchools.length === schools.length && schools.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setBatchUpdateSelectedSchools(schools.map(s => s.id));
                      } else {
                        setBatchUpdateSelectedSchools([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="w-16 text-center whitespace-nowrap">序号</TableHead>
                <TableHead className="whitespace-nowrap">学校名称</TableHead>
                <TableHead className="whitespace-nowrap">地区</TableHead>
                <TableHead className="whitespace-nowrap">类型</TableHead>
                <TableHead className="whitespace-nowrap">办学层次</TableHead>
                <TableHead className="whitespace-nowrap">详情链接</TableHead>
                <TableHead className="whitespace-nowrap">爬取来源</TableHead>
                <TableHead className="w-32 text-right whitespace-nowrap">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : schools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    暂无学校数据，请添加或爬取学校
                  </TableCell>
                </TableRow>
              ) : (
                schools.map((school, index) => (
                  <TableRow key={school.id}>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={batchUpdateSelectedSchools.includes(school.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBatchUpdateSelectedSchools([...batchUpdateSelectedSchools, school.id]);
                          } else {
                            setBatchUpdateSelectedSchools(batchUpdateSelectedSchools.filter(id => id !== school.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-center">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.region || "-"}</TableCell>
                    <TableCell>{school.schoolType || "-"}</TableCell>
                    <TableCell>{school.educationLevel || "-"}</TableCell>
                    <TableCell>
                      {school.detailUrl ? (
                        <a
                          href={school.detailUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          查看
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {school.crawlSourceName ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{school.crawlSourceName}</span>
                          {school.crawlSourceUrl && (
                            <a
                              href={school.crawlSourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {school.crawlSourceUrl.length > 30
                                ? `${school.crawlSourceUrl.substring(0, 30)}...`
                                : school.crawlSourceUrl}
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(school)}
                          title="编辑"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSchool(school.id, school.name)}
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 编辑对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>编辑学校</DialogTitle>
              <DialogDescription>修改学校信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-school-name">学校名称</Label>
                  <Input
                    id="edit-school-name"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="请输入学校名称"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-school-website">官网</Label>
                  <Input
                    id="edit-school-website"
                    value={newSchoolWebsite}
                    onChange={(e) => setNewSchoolWebsite(e.target.value)}
                    placeholder="请输入官网地址"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-school-sequence">序号</Label>
                  <Input
                    id="edit-school-sequence"
                    value={editingSchool?.sequence || ""}
                    onChange={(e) => setEditingSchool({...editingSchool!, sequence: e.target.value})}
                    placeholder="序号"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-school-region">地区</Label>
                  <Input
                    id="edit-school-region"
                    value={editingSchool?.region || ""}
                    onChange={(e) => setEditingSchool({...editingSchool!, region: e.target.value})}
                    placeholder="地区"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-school-type">类型</Label>
                  <Input
                    id="edit-school-type"
                    value={editingSchool?.schoolType || ""}
                    onChange={(e) => setEditingSchool({...editingSchool!, schoolType: e.target.value})}
                    placeholder="类型"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-school-level">办学层次</Label>
                  <Input
                    id="edit-school-level"
                    value={editingSchool?.educationLevel || ""}
                    onChange={(e) => setEditingSchool({...editingSchool!, educationLevel: e.target.value})}
                    placeholder="办学层次"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-school-highlevel">高招</Label>
                  <Input
                    id="edit-school-highlevel"
                    value={editingSchool?.highLevel || ""}
                    onChange={(e) => setEditingSchool({...editingSchool!, highLevel: e.target.value})}
                    placeholder="高招"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-school-detail">详情链接</Label>
                  <Input
                    id="edit-school-detail"
                    value={editingSchool?.detailUrl || ""}
                    onChange={(e) => setEditingSchool({...editingSchool!, detailUrl: e.target.value})}
                    placeholder="详情链接"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground pt-2 border-t">
                  爬取来源信息
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-crawl-source-name">来源名称</Label>
                    <Input
                      id="edit-crawl-source-name"
                      value={editingSchool?.crawlSourceName || ""}
                      onChange={(e) => setEditingSchool({...editingSchool!, crawlSourceName: e.target.value})}
                      placeholder="例如：中国高职高专教育网"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-crawl-source-url">来源网址</Label>
                    <Input
                      id="edit-crawl-source-url"
                      value={editingSchool?.crawlSourceUrl || ""}
                      onChange={(e) => setEditingSchool({...editingSchool!, crawlSourceUrl: e.target.value})}
                      placeholder="来源网址"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUpdateSchool}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 爬取状态对话框 */}
        <Dialog open={isCrawlDialogOpen} onOpenChange={(open) => {
          if (!open && !isCrawling) {
            setIsCrawlDialogOpen(false);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {isCrawling ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : crawlLogs.some(log => log.type === "complete") ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                爬取学校数据
              </DialogTitle>
              <DialogDescription>
                {isCrawling ? "正在爬取学校数据..." : crawlLogs.some(log => log.type === "complete") ? "爬取完成" : "爬取结果"}
              </DialogDescription>
            </DialogHeader>

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{crawlStats.created}</div>
                <div className="text-sm text-muted-foreground">新增学校</div>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{crawlStats.updated}</div>
                <div className="text-sm text-muted-foreground">更新学校</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{crawlStats.skipped}</div>
                <div className="text-sm text-muted-foreground">跳过重复</div>
              </div>
            </div>

            {/* 网络测试结果 */}
            {networkTestResult && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-2">网络连通性测试结果：</div>
                <pre className="text-xs whitespace-pre-wrap">{networkTestResult}</pre>
              </div>
            )}

            {/* 日志列表 */}
            <div className="flex-1 overflow-y-auto bg-muted rounded-lg p-4 space-y-2 font-mono text-sm">
              {crawlLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {isCrawling ? "准备开始爬取..." : "暂无日志"}
                </div>
              ) : (
                [...crawlLogs].reverse().map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground text-xs mt-0.5">[{log.timestamp}]</span>
                    <span className={
                      log.type === "error" ? "text-red-500" :
                      log.type === "complete" ? "text-green-600 dark:text-green-400" :
                      log.type === "school" ? "text-blue-600 dark:text-blue-400" :
                      log.type === "pageComplete" ? "text-purple-600 dark:text-purple-400" :
                      "text-foreground"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={() => setIsCrawlDialogOpen(false)}
                disabled={isCrawling}
                variant={isCrawling ? "secondary" : "default"}
              >
                {isCrawling ? "爬取中..." : "关闭"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 清除数据确认对话框 */}
        <Dialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                确认清空所有数据
              </DialogTitle>
              <DialogDescription>
                此操作将删除所有学校数据，操作后无法恢复！
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <div className="text-sm font-medium">当前共有 {totalCount} 所学校</div>
              <div className="text-sm text-muted-foreground">
                清空后，您需要重新爬取学校数据。
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsClearDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearAllSchools}
              >
                确认清空
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 批量更新地区对话框 */}
        <Dialog open={isBatchUpdateDialogOpen} onOpenChange={setIsBatchUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>批量更新学校地区</DialogTitle>
              <DialogDescription>
                为选中的学校批量设置地区信息
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>已选择 {batchUpdateSelectedSchools.length} 所学校</Label>
                <div className="text-sm text-muted-foreground mt-1">
                  将为这些学校统一设置地区
                </div>
              </div>

              <div>
                <Label htmlFor="batch-region-input">地区</Label>
                <Input
                  id="batch-region-input"
                  placeholder="请输入地区（如：广东、北京、四川）"
                  value={batchUpdateRegion}
                  onChange={(e) => setBatchUpdateRegion(e.target.value)}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  数据格式为"省份 城市"，如"广东 广州市"、"北京市"、"四川成都市"
                  <br />
                  输入省份部分（2个字）即可，如"广东"、"北京"、"四川"
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsBatchUpdateDialogOpen(false)}
                disabled={isBatchUpdating}
              >
                取消
              </Button>
              <Button
                onClick={handleBatchUpdateRegion}
                disabled={isBatchUpdating || batchUpdateSelectedSchools.length === 0}
              >
                {isBatchUpdating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                确认更新
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
