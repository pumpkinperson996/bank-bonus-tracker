# 银行开户奖励追踪器（Bank Bonus Tracker）

[English](README.en.md) | **中文**

一个纯本地运行的网页应用，用来追踪美国银行的开户奖励（bank bonus）。粘贴一个 offer 链接（也可以一次粘贴多个），LLM 自动提取全部要点——银行、奖励金额、Direct Deposit（DD）要求、截止时间、月费、churn 规则——然后帮你追踪每个已开的账户：DD 截止倒计时、安全关户日期、churn 冷却期，全部自动计算。

所有数据都在你自己的电脑上。唯一的联网操作是调用你配置的 LLM API 和一次免费的 churn 规则搜索。典型成本：用 DeepSeek V4 Flash **每分析一个 offer 约 $0.002**。

## 功能

- **贴链接、出表单** —— 自动抓取 offer 页面，LLM 提取全部字段，多档位奖励（比如 checking $300 / savings $200 / 组合 $900）会分别列出让你选
- **免费 churn 规则搜索** —— offer 页面没写能不能重复撸时，用免 key 的多引擎搜索（DuckDuckGo → Bing → DuckDuckGo Lite，优先 Doctor of Credit、Reddit r/churning），再由你的 LLM 从搜索结果里补全，并注明来源
- **批量添加** —— 多个链接每行一个粘贴进去，逐个自动分析；你审核第一个的同时，第二个已经在分析了
- **追踪面板** —— 已开户天数、DD 进度（每笔可记录）、DD 截止（逾期/临近标红）、月费一目了然（独立一列）、安全关户日期、churn 冷却倒计时；桌面端表格、手机端卡片，响应式布局
- **申请结果与实收统计** —— 可把 Offer 标为“拿不了优惠”或“开户被拒绝”；被拒时记录原因和日期，面板自动显示距今天数；奖励到账后可记录实际金额并统计总 Bonus
- **复合资格规则** —— 现有账户、关户历史、领奖历史、会员、自然年、家庭与终身限制分别显示；能以开户、关户或奖励到账为基准的规则会逐条实时倒计时
- **历史账户补录** —— 一次填写历史开户、关户、领奖日期和实收金额；不套用当前 Offer 的 DD/持有要求，并按同一银行最近的历史日期计算资格
- **到期与持有倒计时** —— 桌面表头滚动时固定；独立显示 Offer 到期天数、DoC 核对的最低持有期，以及开户后距离安全关户还剩多少天
- **银行分区与关户方式** —— 按 Bank Bonus Wizard 的范围分成全国性/区域性银行；有可靠 DoC 数据时显示具体关户方法和原文链接
- **本地数据** —— 一个 SQLite 文件就是全部状态，复制即备份，删除即重置

## 环境要求

- **Node.js 24** —— `better-sqlite3` 会针对当前 Node 编译原生模块；以后换 Node 版本请执行 `npm rebuild better-sqlite3`
- **一个 OpenAI 兼容的 LLM API key** —— 默认 DeepSeek（便宜且这个任务上足够准确）；Kimi、Qwen、OpenRouter、本地 Ollama 都可以，改 Base URL 即可

## 安装与运行

### Docker（推荐）

不需要装 Node、不需要编译工具，有 Docker 就行：

```bash
docker run -d -p 3000:3000 -v ./data:/data ghcr.io/pumpkinperson996/bank-bonus-tracker:latest
# 或者在克隆的仓库里：
docker compose up -d
```

打开 http://localhost:3000。全部状态（含你的 API key）都在挂载的 `./data` 文件夹里——复制该文件夹即备份。升级 = 拉新镜像重建容器，数据文件夹原样保留。

### 源码运行

需要 Node 24（见上方环境要求）：

```bash
git clone <this-repo>
cd bankdd
npm install
npm run dev        # 开发模式，http://localhost:3000
# 或生产模式：
npm run build && npm start
```

首次运行会自动创建数据库文件 `data.db`。

