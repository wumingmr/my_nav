# my_nav · 移动端本地导航页

纯静态导航主页(HTML/CSS/JS,无后端),数据保存在浏览器 `localStorage`,支持分类管理、书签实时搜索、数据导入导出,配合油猴插件可一键把当前网页添加到导航。

## 功能

- 📂 分类管理:添加/删除/排序分类,自定义分类序号
- 🔖 书签管理:增删改、拖拽排序(长按进入拖放模式)、展开/收起大分类
- 🔍 **书签搜索**:顶部搜索框输入即实时匹配本地书签(标题/URL/分类),`↑/↓` 选择、回车打开、`Esc` 关闭;无匹配时回车走搜索引擎
- 🔁 导入/导出:导出 v4 JSON / 导入 v1~v4 数据,支持背景图自定义
- ☁️ **坚果云 WebDAV 备份**:设置账号应用密码后,一键备份/恢复书签到坚果云
- ➕ 油猴插件:浏览任意网页时点悬浮 `＋` 按钮,一键添加书签到指定分类
- 🔄 书签互转:与 via 浏览器书签 HTML 双向转换,方便导入/导出/同步

## 文件说明

| 文件 | 说明 |
|---|---|
| `index.html` | 导航页入口 |
| `style.css` | 样式 |
| `script.js` | 逻辑(书签数据、渲染、搜索、导入导出) |
| `油猴js插件.user.js` | 油猴脚本(**在线安装用**,见下) |
| `油猴js插件.js` | 油猴脚本(内容同上,本地手动导入用) |
| `bookmarks_convert.py` | via 书签 ↔ my_nav JSON 互转工具(见下) |

## 部署(狐猴浏览器为例,其他浏览器类似)

1. 需要访问 `Android/data/` 目录,把 `index.html`、`style.css`、`script.js` 放入:
   ```
   /storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/
   ```
2. 狐猴浏览器设置主页为:
   ```
   file:///storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/index.html
   ```
3. 扩展管理里允许访问文件网址打开。

## 油猴插件(一键添加网页到导航)

> 安装前注意:安装后需修改脚本内两处配置,使其与你的实际路径一致。

**方式一:点击安装(推荐)**

👇 在已启用油猴扩展(Tampermonkey / Violentmonkey)的浏览器中点击:

**[📥 点击安装油猴插件](https://github.com/wumingmr/my_nav/raw/main/%E6%B2%B9%E7%8C%B4js%E6%8F%92%E4%BB%B6.user.js)**

浏览器会弹出油猴安装确认界面,确认即可。

**方式二:手动导入**

把 `油猴js插件.js` 的内容复制,在油猴扩展的"新建脚本"中粘贴保存。

**安装后必改配置**(脚本开头):

```js
// @match        file:///storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/index.html*

const localNavPagePath = "file:///storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/index.html";
```

- `@match` 需改为你主页的实际 `file://` 地址(带 `*` 通配符)
- `localNavPagePath` 需与主页地址完全一致

> 若你之前安装过旧版,请重新安装一次以启用新的「坚果云备份」功能(旧版不含 WebDAV 逻辑)。

### 使用

浏览任意网页时,右下角会出现绿色悬浮 `＋` 按钮(可拖拽),点击后:
1. 选择要添加到的分类(输入序号)或输入新分类名
2. 确认标题
3. 自动跳转到导航页并写入书签

## 坚果云 WebDAV 备份

> 原理:坚果云 WebDAV 接口**不支持 CORS**,浏览器无法直接请求,因此备份/恢复由油猴脚本用 `GM_xmlhttpRequest` 执行(可绕过 CORS)。**需要安装并更新上面的油猴插件**。

### 使用方法

1. 获取应用密码:登录 [坚果云网页版](https://www.jianguoyun.com/) → 右上角头像 →「账户信息」→「安全选项」→ 添加**应用密码**(第三方应用管理 → 添加应用)。⚠️ 不是登录密码。
2. 打开导航页 → 设置 →「坚果云备份」:
   - 填入账号(坚果云注册邮箱)和应用密码,点「保存账号」(仅存本机浏览器 `localStorage`)
   - 点「☁ 备份到坚果云」:书签+分类数据打包上传到 `dav.jianguoyun.com/dav/my_nav_backup/nav.json`(坚果云保留历史版本,天然多版本)
   - 点「☁ 从坚果云恢复」:下载云端备份并覆盖当前数据(有确认提示)

### 注意事项

- 备份内容:书签、分类顺序/序号、布局偏好(不含自定义背景图)
- 需要油猴脚本运行在导航页上(即脚本已安装且 `@match` 覆盖主页地址)
- 未收到油猴响应时,页面会提示检查插件是否安装/更新
- 云端路径固定为 `my_nav_backup/nav.json`,坚果云免费版自带 30 天文件历史版本,误覆盖可去坚果云网页找回

## 书签互转工具(via ↔ my_nav)

`bookmarks_convert.py` 用 Python 标准库实现,无第三方依赖,把 **via 浏览器导出的书签 HTML** 与 **my_nav JSON(v4)** 双向转换。

```bash
# 1. via 书签 HTML → my_nav JSON(可直接导入 my_nav)
python3 bookmarks_convert.py via2json ~/bookmarks.html

# 2. 同步:把 via 新书签增量合并进已有 my_nav JSON(按 url 去重,新分类追加末尾)
python3 bookmarks_convert.py via2json ~/bookmarks.html --merge nav.json

# 3. my_nav JSON → via 可导入的 HTML
python3 bookmarks_convert.py json2via nav.json
```

输出默认在输入文件同目录(`bookmarks.json` / `nav.via.html`),可用 `-o` 指定路径。

### 转换规则

| 场景 | 处理 |
|---|---|
| via 嵌套分类(二级/多级目录) | 直接拍平为一级,**书签归入其直接父分类名** |
| 根目录下无分类的书签 | 归入「未分类」 |
| 分类顺序 | 按 HTML 中出现顺序生成,`sortOrders` 自动按 10/20/30… 编号 |
| 重复 URL | 默认去重(`--keep-dupes` 可关闭) |
| `javascript:`、`about:` 等伪协议/空 URL | 自动跳过 |

> 导出 my_nav JSON 的方法:导航页 → 设置 →「导出数据」,得到一个 JSON 文件。
> via 导出书签的方法:via 设置 → 书签 → 导出(得到 `bookmarks.html`)。
