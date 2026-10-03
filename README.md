# 行程网站

一个手机上看的旅行行程页。**所有行程内容都在 `trip.json` 里**，改计划只改这一个文件，代码不用动。

- 网址：`https://jimzenn.github.io/rikugan/`（分享时**带上最后的 `/`**，不带的话没信号时打不开）
- 打开过一次之后，没信号也能看（显示上次加载的版本）。有信号时会自动拿最新的 `trip.json`。

---

## 怎么改行程

最简单的方法是直接在 GitHub 网页上改：

1. 打开仓库里的 `trip.json`，点右上角铅笔图标编辑
2. 改完把 `trip.lastUpdated` 改成今天的日期（页面顶部会显示“最后更新”）
3. 点 **Commit changes**，提交到 `main`
4. 等 1 到 2 分钟（GitHub Pages 要重新发布），手机上刷新页面

### JSON 格式的几个坑

- 字符串必须用英文双引号 `"`，不能用中文引号 `“”`
- 每项之间用英文逗号 `,` 隔开，**最后一项后面不能有逗号**
- 括号要成对：`{ }` 是对象，`[ ]` 是列表

如果改坏了，页面顶部会出现一条提示，说明 `trip.json` 哪里读不了，下面会继续显示**上次能正常读取的版本**，所以出门在外的人不会看到空白页。提交前也可以把内容贴到 <https://jsonlint.com> 检查一下，或者在本地运行 `python3 -m json.tool trip.json`。

### 这是公开网站

任何拿到链接的人都能看到。**不要写**：预订确认码、电话号码、家庭住址。

---

## 每种对象长什么样

下面每个例子都是最短可用的写法。没写的字段就不显示。

### `trip`：标题和日期

```json
"trip": {
  "title": "北卡秋叶之旅",
  "subtitle": "匹兹堡 → Blue Ridge Parkway → Asheville → Durham",
  "startDate": "2026-10-08",
  "endDate": "2026-10-12",
  "lastUpdated": "2026-10-03"
}
```

日期一律写成 `YYYY-MM-DD`。`lastUpdated` 原样显示，可以写成 `"2026-10-05 21:00 ET"` 这样。

### `people`：同行的人

```json
{ "id": "pp", "name": "pp", "from": "匹兹堡", "summary": "匹兹堡出发，全程同行" }
```

`id` 是给日程条目里的 `who` 引用的，写小写英文，不要和别人重复。`name` 是页面上显示的名字。

### `days`：每天一张卡片

```json
{
  "date": "2026-10-09",
  "title": "匹兹堡 → Blowing Rock",
  "items": [ ...这一天的条目... ]
}
```

星期几和“第几天”是根据 `date` 和顺序自动算的，不用写。

### 日程条目（`items` 里的每一项）

```json
{
  "time": "13:05 PT",
  "title": "SFO 起飞：Southwest WN 3257",
  "who": ["nnez"],
  "place": { "name": "SFO", "mapQuery": "San Francisco International Airport" },
  "notes": ["经 St. Louis (STL) 转机", "约 $535"],
  "links": [{ "label": "值机", "url": "https://www.southwest.com/" }],
  "status": "planned"
}
```

| 字段 | 说明 |
| --- | --- |
| `time` | 随便写，**原样显示，不做时区换算**。建议带时区，比如 `13:05 PT`、`约 08:00 ET`、`上午` |
| `title` | 必填 |
| `who` | 人的 `id` 列表，比如 `["nnez", "pp"]`；写 `"all"` 显示为“大家” |
| `place` | 生成 Google Maps 按钮。`mapQuery` 是给地图搜索用的，不写就用 `name` 去搜。**可以是一个，也可以是列表**：`[{...}, {...}]` |
| `notes` | 补充说明，字符串列表 |
| `links` | 链接按钮，`{ "label": "...", "url": "..." }` 的列表 |
| `status` | 见下面“状态” |

条目按你写的顺序显示，不会自动按时间排序。

### `bookings`：预订

分三组：`flights`（机票）、`car`（车）、`lodging`（住宿）。每一组是一个列表，**每项的字段和日程条目完全一样**：

```json
"lodging": [
  { "time": "10/11，一晚", "title": "Asheville", "status": "tbd" }
]
```

注意：机票、住宿在“日程”和“预订”里各出现一次。订好之后，**两处的 `status` 都要改**（在编辑器里搜航班号或地名就能找到）。

### `costs`：费用

```json
{
  "title": "租车（Enterprise）",
  "amount": 518.69,
  "split": ["nnez", "pp"],
  "paidBy": "nnez",
  "status": "confirmed",
  "notes": ["预估价"]
}
```

