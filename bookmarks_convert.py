#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
via 浏览器书签 HTML  <->  my_nav JSON (v4)  互转工具
==================================================================
用法:
    python3 bookmarks_convert.py via2json ~/bookmarks.html
        把 via 导出的书签 HTML 转为 my_nav 可导入的 JSON。
        嵌套分类直接拍平为一级:书签归入其【直接父分类】名;
        根目录下无分类的书签归入「未分类」。
        默认按 url 去重。默认输出 bookmarks.json。

    python3 bookmarks_convert.py via2json ~/bookmarks.html --merge nav.json -o merged.json
        合并模式:把 via 的新书签增量合并进现有 my_nav JSON,
        已有 url 跳过,新分类追加到末尾。用于日常同步。

    python3 bookmarks_convert.py json2via nav.json
        把 my_nav 导出的 JSON 转回 via 可导入的 HTML。
        默认输出 nav.via.html。

my_nav JSON 格式 (version 4):
    { "version": 4, "layout": "grid", "order": [...分类...],
      "sortOrders": {分类: 序号}, "links": [{id,text,url,category,sortOrder}] }
"""
import argparse
import html
import json
import random
import re
import sys
import time

DOCTYPE = """<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EXPIRE="Thu, 01 Jan 1970 00:00:00 GMT">
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>"""

UNCATEGORIZED = "未分类"
SKIP_PREFIXES = ("javascript:", "about:", "chrome://", "opera:", "edge://", "data:")


# ---------------------------------------------------------------- 解析 via HTML
def parse_via_html(text):
    """把 Netscape 书签 HTML 解析为树:
       元素 = ('dir', 分类名, [children]) | ('link', 标题, url)
    """
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    token_re = re.compile(r"<DT>\s*(<H3\b[^>]*>.*?</H3>|<A\b[^>]*>.*?</A>)", re.S)
    dl_re = re.compile(r"<DL\b.*?>", re.S)
    dl_close_re = re.compile(r"</DL>", re.S)

    tree = []
    stack = [tree]  # stack[-1] 为当前收集列表
    i = text.find("<DL")
    if i < 0:
        raise ValueError("不是有效的书签 HTML:未找到 <DL> 根节点")
    while i < len(text):
        m1 = token_re.search(text, i)
        m2 = dl_re.search(text, i)
        m3 = dl_close_re.search(text, i)
        cands = [m for m in (m1, m2, m3) if m]
        if not cands:
            break
        m = min(cands, key=lambda x: x.start())
        i = m.end()
        s = m.group(0)
        if s.startswith("<DT>"):
            tag = s[4:]
            if tag.startswith("<H3"):
                name = html.unescape(re.sub(r"<[^>]+>", "", tag)).strip()
                child = []
                stack[-1].append(("dir", name, child))
                stack.append(child)
            else:  # <A>
                url_m = re.search(r'HREF="([^"]*)"', tag)
                title = html.unescape(re.sub(r"<[^>]+>", "", tag)).strip()
                url = html.unescape(url_m.group(1)) if url_m else ""
                stack[-1].append(("link", title, url))
        elif s.startswith("<DL"):
            pass  # 分类后紧跟的 <DL> 已由 <H3> 的 push 处理
        else:  # </DL>
            if len(stack) > 1:
                stack.pop()
    return tree


# ---------------------------------------------------------------- via -> JSON
def gen_id():
    return "link-%d-%s" % (int(time.time() * 1000),
                           random.randrange(16 ** 6))


def via_to_nav(tree, dedupe=True):
    """拍平树为 my_nav v4 JSON(书签归入直接父分类,根下书签归「未分类」)。"""
    links = []
    order = []
    sort_orders = {}
    seen = set()
    base = int(time.time() * 1000)

    def register(cat):
        if cat not in order:
            order.append(cat)
            sort_orders[cat] = len(order) * 10

    def add_link(cat, title, url):
        if not url or url.lower().startswith(SKIP_PREFIXES):
            return
        if dedupe and url in seen:
            return
        seen.add(url)
        links.append({
            "id": gen_id(),
            "text": title or url,
            "url": url,
            "category": cat,
            "sortOrder": base + len(links) + 1,
        })

    def walk(items, parent):
        for it in items:
            if it[0] == "dir":
                register(it[1])        # 分类按 HTML 出现顺序注册
                walk(it[2], it[1])     # 子分类:其书签归入子分类名
            else:
                cat = parent if parent is not None else UNCATEGORIZED
                register(cat)          # 根目录书签触发「未分类」
                add_link(cat, it[1], it[2])

    walk(tree, None)
    return {"version": 4, "layout": "grid",
            "order": order, "sortOrders": sort_orders, "links": links}


# ---------------------------------------------------------------- JSON -> via
def nav_to_via_html(data):
    """my_nav JSON(v4 或 v1 数组)→ Netscape 书签 HTML(via 可导入)。"""
    if isinstance(data, list):  # v1 兼容:仅链接数组
        links = data
        seen_cats = []
        for l in links:
            c = l.get("category") if isinstance(l, dict) else None
            if c and c not in seen_cats:
                seen_cats.append(c)
        order = seen_cats
    else:
        links = data.get("links", []) or []
        order = data.get("order") or []
        known = set(order)
        for l in links:
            c = l.get("category") if isinstance(l, dict) else None
            if c and c not in known:
                known.add(c)
                order.append(c)

    now = int(time.time())
    out = [DOCTYPE]
    out.append("<DL><p>")

    def esc(s):
        return html.escape(s or "", quote=True)

    for cat in order:
        cat_links = [l for l in links
                     if isinstance(l, dict) and l.get("category") == cat]
        cat_links.sort(key=lambda l: l.get("sortOrder")
                       if isinstance(l.get("sortOrder"), (int, float)) else 1e18)
        out.append('  <DT><H3 ADD_DATE="%d">%s</H3>' % (now, esc(cat)))
        out.append("  <DL><p>")
        for l in cat_links:
            title = l.get("text") or l.get("url") or ""
            url = l.get("url") or ""
            out.append('    <DT><A HREF="%s" ADD_DATE="%d">%s</A>'
                       % (esc(url), now, esc(title)))
        out.append("  </DL><p>")

    # 无分类书签放根目录
    for l in links:
        if not isinstance(l, dict) or l.get("category"):
            continue
        title = l.get("text") or l.get("url") or ""
        url = l.get("url") or ""
        if url:
            out.append('  <DT><A HREF="%s" ADD_DATE="%d">%s</A>'
                       % (esc(url), now, esc(title)))
    out.append("</DL><p>")
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- 合并(同步)
def merge_nav(existing, new_tree, dedupe=True):
    """把 via 书签增量合并进现有 my_nav JSON,按 url 去重。"""
    if not isinstance(existing, dict) or "links" not in existing:
        raise ValueError("--merge 需要有效的 my_nav JSON(v4)")
    links = list(existing.get("links") or [])
    order = list(existing.get("order") or [])
    sort_orders = dict(existing.get("sortOrders") or {})
    layout = existing.get("layout", "grid")
    seen = {l.get("url") for l in links if isinstance(l, dict) and l.get("url")}
    base = int(time.time() * 1000)
    added = 0
    skipped = 0

    def ensure_cat(cat):
        if cat not in order:
            order.append(cat)
            sort_orders[cat] = len(order) * 10

    def add(cat, title, url):
        nonlocal added, skipped
        if not url or url.lower().startswith(SKIP_PREFIXES):
            return
        if url in seen:
            skipped += 1
            return
        seen.add(url)
        ensure_cat(cat)
        links.append({"id": gen_id(), "text": title or url, "url": url,
                      "category": cat, "sortOrder": base + len(links) + 1})
        added += 1

    def walk(items, parent):
        for it in items:
            if it[0] == "dir":
                ensure_cat(it[1])
                walk(it[2], it[1])
            else:
                cat = parent if parent is not None else UNCATEGORIZED
                ensure_cat(cat)
                add(cat, it[1], it[2])

    walk(new_tree, None)
    merged = {"version": 4, "layout": layout,
              "order": order, "sortOrders": sort_orders, "links": links}
    return merged, added, skipped


# ---------------------------------------------------------------- CLI
def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main(argv=None):
    p = argparse.ArgumentParser(
        prog="bookmarks_convert.py",
        description="via 书签 HTML <-> my_nav JSON(v4) 互转工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="示例:\n"
               "  via2json  bookmarks.html              -> bookmarks.json\n"
               "  via2json  bookmarks.html --merge nav.json\n"
               "  json2via  nav.json                    -> nav.via.html\n")
    sub = p.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("via2json", help="via HTML -> my_nav JSON")
    p1.add_argument("input", help="via 导出的书签 HTML 文件")
    p1.add_argument("-o", "--output", help="输出 JSON 路径(默认输入同名 .json)")
    p1.add_argument("--merge", metavar="JSON", help="合并进现有 my_nav JSON(同步)")
    p1.add_argument("--keep-dupes", action="store_true",
                    help="保留重复 url(默认去重)")

    p2 = sub.add_parser("json2via", help="my_nav JSON -> via HTML")
    p2.add_argument("input", help="my_nav 导出的 JSON 文件")
    p2.add_argument("-o", "--output", help="输出 HTML 路径(默认输入名 .via.html)")

    args = p.parse_args(argv)

    if args.cmd == "via2json":
        with open(args.input, encoding="utf-8") as f:
            tree = parse_via_html(f.read())
        if args.merge:
            existing = load_json(args.merge)
            result, added, skipped = merge_nav(existing, tree,
                                               dedupe=not args.keep_dupes)
            out = args.output or (args.input.rsplit(".", 1)[0] + ".json")
            with open(out, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print("合并完成:新增 %d 条,跳过已有 %d 条,共 %d 条链接,%d 个分类"
                  % (added, skipped, len(result["links"]), len(result["order"])))
            print("输出:", out)
        else:
            result = via_to_nav(tree, dedupe=not args.keep_dupes)
            out = args.output or (args.input.rsplit(".", 1)[0] + ".json")
            with open(out, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print("转换完成:%d 条链接,%d 个分类" % (len(result["links"]),
                                                len(result["order"])))
            print("输出:", out)

    elif args.cmd == "json2via":
        data = load_json(args.input)
        out = args.output or (args.input.rsplit(".", 1)[0] + ".via.html")
        with open(out, "w", encoding="utf-8") as f:
            f.write(nav_to_via_html(data))
        links = data if isinstance(data, list) else (data.get("links") or [])
        print("转换完成:%d 条链接" % len(links))
        print("输出:", out)

    return 0


if __name__ == "__main__":
    sys.exit(main())
