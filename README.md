# projects

## 系统功能

本项目是一个面向高职院校培训招标信息搜集与管理的全栈系统，覆盖“目标院校维护、招标信息采集、结果筛选、历史追踪、部署使用”几个核心环节。

### 1. 目标院校管理

- 支持自动爬取目标院校基础数据，批量导入学校列表
- 支持手动新增、编辑、删除学校信息
- 支持按学校名称搜索、分页查看和批量维护地区信息
- 保存学校编号、名称、地区、办学层次、详情页来源等基础资料

### 2. 招标信息爬取

- 支持基于学校列表循环抓取培训、招标、采购等相关信息
- 支持按地区筛选目标学校后发起爬取
- 支持自定义搜索关键词和排除关键词
- 支持搜索源切换，可在 `Python/DuckDuckGo` 与 `Coze WebSearch` 之间手动选择
- 支持实时展示爬取日志、学校进度、成功失败数量和新增招标条数
- 支持暂停、恢复、停止和重置爬取进度

### 3. 招标结果管理

- 实时保存爬取到的招标链接、备注、发布时间和爬取时间
- 支持按学校名称检索招标数据
- 支持导出 CSV
- 支持按学校清空数据或清空全部招标记录

### 4. 历史记录与可追踪性

- 自动记录每次爬取的学校总数、成功数、失败数、招标条数和耗时
- 支持查看爬取历史详情
- 支持导出某次爬取结果
- 支持删除历史记录，便于后续整理和复盘

### 5. 排除名单管理

- 支持维护排除域名列表
- 支持多行粘贴批量添加域名
- 支持自动去重和标准域名提取
- 被加入排除名单的域名及其子页面会在招标爬取过程中被过滤

### 6. 部署与运维支持

- 提供 Windows 部署文档下载入口
- 提供数据库初始化、数据库健康检查、网络连通性测试等辅助能力
- 支持 PostgreSQL 本地部署运行

### 7. 技术实现特点

- 前端基于 Next.js App Router 与 shadcn/ui 构建
- 后端 API 负责学校爬取、招标爬取、历史记录和基础数据管理
- 数据层通过 Drizzle ORM + PostgreSQL 持久化
- 招标采集支持流式返回，前端可实时接收爬取进度与结果

## Windows 本机部署（推荐）

下面这套步骤是当前项目在 Windows + PowerShell 下最稳的本机运行方式，已经把实际踩过的问题一起考虑进去了。

### 1. 环境准备

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Python 3.9+

验证命令：

```powershell
node -v
pnpm -v
python --version
```

### 2. 初始化数据库

项目已提供完整数据库初始化脚本：[scripts/init-db.sql](/D:/JavaCode/ZBCrawl/projects/scripts/init-db.sql)

