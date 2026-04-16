# Browser Location Spoofing

> 一款专为开发者和测试工程师打造的 Chrome 扩展，用于模拟地理位置、时区和 IP 地址，方便对地区限定功能进行测试与验证。

---

## ✨ 功能特性

### 🌍 多节点位置配置管理
- **批量导入与导出**：通过 JSON 格式批量导入节点，或将整个节点库导出为带日期的备份文件。
- **可视化新增/编辑**：通过图形化表单随时添加或编辑单个节点，支持国家代码、显示名称、地区、目标 IP、目标时区及 User-Agent 自定义。
- **持久化存储**：所有节点保存于 `chrome.storage.local`，重启浏览器后数据不丢失。
- **内置默认节点库**：首次安装时自动载入覆盖全球 150+ 国家/地区的节点预设。清空列表后不会再次自动恢复。

### 📡 单节点多 IP 支持
- 每个节点可配置**多个 IP 地址**，以逗号分隔存储。
- 在弹窗界面可通过下拉框**即时切换 IP**，无需跳转设置页面。

### ⏱ 时区模拟
- 对每个请求注入 `Timezone` HTTP 头。
- 通过 `content_scripts` 在 `document_start` 阶段覆写页面 JavaScript 的 `Intl.DateTimeFormat` 和 `Date.prototype.getTimezoneOffset`，使前端代码也感知到正确的时区。
- 时区字段**可留空** — 为空时不发送 Timezone 头，也不执行 JS 覆写。

### 🛡 IP 请求头注入（基于 `declarativeNetRequest`）
- 配置 IP 时，向每个请求注入以下头部：
  - `X-Forwarded-For`
  - `X-Real-IP`
  - `Client-IP`
  - `X-Client-IP`
  - `True-Client-IP`
  - `WL-Proxy-Client-IP`
  - `CF-IPCountry`（始终根据国家代码注入）
- IP 字段**留空时，上述所有 IP 头一律不发送** — 可实现"纯时区模拟"模式。

### 🧩 灵活的节点管理
- **置顶**节点至列表顶部。
- 按名称、代码、地区、IP **实时搜索**。
- 复选框**批量删除**，支持全选。
- 每节点**独立可见性开关**，控制哪些节点显示在弹窗中。

### 🎨 现代化界面
- 亮色玻璃态设计，配合渐变、微动画与丝滑过渡。
- 全自定义弹窗，无系统原生 `alert()` / `confirm()` 干扰。
- Toast 气泡通知系统，右上角滑入反馈。
- 高密度节点列表，最宽支持 `1000px`，一览更多信息。

---

## 🗂 项目结构

```
browser-location-spoofing/
├── manifest.json                        # Manifest V3 配置
├── background.js                        # Service Worker — 请求头规则管理
├── content.js                           # 内容脚本 — 覆写页面内时区 API
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── data/
│   └── default_location_nodes.json      # 内置默认节点库（首次安装时加载）
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
└── shared/
    ├── countries.js                     # 国家代码 ↔ 名称映射
    └── timezone_map.js                  # 国家/地区 → 时区自动推导
```

---

## 🔧 节点数据结构

```json
{
  "id": "US_California_0p3t",
  "code": "US",
  "name": "美国-California",
  "region": "California",
  "ip": ["102.129.145.77", "104.128.72.34"],
  "timezone": "America/Los_Angeles",
  "userAgent": ""
}
```

| 字段 | 是否必填 | 说明 |
|---|---|---|
| `code` | ✅ 必填 | ISO 3166-1 alpha-2 国家代码 |
| `id` | 自动生成 | 唯一标识符 |
| `name` | 自动生成 | 默认为 `<国家名>-<地区>` |
| `region` | 可选 | 子地区（如州、省） |
| `ip` | 可选 | 字符串数组。留空则不伪装 IP |
| `timezone` | 可选 | IANA 时区字符串。留空则不修改时区 |
| `userAgent` | 可选 | 完整 UA 字符串覆写 |

---

## 🚀 本地开发调试

1. 打开 Chrome，访问 `chrome://extensions`。
2. 右上角开启**开发者模式**。
3. 点击**加载已解压的扩展程序**，选择项目根目录。
4. 点击扩展图标打开弹窗。
5. 点击 ⚙️ 设置图标，进入高级配置页管理节点库。

---

## 📋 所需权限说明

| 权限 | 用途 |
|---|---|
| `declarativeNetRequest` | 修改每个请求的出站 HTTP 头 |
| `declarativeNetRequestWithHostAccess` | 对所有 URL 生效 |
| `storage` | 持久化节点配置 |
| `activeTab` | 访问当前标签页上下文 |
| `scripting` | 预留，用于未来动态注入能力 |
| `<all_urls>` | 将规则应用于所有网站 |

---

## 🔒 隐私声明

本扩展**不收集、不上传任何用户数据**。所有节点配置仅存储于本地的 `chrome.storage.local`，绝不离开用户设备。扩展仅根据用户主动配置的参数修改出站请求头，不读取、不记录任何浏览历史或个人信息。
