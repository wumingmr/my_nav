// ==UserScript==
// @name         添加到本地导航页
// @namespace   github.com/wumingmr/my_nav
// @version      1.0
// @description  适用于移动端
// @author       无名
// @match        *://*/*
// @match        file:///storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/index.html*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_openInTab
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 【配置：请确保此路径与你手机文件的真实路径完全一致】
    const localNavPagePath = "file:///storage/emulated/0/Android/data/com.lemurbrowser.exts/files/Download/index.html";

    // =======================================================================
    // 逻辑 A：本地导航页内部 (负责发送分类给js脚本)
    // =======================================================================
    if (window.location.href.startsWith("file://") && window.location.href.includes("index.html")) {
        const syncToStorage = () => {
            const rawData = localStorage.getItem('categoryOrder');
            if (rawData) {
                try {
                    const parsed = JSON.parse(rawData);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        GM_setValue('navCategories', parsed);
                        console.log("✅ 分类已同步至油猴存储:", parsed);
                    }
                } catch (e) { console.error("解析分类失败", e); }
            }
        };
        syncToStorage();
        return; 
    }

    // =======================================================================
    // 逻辑 B：普通网页 (负责显示按钮和处理添加)
    // =======================================================================

    // 1. 样式注入 (包含按钮位置和基础外观)
    GM_addStyle(`
        #add-to-nav-btn {
            position: fixed; bottom: 100px; right: 20px; z-index: 999999;
            background-color: #4CAF50; color: white; border: none;
            border-radius: 50%; width: 56px; height: 56px;
            font-size: 28px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            user-select: none; touch-action: none; opacity: 0.8;
        }
    `);

    const btn = document.createElement('div');
    btn.id = 'add-to-nav-btn';
    btn.innerHTML = '＋';
    document.body.appendChild(btn);

    // 2. 移动端拖拽逻辑 (防止点击和拖拽冲突)
    let isDragging = false;
    let hasMoved = false;
    let startX, startY, btnX, btnY;

    btn.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        const rect = btn.getBoundingClientRect();
        btnX = rect.left;
        btnY = rect.top;
        hasMoved = false;
    }, {passive: false});

    btn.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            hasMoved = true;
            btn.style.left = (btnX + dx) + 'px';
            btn.style.top = (btnY + dy) + 'px';
            btn.style.right = 'auto'; btn.style.bottom = 'auto';
        }
    }, {passive: false});

    btn.addEventListener('touchend', () => {
        if (!hasMoved) {
            triggerAddFlow();
        }
    });

    // 3. 核心添加流程
    function triggerAddFlow() {
        // --- 第一步：获取最新分类并弹出序号选择 ---
        // 从油猴存储取，取不到则用默认
        const categories = GM_getValue('navCategories', ["常用网站", "未分类"]);
        
        let msg = `添加到哪个分类？(输入数字序号)\n\n`;
        categories.forEach((name, i) => {
            msg += `${i + 1}. ${name}\n`;
        });
        msg += `\n或直接输入新分类名称：`;

        const userInput = prompt(msg, "1");
        if (userInput === null) return;

        let finalCategory = "";
        const num = parseInt(userInput.trim());
        if (!isNaN(num) && num > 0 && num <= categories.length) {
            finalCategory = categories[num - 1]; // 根据序号选
        } else {
            finalCategory = userInput.trim() || "未分类"; // 输入文字则创建新分类
        }

        // --- 第二步：确认标题 ---
        const pageTitle = document.title || "无标题";
        const finalTitle = prompt("确认标题:", pageTitle);
        if (finalTitle === null) return;

        // --- 第三步：组装数据并跳转 ---
        const linkData = {
            url: window.location.href,
            text: finalTitle.trim() || pageTitle,
            category: finalCategory
        };

        try {
            // 关键：确保 encodedData 干净
            const jsonStr = JSON.stringify(linkData);
            const encodedData = encodeURIComponent(jsonStr);
            
            // 构建最终 URL
            const targetUrl = localNavPagePath + "#addlink=" + encodedData;
            
            console.log("🚀 准备跳转至:", targetUrl);

            // 尝试打开新标签页 (后台模式)
            const tab = GM_openInTab(targetUrl, { 
                active: false, 
                insert: true, 
                setParent: true 
            });

            if (!tab) {
                // 如果油猴 失败，尝试原生跳转 (这会导致当前页跳转，但最稳)
                // window.location.href = targetUrl; 
                alert("跳转失败，请检查浏览器 file:// 访问权限");
            } else {
                alert("已尝试添加到: " + finalCategory);
            }

        } catch (err) {
            console.error("组装数据出错:", err);
            alert("脚本执行出错: " + err.message);
        }
    }

})();