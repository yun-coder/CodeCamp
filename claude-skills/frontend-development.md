# Skill: 前端组件开发流程

## 适用场景

使用 Next.js + React + TypeScript 开发前端组件和页面，确保代码质量和用户体验。

---

## 技术栈

- **框架**: Next.js 14+ (App Router)
- **UI 库**: React 18+
- **类型**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: React Hooks (useState, useContext)
- **数据获取**: SWR / React Query
- **表单**: React Hook Form
- **图表**: Recharts / Chart.js

---

## 组件开发六步流程

### 第一步：组件设计

**设计清单**:
- [ ] 组件用途和职责
- [ ] Props 接口定义
- [ ] 状态管理方案
- [ ] 交互行为设计
- [ ] 响应式布局考虑

**组件分类**:

| 类型 | 说明 | 示例 |
|------|------|------|
| **页面组件** | App Router 页面 | `app/dashboard/page.tsx` |
| **布局组件** | 页面布局 | `app/layout.tsx` |
| **功能组件** | 业务功能组件 | `components/features/SiteList.tsx` |
| **共享组件** | 通用 UI 组件 | `components/shared/Button.tsx` |

**示例：设计站点列表组件**
```typescript
// 组件需求
// 1. 显示站点列表（表格形式）
// 2. 支持分页
// 3. 支持搜索和筛选
// 4. 支持操作（编辑、删除）
// 5. 响应式布局

// Props 接口
interface SiteListProps {
  projectId?: number;  // 可选：按项目筛选
  onSiteClick?: (site: Site) => void;  // 点击站点回调
}
```

---

### 第二步：创建组件文件

**文件结构**:
```
frontend/
├── app/
│   └── sites/
│       ├── page.tsx              # 站点列表页面
│       └── [id]/
│           └── page.tsx          # 站点详情页面
├── components/
│   ├── features/
│   │   └── sites/
│   │       ├── SiteList.tsx      # 站点列表组件
│   │       ├── SiteForm.tsx      # 站点表单组件
│   │       └── SiteCard.tsx      # 站点卡片组件
│   └── shared/
│       ├── DataTable.tsx         # 通用表格组件
│       ├── Pagination.tsx        # 分页组件
│       └── SearchBar.tsx         # 搜索栏组件
├── hooks/
│   └── useSites.ts               # 站点数据 Hook
└── types/
    └── site.ts                   # 站点类型定义
```

---

### 第三步：定义 TypeScript 类型

**类型定义**:
```typescript
// frontend/types/site.ts
export interface Site {
  id: number;
  project_id: number;
  domain: string;
  protocol: 'http' | 'https';
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SiteCreate {
  project_id: number;
  domain: string;
  protocol: 'http' | 'https';
  description?: string;
}

export interface SiteUpdate {
  domain?: string;
  protocol?: 'http' | 'https';
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  description?: string;
}

export interface SiteListQuery {
  project_id?: number;
  status?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
```

---

### 第四步：创建数据获取 Hook

**使用 SWR 获取数据**:
```typescript
// frontend/hooks/useSites.ts
import useSWR from 'swr';
import { Site, SiteListQuery, PaginatedResponse } from '@/types/site';
import { api } from '@/lib/api';

export function useSites(query?: SiteListQuery) {
  const queryString = new URLSearchParams(
    Object.entries(query || {})
      .filter(([_, v]) => v != null)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  
  const { data, error, mutate, isLoading } = useSWR<PaginatedResponse<Site>>(
    query ? `/sites?${queryString}` : '/sites',
    api.get
  );
  
  return {
    sites: data?.items || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.total_pages || 1,
    isLoading,
    isError: error,
    mutate
  };
}

export function useSite(id: number | null) {
  const { data, error, mutate, isLoading } = useSWR<Site>(
    id ? `/sites/${id}` : null,
    api.get
  );
  
  return {
    site: data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useSiteMutations() {
  return {
    create: async (data: SiteCreate) => {
      return api.post<Site>('/sites', data);
    },
    update: async (id: number, data: SiteUpdate) => {
      return api.put<Site>(`/sites/${id}`, data);
    },
    delete: async (id: number) => {
      return api.delete(`/sites/${id}`);
    }
  };
}
```

---

### 第五步：实现组件逻辑

