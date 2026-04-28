"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, RefreshCw, Trash2, Database, ChevronDown } from "lucide-react";

interface Keyword {
  id: string;
  name: string;
  category: string;
  isDefault: number;
  isActive: number;
  createdAt: string;
  updatedAt: string | null;
}

// 关键词条目：包含名称和与下一个关键词的逻辑关系
export interface KeywordItem {
  name: string;
  logic?: "AND" | "OR"; // 与下一个关键词的逻辑关系，最后一个不需要
}

interface KeywordSelectorProps {
  selectedKeywords: KeywordItem[];
  onSelectionChange: (keywords: KeywordItem[]) => void;
  category?: string;
  placeholder?: string;
}

export function KeywordSelector({
  selectedKeywords,
  onSelectionChange,
  category = "search",
  placeholder = "选择或添加关键词..."
}: KeywordSelectorProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // 加载关键词列表
  const fetchKeywords = async () => {
    setLoading(true);
    try {
      console.log("开始加载关键词列表...");
      const response = await fetch(`/api/keywords?category=${category}`);
      console.log("API 响应状态:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API 响应错误:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("关键词列表:", result);

      if (result.success) {
        setKeywords(result.data);

        // 如果没有关键词，自动初始化默认关键词
        if (result.data.length === 0) {
          console.log("关键词列表为空，初始化默认关键词...");
          try {
            const initResponse = await fetch("/api/keywords/init", {
              method: "POST",
            });
            const initResult = await initResponse.json();
            console.log("初始化结果:", initResult);
            
            if (initResult.success) {
              console.log("默认关键词初始化成功，重新加载列表...");
              const newResponse = await fetch(`/api/keywords?category=${category}`);
              const newResult = await newResponse.json();
              if (newResult.success) {
                setKeywords(newResult.data);
                console.log("重新加载后的关键词列表:", newResult.data);
              }
            } else {
              console.error("初始化默认关键词失败:", initResult.error);
            }
          } catch (error) {
            console.error("初始化默认关键词失败:", error);
          }
        }
      } else {
        console.error("获取关键词失败:", result.error);
      }
    } catch (error) {
      console.error("加载关键词异常:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, [category]);

  // 获取已选关键词名称列表
  const selectedNames = selectedKeywords.map(k => k.name);

  // 切换关键词选择
  const toggleKeyword = (keywordName: string) => {
    if (selectedNames.includes(keywordName)) {
      // 移除关键词，需要调整逻辑关系
      const index = selectedNames.indexOf(keywordName);
      const newKeywords = selectedKeywords.filter((_, i) => i !== index);
      
      // 如果移除的是第一个关键词，需要把第二个关键词的logic移除
      if (index === 0 && newKeywords.length > 0) {
        delete newKeywords[0].logic;
      }
      
      onSelectionChange(newKeywords);
    } else {
      // 添加关键词，默认逻辑为AND
      const newKeywords = [...selectedKeywords];
      if (newKeywords.length > 0) {
        // 给上一个关键词添加逻辑关系
        newKeywords[newKeywords.length - 1] = {
          ...newKeywords[newKeywords.length - 1],
          logic: "AND" as const
        };
      }
      newKeywords.push({ name: keywordName });
      onSelectionChange(newKeywords);
    }
  };

  // 更新某个关键词的逻辑关系
  const updateKeywordLogic = (index: number, logic: "AND" | "OR") => {
    if (index < 0 || index >= selectedKeywords.length - 1) return;
    
    const newKeywords = [...selectedKeywords];
    newKeywords[index] = { ...newKeywords[index], logic };
    onSelectionChange(newKeywords);
  };

  // 添加新关键词
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    // 检查是否已存在
    if (keywords.some(k => k.name === newKeyword.trim())) {
      alert("该关键词已存在");
      return;
    }

    try {
      const response = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyword.trim(),
          category,
          isDefault: 0,
          isActive: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("添加关键词失败:", response.status, result);
        alert(result.error || `添加失败: HTTP ${response.status}`);
        return;
      }

      if (result.success) {
        console.log("关键词添加成功:", result.data);
        await fetchKeywords();
        // 自动选中新添加的关键词
        toggleKeyword(newKeyword.trim());
        setNewKeyword("");
        setShowDropdown(true);
      } else {
        console.error("添加关键词失败:", result);
        alert(result.error || "添加失败");
      }
    } catch (error) {
      console.error("添加关键词异常:", error);
      alert("添加失败，请稍后重试");
    }
  };

  // 删除关键词
  const deleteKeyword = async (id: string, name: string) => {
    if (!confirm(`确定要删除关键词"${name}"吗？`)) return;

    try {
      const response = await fetch(`/api/keywords/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        await fetchKeywords();
        // 如果删除的关键词在选中列表中，移除它
        if (selectedNames.includes(name)) {
          toggleKeyword(name);
        }
      } else {
        alert(result.error || "删除失败");
      }
    } catch (error) {
      console.error("删除关键词失败:", error);
      alert("删除失败");
    }
  };

  const availableKeywords = keywords.filter(k =>
    k.isActive && !selectedNames.includes(k.name)
  );

  // 计算哪些关键词需要括号（OR 连接的关键词整体括起来）
  interface KeywordGroup {
    indices: number[]; // 关键词索引
    needsParentheses: boolean; // 是否需要括号
  }
  
  const computeGroups = (): KeywordGroup[] => {
    if (selectedKeywords.length === 0) return [];
    
    // 找出所有 OR 连接的关键词块
    const groups: KeywordGroup[] = [];
    let i = 0;
    
    while (i < selectedKeywords.length) {
      // 检查当前位置是否是 OR 块的起点
      // OR 块：连续通过 OR 连接的关键词
      const orBlock: number[] = [];
      let j = i;
      
      // 如果当前关键词与前一个是 OR 关系，或者当前关键词与后一个是 OR 关系
      // 需要找出整个 OR 链
      
      // 先向后找，看看是否是 OR 链的一部分
      if (i > 0 && selectedKeywords[i - 1]?.logic === "OR") {
        // 当前关键词是 OR 链的一部分，已经在之前的组中处理过了
        i++;
        continue;
      }
      
      // 从当前位置开始，找连续的 OR 链
      orBlock.push(j);
      let hasOr = false;
      
      while (j < selectedKeywords.length - 1 && selectedKeywords[j].logic === "OR") {
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
    
    return groups;
  };

  const groups = computeGroups();

  // 渲染带括号的关键词
  const renderKeywords = () => {
    if (selectedKeywords.length === 0) return null;
    
    const elements: React.ReactElement[] = [];
    
    groups.forEach((group, groupIndex) => {
      const { indices, needsParentheses } = group;
      
      // 添加左括号
      if (needsParentheses) {
        elements.push(
          <span key={`open-${groupIndex}`} className="text-base font-bold text-muted-foreground">
            (
          </span>
        );
      }
      
      // 渲染组内的关键词
      indices.forEach((keywordIndex, i) => {
        const keyword = selectedKeywords[keywordIndex];
        
        elements.push(
          <Badge
            key={`keyword-${keywordIndex}`}
            variant="secondary"
            className="gap-1 pr-1"
            onClick={(e) => e.stopPropagation()}
          >
            {keyword.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleKeyword(keyword.name);
              }}
              className="ml-1 hover:bg-destructive/20 rounded-sm p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
        
        // 组内关键词之间的逻辑
        if (i < indices.length - 1) {
          // OR 块内显示 OR（可点击切换成 AND）
          elements.push(
            <Button
              key={`logic-${keywordIndex}`}
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] font-semibold text-orange-600 hover:text-orange-700"
              onClick={(e) => {
                e.stopPropagation();
                updateKeywordLogic(keywordIndex, "AND");
              }}
            >
              OR
            </Button>
          );
        }
      });
      
      // 添加右括号
      if (needsParentheses) {
        elements.push(
          <span key={`close-${groupIndex}`} className="text-base font-bold text-muted-foreground">
            )
          </span>
        );
      }
      
      // 组与组之间显示 AND（可点击切换成 OR）
      if (groupIndex < groups.length - 1) {
        const lastIndexOfCurrentGroup = indices[indices.length - 1];
        elements.push(
          <Button
            key={`logic-group-${groupIndex}`}
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
            onClick={(e) => {
              e.stopPropagation();
              updateKeywordLogic(lastIndexOfCurrentGroup, "OR");
            }}
          >
            AND
          </Button>
        );
      }
    });
    
    return elements;
  };

  return (
    <div className="space-y-2 relative">
      {/* 已选关键词标签 */}
      <div className="flex flex-wrap items-center gap-2 min-h-[40px] p-2 border rounded-md bg-background">
        {/* 点击区域：展开/关闭下拉框 */}
        <div 
          className="flex flex-wrap items-center gap-1 flex-1 cursor-pointer min-h-[24px]"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          {selectedKeywords.length === 0 ? (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          ) : (
            renderKeywords()
          )}
        </div>
        
        {/* 右侧按钮组 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setShowDropdown(!showDropdown)}
            title={showDropdown ? "隐藏关键词列表" : "显示关键词列表"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </Button>
          <Input
            placeholder="输入新关键词..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
            className="w-32 h-7 text-sm"
          />
          <Button onClick={addKeyword} size="sm" className="h-7 px-2">
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={fetchKeywords}
            disabled={loading}
            title="刷新关键词列表"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={async () => {
              if (confirm("确定要初始化默认关键词吗？这将添加'培训'、'招标'、'采购'三个默认关键词。")) {
                try {
                  const response = await fetch("/api/keywords/init", {
                    method: "POST",
                  });
                  const result = await response.json();
                  if (result.success) {
                    console.log("初始化成功:", result);
                    alert("默认关键词初始化成功！");
                    await fetchKeywords();
                  } else {
                    console.error("初始化失败:", result);
                    alert(result.error || "初始化失败");
                  }
                } catch (error) {
                  console.error("初始化异常:", error);
                  alert("初始化失败，请稍后重试");
                }
              }
            }}
            title="初始化默认关键词"
          >
            <Database className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 下拉选择框 */}
      {showDropdown && (
        <div className="absolute z-50 w-full border rounded-md bg-background p-2 shadow-lg">
          {/* 可选关键词列表 */}
          {availableKeywords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              暂无可选关键词
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {availableKeywords.map((keyword) => (
                <div
                  key={keyword.id}
                  className="flex items-center gap-1"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleKeyword(keyword.name)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {keyword.name}
                    {keyword.isDefault === 1 && (
                      <Badge variant="outline" className="text-[9px] ml-1 px-1 py-0">
                        默认
                      </Badge>
                    )}
                  </Button>
                  {keyword.isDefault === 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteKeyword(keyword.id, keyword.name)}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
