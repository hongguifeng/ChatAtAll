# ChatAtAll 客户端

![Electron](https://img.shields.io/badge/Electron-24.1.2-47848F?logo=electron)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.1-06B6D4?logo=tailwind-css)

基于 Electron 和 React 构建的 ChatGPT 桌面客户端，支持多会话管理、持久化存储和跨平台运行。

## 主要功能

- 🚀 原生桌面应用体验（支持 Windows/macOS/Linux）
- 💬 多会话管理（创建/删除/重命名会话）
- 📝 Markdown 格式支持
- 🔒 本地化存储（API 密钥、会话记录）
- ⚙️ 代理服务器配置
- 🌐 多语言界面（默认中文）
- 📦 一键打包分发

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run electron-dev
```

### 打包应用
```bash
npm run dist
```

## 技术栈
- **前端框架**: React 18
- **桌面运行时**: Electron 24
- **样式框架**: Tailwind CSS 3
- **状态存储**: electron-store
- **构建工具**: electron-builder

## 项目结构
```
.
├── public/            # 静态资源
├── src/               # 源码目录
│   ├── components/    # 通用组件
│   ├── contexts/      # React Context
│   ├── services/      # API 服务
│   └── index.js       # 入口文件
├── package.json       # 项目配置
└── electron.js        # Electron 主进程
```

## 配置说明
1. 在设置界面输入有效的 [OpenAI API Key](https://platform.openai.com/account/api-keys)
2. （可选）配置代理服务器地址
3. 选择 AI 模型（默认 gpt-3.5-turbo）

## 使用说明
1. 使用 `Ctrl/Cmd + N` 快速新建会话
2. 支持 Markdown 语法输入和渲染
3. 会话记录自动保存至本地
4. 使用 `Ctrl/Cmd + ,` 快速打开设置

## 注意事项
1. 请妥善保管 API 密钥，程序仅本地存储
2. 国内用户建议配置代理服务器
3. 生产环境打包前请先执行构建命令

## 授权协议
[MIT License](LICENSE)