## 配置

打开应用中的 **Settings** 页面填写：

| 设置项 | 默认值 | 说明 |
|---|---|---|
| Base URL | `https://api.deepseek.com` | 任何 OpenAI 兼容的 `/chat/completions` 端点 |
| Model | `deepseek-v4-flash` | 备选见下表 |
| API key | *(空)* | 只存在本地 `data.db` 里，除调用 API 外不会离开你的电脑 |

其他服务商（改 Base URL 和 Model，其余不动）：

| 服务商 | Base URL | 示例模型 |
|---|---|---|
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-flash` |
| 月之暗面 Kimi | `https://api.moonshot.cn/v1` | `kimi-k2` |
| 阿里 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-max` |
| OpenRouter | `https://openrouter.ai/api/v1` | 任意在列模型 |
| Ollama（本地） | `http://localhost:11434/v1` | `llama3.3` 等 |

> 注意：DeepSeek 旧模型名 `deepseek-chat` / `deepseek-reasoner` 已于 2026-07-24 弃用。如果你保存的设置里还是旧名，应用会自动迁移为 `deepseek-v4-flash`。

## 使用方法

1. **New offer** —— 粘贴 offer 页面链接；多个链接每行一个即进入批量模式；也可以直接贴 offer 文字。点 **Analyze**，审核预填好的表单（多档位时先选你要开的档位），改错、保存。不配 API key 也可以纯手动录入。
2. **Dashboard** —— 实际开户后点 offer 下的 **+开户**。每笔 DD 到账就记一笔，奖励到账勾选到账，到期安全关户。开户天数、各类截止日、冷却期全部自动算。
3. **Churn 字段** —— 页面没写 churn 规则时由免费搜索补全，并附来源注释（如 "From Doctor of Credit: churnable after 12 months"）。搜索结果永远不会覆盖页面上明确写了的值。

申请结果可在 Offer 的 **编辑** 表单中设置。选择“申请被拒”时必须填写原因；选择“未处理”会清除旧原因。奖励到账后勾选账户的“到账”，系统默认带入 advertised bonus，也可以改成实际到账金额；取消勾选会同时清除到账日期和金额。

## 补缺搜索的工作方式

```
从页面提取 ──▶ 有缺失的 churn/月费字段吗？
                 │没有 → 完成
                 ▼有
        搜索引擎链：DuckDuckGo → Bing → DuckDuckGo Lite
        （第一个能抓到结果页面的引擎胜出）
                 │抓到页面
                 ▼
        你的 LLM 阅读页面、只补缺失字段
        （产品名/账户类型必须在页面中字面出现）
                 │全都没找到
                 ▼
        字段留空，在审核表单里手动填写
```

## 数据与备份

全部数据——offer、账户、DD 记录、设置（含你的 API key）——都在项目根目录的 **`data.db`** 里。Docker 默认对应宿主机挂载目录下的 **`./data/data.db`**。这个文件就是全部状态：复制即备份，删除即重置。它已被 `.gitignore` 排除，**永远不要提交它**。

在导入目录或升级前，先停止应用，再备份数据库。例如源码运行时：

```bash
cp data.db data.db.backup-2026-07-17
```

Docker 部署则备份挂载目录中的文件：

```bash
cp data/data.db data/data.db.backup-2026-07-17
```

## 测试

```bash
npm test           # vitest：日期计算、数据库持久化、提取管线、免费搜索
```

## 常见问题

- **升级 Node 后 `better-sqlite3` 报错** → `npm rebuild better-sqlite3`
- **"Provider rejected the API key"** → 检查 Settings 里的 key 和 Base URL
- **分析成功但 churn 字段是空的** → 三个搜索引擎都没返回可用页面（少见）；在审核表单里手动填写即可
- **offer 页面抓取被拦**（部分银行官网反爬）→ 把 offer 文字复制出来直接粘贴

## 许可证

[MIT](LICENSE)