在 PowerShell 中执行：

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres -d postgres -f .\scripts\init-db.sql
```

这一步会完成：

- 创建 `tender_user`
- 创建 `tender_db`
- 创建全部业务表
- 初始化默认关键词
- 授予 `tender_user` 对现有表和后续新表的权限
- 修正“数据库能连上但读写表报权限错误”的问题

### 3. 配置环境变量

在项目根目录创建 `.env.local`，至少包含：

```env
DATABASE_URL=postgresql://tender_user:<DB_PASSWORD>@localhost:5432/tender_db
PGDATABASE_URL=postgresql://tender_user:<DB_PASSWORD>@localhost:5432/tender_db
PYTHON_BIN=python
PORT=5000
```

注意：

- `DATABASE_URL` 和 `PGDATABASE_URL` 必须保持一致
- `PGDATABASE_URL` 不能保留 `your_password` 这类占位值
- 如果系统里有多个 Python，请把 `PYTHON_BIN` 改成实际解释器绝对路径

### 4. 安装依赖

```powershell
pnpm install
```

### 5. 启动开发服务

推荐直接使用 Next.js 命令：

```powershell
pnpm next dev --webpack --port 5000
```

说明：

- `pnpm dev` 实际走的是 `bash ./scripts/dev.sh`
- 如果本机没有 `bash` 或 Git Bash，直接用上面的命令更稳

### 6. 启动后检查

先检查数据库健康状态：

- [http://localhost:5000/api/health/database](http://localhost:5000/api/health/database)
- [http://localhost:5000/api/keywords?category=search](http://localhost:5000/api/keywords?category=search)

预期：

- `health/database` 返回 `success: true`
- `keywords?category=search` 能看到默认关键词，如“培训 / 招标 / 采购”

### 7. 首次运行建议验证

按下面顺序检查最容易定位问题：

1. 学校管理页能正常打开
2. 目标学校爬取能写入 `schools` 表
3. 招标爬取页面能正常读取关键词
4. 使用 `Python/DuckDuckGo` 搜索源启动一次小范围招标爬取

## 本机部署常见问题

### 1. 数据库连接正常，但读取表失败

常见原因：

- 表是用 `postgres` 建的，但应用用 `tender_user` 连
- 没给 `tender_user` 授权

处理方式：

- 重新执行 [scripts/init-db.sql](/D:/JavaCode/ZBCrawl/projects/scripts/init-db.sql)

### 2. 学校爬取时报数据库未配置

常见原因：

- 只配置了 `DATABASE_URL`
- 没配置 `PGDATABASE_URL`

处理方式：

- 在 `.env.local` 里同时配置 `DATABASE_URL` 和 `PGDATABASE_URL`
- 修改后必须重启开发服务

### 3. `pnpm dev` 无法启动

常见原因：

- 当前 PowerShell 环境没有 `bash`

处理方式：

```powershell
pnpm next dev --webpack --port 5000
```

### 4. 搜索源为 Python 时无法工作

常见原因：

- 本机没有 Python
- `PYTHON_BIN` 指向错误解释器

处理方式：

```powershell
python --version
```

必要时在 `.env.local` 中显式指定：

```env
PYTHON_BIN=C:\Python39\python.exe
```

### 5. 改了 `.env.local` 后接口仍然报旧错误

常见原因：

- Next.js 已经启动，未重新加载环境变量

处理方式：

- 停掉当前开发服务
- 重新执行 `pnpm next dev --webpack --port 5000`

这是一个基于 [Next.js 16](https://nextjs.org) + [shadcn/ui](https://ui.shadcn.com) 的全栈应用项目，由扣子编程 CLI 创建。

## 快速开始

### 启动开发服务器

```bash
coze dev
```

启动后，在浏览器中打开 [http://localhost:5000](http://localhost:5000) 查看应用。

开发服务器支持热更新，修改代码后页面会自动刷新。

### 构建生产版本

```bash
coze build
```

### 启动生产服务器

```bash
coze start
```

## 项目结构

```
src/
├── app/                      # Next.js App Router 目录
│   ├── layout.tsx           # 根布局组件
│   ├── page.tsx             # 首页
│   ├── globals.css          # 全局样式（包含 shadcn 主题变量）
│   └── [route]/             # 其他路由页面
├── components/              # React 组件目录
│   └── ui/                  # shadcn/ui 基础组件（优先使用）
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
├── lib/                     # 工具函数库
│   └── utils.ts            # cn() 等工具函数
└── hooks/                   # 自定义 React Hooks（可选）
```

## 核心开发规范

### 1. 组件开发

**优先使用 shadcn/ui 基础组件**

本项目已预装完整的 shadcn/ui 组件库，位于 `src/components/ui/` 目录。开发时应优先使用这些组件作为基础：

```tsx
// ✅ 推荐：使用 shadcn 基础组件
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function MyComponent() {
  return (
    <Card>
      <CardHeader>标题</CardHeader>
      <CardContent>
        <Input placeholder="输入内容" />
        <Button>提交</Button>
      </CardContent>
    </Card>
  );
}
```

**可用的 shadcn 组件清单**

- 表单：`button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`
- 布局：`card`, `separator`, `tabs`, `accordion`, `collapsible`, `scroll-area`
- 反馈：`alert`, `alert-dialog`, `dialog`, `toast`, `sonner`, `progress`
- 导航：`dropdown-menu`, `menubar`, `navigation-menu`, `context-menu`
- 数据展示：`table`, `avatar`, `badge`, `hover-card`, `tooltip`, `popover`
- 其他：`calendar`, `command`, `carousel`, `resizable`, `sidebar`

详见 `src/components/ui/` 目录下的具体组件实现。

### 2. 路由开发

Next.js 使用文件系统路由，在 `src/app/` 目录下创建文件夹即可添加路由：

```bash
# 创建新路由 /about
src/app/about/page.tsx

# 创建动态路由 /posts/[id]
src/app/posts/[id]/page.tsx

