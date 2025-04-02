# CodeVerify 开发指南

## 项目简介

CodeVerify是一个反AI作弊的编程面试平台，通过多维度分析编码行为，能够精准识别AI生成内容，为技术面试提供公平的评估环境。

## 开发环境设置

1. 克隆仓库并安装依赖：
```bash
git clone [仓库地址]
cd react-playground-project
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

## 测试账号

在开发环境中，系统已经配置了内置的测试账号，用于功能开发和测试：

```
用户名: testuser
密码: Test@123
邮箱: test@example.com
```

这个账号仅在开发环境下有效，启用了 `mockData.ts` 中的模拟API响应功能。

## 前端架构

项目使用React + TypeScript开发，主要结构如下：

- `/src/api`: API接口和类型定义
- `/src/CodeVerify`: 主应用组件
  - `/components`: 各功能组件
  - `/services`: 服务层（API服务、差异检测等）
  - `/utils`: 工具函数
  - `/hooks`: 自定义React Hooks

## 开发指南

### 组件样式约定

- 所有组件的样式应使用CSS Modules，文件命名为 `index.module.scss`
- 样式类名使用驼峰命名法（如 `authWrapper` 而非 `auth-wrapper`）
- 在组件中通过 `import styles from './index.module.scss'` 导入样式
- 应用样式时使用 `className={styles.className}` 格式

### API模拟数据

在开发过程中，可以使用 `src/api/mockData.ts` 中定义的模拟数据和函数。系统默认启用了模拟数据模式（`USE_MOCK_DATA = true`），可在 `src/api/user.ts` 中调整。

对于新增的API功能，建议同时实现相应的模拟数据函数，以便在没有后端服务的情况下进行开发和测试。

## 其他说明

- 对于登录、注册等功能的前端验证逻辑，已在相应组件中实现
- 项目使用了Vite作为构建工具，提供了快速的开发体验
- 样式系统使用SCSS，支持变量、嵌套和其他高级功能 