- `amount` 写数字，不带 `$`。还不知道就写 `null`，显示“金额待定”，不算进合计
- `split` 是分摊的人；写 `"all"` 就是“同行的人”里的所有人
- `paidBy` 是谁先垫付（可选）。写了的话，页面会算出每个人应付或应收多少
- 每人份额、每人合计都是页面自动算的，改金额或分摊的人就行，不用自己算

### `places`：地点

```json
{
  "name": "Nasher Museum of Art",
  "mapQuery": "Nasher Museum of Art, Durham, NC",
  "hours": "周一闭馆",
  "notes": ["在 Duke 校园里"],
  "link": { "label": "开放时间", "url": "https://nasher.duke.edu/hours-admission/" }
}
```

点地名会在 Google Maps 里打开。

### `tips`：注意事项

按小标题分组，每组是一串短句：

```json
"tips": {
  "信号": ["Parkway 上很多地方没信号", "出发前下载离线地图"],
  "天气": ["山上早晚 2–8°C"]
}
```

### `openQuestions`：待定事项

```json
{ "text": "pp 怎么回匹兹堡", "owner": "pp", "due": "10/6" }
```

`owner` 写人的 `id` 会显示成名字，也可以直接写 `"群聊"`。`due` 随便写。问题解决了就把这一项删掉。

### `packing`：行李清单

```json
"packing": ["驾照", "充电宝、车载充电线"]
```

页面上可以打勾，勾选只保存在各自的手机上。

### `links`：常用链接

```json
"links": [
  { "label": "Blue Ridge Parkway 路况", "url": "https://www.nps.gov/blri/planyourvisit/roadclosures.htm" }
]
```

---

## 加一天、加一个条目

**加一个条目**：在那一天的 `items` 列表里，复制一个现有条目 `{ ... }`，粘贴到想要的位置，改内容。记得前一项后面要有逗号。

**加一天**：在 `days` 列表里复制一整天 `{ "date": ..., "title": ..., "items": [...] }`，改日期和内容。如果行程变长了，同时改 `trip.endDate`。顶部的日期按钮会自动多出一个。

---

## 状态（`status`）

| 值 | 显示 | 意思 |
| --- | --- | --- |
| `confirmed` | 绿色“已确认” | 已订好或已说定 |
| `planned` | 蓝色“计划中” | 打算这样走，还没订 |
| `tbd` | 黄色“! 待定”，整条底色变黄、左边有黄条 | 还没定或还没订，要有人跟进 |

- 顶部的图例会统计日程里每种状态各有几项
- 某一天只要有一条“待定”，顶部那天的日期按钮右上角就会有个黄点
- **没写 `status`，或者拼错了，会按“待定”显示**，这样不会有东西被悄悄当成已经搞定
- 机票订好之前保持 `planned`，订好改成 `confirmed`

---

## 本地预览

在仓库目录下运行：

```sh
python3 -m http.server 8000
```

然后打开 <http://localhost:8000/>。直接双击 `index.html` 打开是不行的，浏览器不允许本地文件读取 `trip.json`。

想看旅行中某一天的样子（今天那张卡片会高亮，并且自动滚过去），在网址后面加 `?today=`：

```
http://localhost:8000/?today=2026-10-10
```

---

## 部署（GitHub Pages）

只需要设置一次：

1. 仓库 **Settings → Pages**
2. **Source** 选 **Deploy from a branch**
3. **Branch** 选 `main`，文件夹选 `/ (root)`，点 **Save**
4. 等 1 到 2 分钟，网址会出现在同一页顶部

之后每次往 `main` 提交，网站都会自动更新。

> 如果仓库是私有的，免费账号用不了 GitHub Pages，需要把仓库改成公开。

---

## 文件

| 文件 | 作用 |
| --- | --- |
| `trip.json` | 全部行程内容，平时只改这个 |
| `index.html` | 页面骨架 |
| `style.css` | 样式，含深色模式 |
| `app.js` | 读取 `trip.json` 并生成页面 |
| `sw.js` | Service worker，负责离线缓存 |
| `.nojekyll` | 让 GitHub Pages 原样发布文件，不经过 Jekyll |

离线缓存的逻辑：`trip.json` 先走网络（4 秒没响应就先显示缓存），其他文件先用缓存、后台更新。改了 `index.html`、`style.css`、`app.js` 不用做别的，刷新两次就能看到新版本。只有往缓存列表里**增删文件**时，才需要把 `sw.js` 里的 `:v1` 改成 `:v2`。