# 创建路由组（不影响 URL）
src/app/(marketing)/about/page.tsx

# 创建 API 路由
src/app/api/users/route.ts
```

**页面组件示例**

```tsx
// src/app/about/page.tsx
import { Button } from '@/components/ui/button';

export const metadata = {
  title: '关于我们',
  description: '关于页面描述',
};

export default function AboutPage() {
  return (
    <div>
      <h1>关于我们</h1>
      <Button>了解更多</Button>
    </div>
  );
}
```

**动态路由示例**

```tsx
// src/app/posts/[id]/page.tsx
export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <div>文章 ID: {id}</div>;
}
```

**API 路由示例**

```tsx
// src/app/api/users/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ users: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ success: true });
}
```

### 3. 依赖管理

**必须使用 pnpm 管理依赖**

```bash
# ✅ 安装依赖
pnpm install

# ✅ 添加新依赖
pnpm add package-name

# ✅ 添加开发依赖
pnpm add -D package-name

# ❌ 禁止使用 npm 或 yarn
# npm install  # 错误！
# yarn add     # 错误！
```

项目已配置 `preinstall` 脚本，使用其他包管理器会报错。

### 4. 样式开发

**使用 Tailwind CSS v4**

本项目使用 Tailwind CSS v4 进行样式开发，并已配置 shadcn 主题变量。

```tsx
// 使用 Tailwind 类名
<div className="flex items-center gap-4 p-4 rounded-lg bg-background">
  <Button className="bg-primary text-primary-foreground">
    主要按钮
  </Button>
</div>

// 使用 cn() 工具函数合并类名
import { cn } from '@/lib/utils';

<div className={cn(
  "base-class",
  condition && "conditional-class",
  className
)}>
  内容
</div>
```

**主题变量**

主题变量定义在 `src/app/globals.css` 中，支持亮色/暗色模式：

- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

### 5. 表单开发

推荐使用 `react-hook-form` + `zod` 进行表单开发：

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符'),
  email: z.string().email('请输入有效的邮箱'),
});

export default function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', email: '' },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('username')} />
      <Input {...form.register('email')} />
      <Button type="submit">提交</Button>
    </form>
  );
}
```

### 6. 数据获取

**服务端组件（推荐）**

```tsx
// src/app/posts/page.tsx
async function getPosts() {
  const res = await fetch('https://api.example.com/posts', {
    cache: 'no-store', // 或 'force-cache'
  });
  return res.json();
}

export default async function PostsPage() {
  const posts = await getPosts();

  return (
    <div>
      {posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

**客户端组件**

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function ClientComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(setData);
  }, []);

  return <div>{JSON.stringify(data)}</div>;
}
```

## 常见开发场景

### 添加新页面

1. 在 `src/app/` 下创建文件夹和 `page.tsx`
2. 使用 shadcn 组件构建 UI
3. 根据需要添加 `layout.tsx` 和 `loading.tsx`

### 创建业务组件

1. 在 `src/components/` 下创建组件文件（非 UI 组件）
2. 优先组合使用 `src/components/ui/` 中的基础组件
3. 使用 TypeScript 定义 Props 类型

### 添加全局状态

推荐使用 React Context 或 Zustand：

```tsx
// src/lib/store.ts
import { create } from 'zustand';

interface Store {
  count: number;
  increment: () => void;
}

export const useStore = create<Store>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

### 集成数据库

推荐使用 Prisma 或 Drizzle ORM，在 `src/lib/db.ts` 中配置。

## 技术栈

- **框架**: Next.js 16.1.1 (App Router)
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **样式**: Tailwind CSS v4
- **表单**: React Hook Form + Zod
- **图标**: Lucide React
- **字体**: Geist Sans & Geist Mono
- **包管理器**: pnpm 9+
- **TypeScript**: 5.x

## 参考文档

- [Next.js 官方文档](https://nextjs.org/docs)
- [shadcn/ui 组件文档](https://ui.shadcn.com)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com)

## 重要提示

1. **必须使用 pnpm** 作为包管理器
2. **优先使用 shadcn/ui 组件** 而不是从零开发基础组件
3. **遵循 Next.js App Router 规范**，正确区分服务端/客户端组件
4. **使用 TypeScript** 进行类型安全开发
5. **使用 `@/` 路径别名** 导入模块（已配置）