**站点列表组件**:
```typescript
// frontend/components/features/sites/SiteList.tsx
'use client';

import { useState } from 'react';
import { Site } from '@/types/site';
import { useSites, useSiteMutations } from '@/hooks/useSites';
import { DataTable } from '@/components/shared/DataTable';
import { Pagination } from '@/components/shared/Pagination';
import { Button } from '@/components/shared/Button';
import { SearchBar } from '@/components/shared/SearchBar';
import { toast } from 'react-hot-toast';

interface SiteListProps {
  projectId?: number;
  onSiteClick?: (site: Site) => void;
}

export function SiteList({ projectId, onSiteClick }: SiteListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  
  const { sites, total, totalPages, isLoading, mutate } = useSites({
    project_id: projectId,
    status: statusFilter,
    page,
    page_size: 20
  });
  
  const { delete: deleteSite } = useSiteMutations();
  
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个站点吗？')) return;
    
    try {
      await deleteSite(id);
      toast.success('站点已删除');
      mutate(); // 刷新列表
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    }
  };
  
  const columns = [
    {
      key: 'domain',
      label: '域名',
      render: (site: Site) => (
        <div>
          <div className="font-medium">{site.domain}</div>
          <div className="text-sm text-gray-500">{site.protocol}://</div>
        </div>
      )
    },
    {
      key: 'status',
      label: '状态',
      render: (site: Site) => (
        <span className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${site.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : ''}
          ${site.status === 'INACTIVE' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${site.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-800' : ''}
        `}>
          {site.status}
        </span>
      )
    },
    {
      key: 'created_at',
      label: '创建时间',
      render: (site: Site) => new Date(site.created_at).toLocaleDateString('zh-CN')
    },
    {
      key: 'actions',
      label: '操作',
      render: (site: Site) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSiteClick?.(site)}
          >
            查看
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(site.id)}
          >
            删除
          </Button>
        </div>
      )
    }
  ];
  
  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="搜索域名..."
        />
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || undefined)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">全部状态</option>
          <option value="ACTIVE">活跃</option>
          <option value="INACTIVE">非活跃</option>
          <option value="ARCHIVED">已归档</option>
        </select>
      </div>
      
      {/* 表格 */}
      <DataTable
        data={sites}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="暂无站点"
      />
      
      {/* 分页 */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

**站点表单组件**:
```typescript
// frontend/components/features/sites/SiteForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { SiteCreate, SiteUpdate } from '@/types/site';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Select';

interface SiteFormProps {
  initialValues?: SiteUpdate;
  projectId?: number;
  onSubmit: (data: SiteCreate | SiteUpdate) => Promise<void>;
  onCancel: () => void;
}

export function SiteForm({ 
  initialValues, 
  projectId,
  onSubmit, 
  onCancel 
}: SiteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SiteCreate>({
    defaultValues: initialValues || {
      project_id: projectId,
      protocol: 'https'
    }
  });
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          域名 <span className="text-red-500">*</span>
        </label>
        <Input
          {...register('domain', {
            required: '请输入域名',
            pattern: {
              value: /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i,
              message: '无效的域名格式'
            }
          })}
          placeholder="example.com"
          error={errors.domain?.message}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          协议 <span className="text-red-500">*</span>
        </label>
        <Select
          {...register('protocol', { required: '请选择协议' })}
          options={[
            { value: 'https', label: 'HTTPS' },
            { value: 'http', label: 'HTTP' }
          ]}
          error={errors.protocol?.message}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">
          描述
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="站点描述（可选）"
        />
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          取消
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
        >
          {initialValues ? '更新' : '创建'}
        </Button>
      </div>
    </form>
  );
}
```

---

### 第六步：创建页面

**站点列表页面**:
```typescript
// frontend/app/sites/page.tsx
'use client';

import { useState } from 'react';
import { SiteList } from '@/components/features/sites/SiteList';
import { SiteForm } from '@/components/features/sites/SiteForm';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { useSiteMutations } from '@/hooks/useSites';
import { toast } from 'react-hot-toast';
import { Site, SiteCreate } from '@/types/site';

export default function SitesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  
  const { create } = useSiteMutations();
  
  const handleCreate = async (data: SiteCreate) => {
    try {
      await create(data);
      toast.success('站点创建成功');
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error('创建失败');
      console.error(error);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页头 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">站点管理</h1>
          <p className="text-gray-600 mt-1">管理您的所有站点</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          + 创建站点
        </Button>
      </div>
      
      {/* 站点列表 */}
      <SiteList onSiteClick={setSelectedSite} />
      
      {/* 创建站点 Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="创建站点"
      >
        <SiteForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      </Modal>
      
      {/* 站点详情 Modal */}
      {selectedSite && (
        <Modal
          isOpen={!!selectedSite}
          onClose={() => setSelectedSite(null)}
          title="站点详情"
        >
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">域名</div>
              <div className="font-medium">{selectedSite.domain}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">协议</div>
              <div className="font-medium">{selectedSite.protocol}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">状态</div>
              <div className="font-medium">{selectedSite.status}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

---

## 共享组件库

### Button 组件
```typescript
// frontend/components/shared/Button.tsx
import { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50',
    ghost: 'hover:bg-gray-100'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
```

### DataTable 组件
```typescript
// frontend/components/shared/DataTable.tsx
interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: number | string }>({
  data,
  columns,
  isLoading,
  emptyMessage = '暂无数据'
}: DataTableProps<T>) {
  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }
  
  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">{emptyMessage}</div>;
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-sm font-medium text-gray-700"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 响应式设计

**Tailwind 断点**:
```typescript
// 移动优先设计
<div className="
  w-full          // 默认（移动）
  sm:w-1/2        // 小屏（≥640px）
  md:w-1/3        // 中屏（≥768px）
  lg:w-1/4        // 大屏（≥1024px）
  xl:w-1/5        // 超大屏（≥1280px）
">
  内容
</div>
```

---

## 性能优化

### 1. 代码分割
```typescript
// 动态导入组件
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <p>加载中...</p>,
  ssr: false  // 关闭服务端渲染
});
```

### 2. 图片优化
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority  // 优先加载
/>
```

### 3. 缓存策略
```typescript
// SWR 配置
import { SWRConfig } from 'swr';

<SWRConfig
  value={{
    revalidateOnFocus: false,
    dedupingInterval: 5000
  }}
>
  <App />
</SWRConfig>
```

---

## 验收清单

- [ ] TypeScript 类型定义完整
- [ ] 组件 Props 清晰
- [ ] 响应式布局正确
- [ ] 加载状态处理
- [ ] 错误状态处理
- [ ] 表单校验完整
- [ ] 无障碍访问（aria-label 等）
- [ ] 性能优化（懒加载、缓存）

---

## 常见问题

**Q: 如何处理全局状态？**  
A: 简单状态用 Context，复杂状态用 Zustand 或 Jotai。

**Q: 如何处理表单校验？**  
A: 使用 React Hook Form + Zod。

**Q: SEO 如何优化？**  
A: 使用 Next.js Metadata API 和 generateMetadata。
