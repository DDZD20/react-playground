# CodeVerify API 接口规范文档

## 基础信息

- 基础URL: `http://localhost:3000/api`
- WebSocket URL: `ws://localhost:3000`
- 超时时间: 30秒
- 认证方式: Bearer Token

## 通用响应格式

```typescript
interface ApiResponse<T> {
  code: number;      // HTTP状态码
  message: string;   // 响应消息
  data: T;          // 响应数据
  success: boolean;  // 请求是否成功
}
```

## 认证相关接口

### 1. 用户登录

- **接口**: `POST /auth/login`
- **描述**: 用户登录接口
- **请求体**:
```typescript
interface LoginRequest {
  username: string;
  password: string;
}
```
- **响应**:
```typescript
interface LoginResponse {
  token: string;
  user: User;
}
```

### 2. 用户注册

- **接口**: `POST /auth/register`
- **描述**: 新用户注册
- **请求体**:
```typescript
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
```
- **响应**: User对象

### 3. 退出登录

- **接口**: `POST /auth/logout`
- **描述**: 用户退出登录
- **响应**:
```typescript
{
  success: boolean;
}
```

### 4. 刷新Token

- **接口**: `POST /auth/refresh-token`
- **描述**: 刷新访问令牌
- **响应**: 同登录响应

### 5. 获取当前用户信息

- **接口**: `GET /auth/me`
- **描述**: 获取当前登录用户信息
- **响应**: User对象

## 用户相关接口

### 1. 获取用户信息

- **接口**: `GET /users/:id`
- **描述**: 获取指定用户信息
- **响应**: User对象

### 2. 更新用户资料

- **接口**: `PUT /users/profile`
- **描述**: 更新当前用户资料
- **请求体**: Partial<User>
- **响应**: 更新后的User对象

### 3. 上传头像

- **接口**: `POST /users/avatar`
- **描述**: 上传用户头像
- **请求体**: FormData (包含文件)
- **响应**: 包含头像URL的User对象

### 4. 修改密码

- **接口**: `PUT /users/password`
- **描述**: 修改用户密码
- **请求体**:
```typescript
{
  oldPassword: string;
  newPassword: string;
}
```
- **响应**: 成功状态

## 项目相关接口

### 1. 创建项目

- **接口**: `POST /projects`
- **描述**: 创建新项目
- **请求体**:
```typescript
interface CreateProjectRequest {
  name: string;
  description?: string;
  isPublic: boolean;
}
```
- **响应**: Project对象

### 2. 获取项目列表

- **接口**: `GET /projects`
- **描述**: 获取项目列表
- **查询参数**: PaginationParams
- **响应**: PaginatedResponse<Project>

### 3. 获取项目详情

- **接口**: `GET /projects/:id`
- **描述**: 获取项目详细信息
- **响应**: Project对象

### 4. 获取项目文件

- **接口**: `GET /projects/:projectId/files`
- **描述**: 获取项目下的文件列表
- **响应**: File[]数组

## 文件相关接口

### 1. 创建文件

- **接口**: `POST /files`
- **描述**: 创建新文件
- **请求体**:
```typescript
interface CreateFileRequest {
  name: string;
  path: string;
  content: string;
  projectId: string;
}
```
- **响应**: File对象

### 2. 获取文件内容

- **接口**: `GET /files/:id/content`
- **描述**: 获取文件内容
- **响应**: File对象

### 3. 更新文件内容

- **接口**: `PUT /files/:id/content`
- **描述**: 更新文件内容
- **请求体**:
```typescript
interface UpdateFileRequest {
  content: string;
}
```
- **响应**: File对象

## 协同编辑相关接口

### 1. 创建协作会话

- **接口**: `POST /collaboration/sessions`
- **描述**: 创建新的协作会话
- **响应**: CollaborationSession对象

### 2. 获取协作会话

- **接口**: `GET /collaboration/sessions/:id`
- **描述**: 获取协作会话详情
- **响应**: CollaborationSession对象

### 3. 加入协作会话

- **接口**: `POST /collaboration/files/:fileId/join`
- **描述**: 加入文件协作会话
- **响应**: CollaborationSession对象

## 聊天相关接口

### 1. 创建聊天室

- **接口**: `POST /chat/rooms`
- **描述**: 创建新的聊天室
- **响应**: ChatRoom对象

### 2. 获取聊天室

- **接口**: `GET /chat/rooms/:id`
- **描述**: 获取聊天室详情
- **响应**: ChatRoom对象

### 3. 获取聊天消息

- **接口**: `GET /chat/rooms/:roomId/messages`
- **描述**: 获取聊天室消息历史
- **查询参数**:
```typescript
interface GetMessagesRequest {
  roomId: string;
  before?: string;  // 分页：获取此消息ID之前的消息
  limit?: number;   // 分页：每页消息数量
}
```
- **响应**: PaginatedResponse<ChatMessage>

### 4. 发送消息

- **接口**: `POST /chat/messages`
- **描述**: 发送新消息
- **请求体**:
```typescript
interface SendMessageRequest {
  roomId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
}
```
- **响应**: ChatMessage对象

### 5. 加入聊天室

- **接口**: `POST /chat/rooms/:roomId/join`
- **描述**: 加入聊天室
- **响应**: 成功状态

### 6. 离开聊天室

- **接口**: `POST /chat/rooms/:roomId/leave`
- **描述**: 离开聊天室
- **响应**: 成功状态

## 面试聊天相关接口

### 1. 初始化面试聊天

- **接口**: `POST /interviews/:interviewId/chat/initialize`
- **描述**: 初始化面试聊天服务
- **响应**: 成功状态

### 2. 获取面试聊天消息

- **接口**: `GET /interviews/:interviewId/chat/messages`
- **描述**: 获取面试聊天消息历史
- **查询参数**:
```typescript
{
  before?: string;  // 分页：获取此消息ID之前的消息
  limit?: number;   // 分页：每页消息数量
}
```
- **响应**: 消息列表和总数

### 3. 发送面试聊天消息

- **接口**: `POST /interviews/:interviewId/chat/messages`
- **描述**: 发送面试聊天消息
- **请求体**:
```typescript
{
  content: string;
  type: 'text' | 'image' | 'file';
}
```
- **响应**: ChatMessage对象

### 4. 关闭面试聊天

- **接口**: `POST /interviews/:interviewId/chat/close`
- **描述**: 关闭面试聊天服务
- **响应**: 成功状态

## WebSocket事件

### 连接事件
- `connect`: 连接建立
- `disconnect`: 连接断开
- `error`: 发生错误

### 协作事件
- `sync_update`: 同步更新
- `awareness_update`: 用户状态更新

### 聊天事件
- `chat_message`: 新消息
- `typing`: 正在输入
- `read_receipt`: 已读回执

## 数据类型定义

### User
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### File
```typescript
interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}
```

### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: string;
  attachmentUrl?: string;
}
```

### ChatRoom
```typescript
interface ChatRoom {
  id: string;
  name: string;
  participants: string[]; // 参与者ID数组
  createdAt: string;
  updatedAt: string;
  lastMessage?: ChatMessage; // 最后一条消息（可选）
}
```

### CollaborationSession
```typescript
interface CollaborationSession {
  id: string;
  fileId: string;
  participants: string[]; // 用户ID列表
  startedAt: string;
  endedAt?: string;
}
```

## 错误码说明

- 200: 成功
- 201: 创建成功
- 400: 请求参数错误
- 401: 未认证
- 403: 无权限
- 404: 资源不存在
- 500: 服务器内部错误 