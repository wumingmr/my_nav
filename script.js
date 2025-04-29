let categoryDisplayOrder = [];
let categorySortData = {};
let linksData = [];
const layoutStorageKey = 'navLayoutPreference';
const dndModeStorageKey = 'navDnDModePreference';
const categoryOrderStorageKey = 'categoryOrder';
const categorySortOrdersStorageKey = 'categorySortOrders';
const linksDataStorageKey = 'navLinksData';
const backgroundImageStorageKey = 'backgroundImageData';
const lastSearchEngineStorageKey = 'lastSearchEngine';
const LONG_PRESS_DURATION = 700;
const MAX_VISIBLE_LINKS = 6;

function saveCategoryOrder() {
    try {
        localStorage.setItem(categoryOrderStorageKey, JSON.stringify(categoryDisplayOrder));
        console.log("分类顺序列表已保存:", JSON.stringify(categoryDisplayOrder));
    } catch (error) {
        console.error("保存分类顺序列表失败:", error);
        alert("无法保存分类顺序列表，本地存储可能出错。");
    }
}

function saveCategorySortOrders() {
    try {
        localStorage.setItem(categorySortOrdersStorageKey, JSON.stringify(categorySortData));
        console.log("分类序号已保存:", JSON.stringify(categorySortData));
    } catch (error) {
        console.error("保存分类序号失败:", error);
        alert("无法保存分类序号，本地存储可能出错。");
    }
}

function loadCategoryOrder() {
    const storedOrder = localStorage.getItem(categoryOrderStorageKey);
    let orderInitialized = false;
    if (storedOrder) {
        try {
            const parsedOrder = JSON.parse(storedOrder);
            if (Array.isArray(parsedOrder) && parsedOrder.every(item => typeof item === 'string')) {
                categoryDisplayOrder = parsedOrder;
                orderInitialized = true;
                console.log("从 localStorage 加载分类顺序列表:", categoryDisplayOrder);
            } else {
                console.warn("存储的分类顺序列表格式无效 (非字符串数组)，将重新生成。");
            }
        } catch (e) {
            console.error("解析存储的分类顺序列表时出错:", e);
        }
    }
    if (!orderInitialized) {
        console.log("未能从 localStorage 加载有效顺序列表，将根据 linksData 生成...");
        const categoriesFromData = new Set();

        if (Array.isArray(linksData)) {
            linksData.forEach(link => {
                if (link && typeof link.category === 'string') categoriesFromData.add(link.category);
            });
        }
        categoryDisplayOrder = Array.from(categoriesFromData);
        if (categoryDisplayOrder.length === 0 && (typeof getDefaultLinks === 'function')) {
            const defaultLinks = getDefaultLinks();
            if (Array.isArray(defaultLinks)) {
                const defaultCats = new Set();
                defaultLinks.forEach(link => {
                    if (link && typeof link.category === 'string') defaultCats.add(link.category);
                });
                categoryDisplayOrder = Array.from(defaultCats);
                console.log("linksData 为空，根据默认链接生成顺序列表:", categoryDisplayOrder);
            }
        }
        saveCategoryOrder();
        console.log("已生成并保存初始分类顺序列表:", categoryDisplayOrder);
    }

}

function loadCategorySortOrders() {
    const storedSortOrders = localStorage.getItem(categorySortOrdersStorageKey);
    let ordersDataInitialized = false;
    if (storedSortOrders) {
        try {
            const parsedOrders = JSON.parse(storedSortOrders);
            if (typeof parsedOrders === 'object' && parsedOrders !== null && !Array.isArray(parsedOrders)) {
                categorySortData = parsedOrders;
                ordersDataInitialized = true;
                console.log("从 localStorage 加载分类序号:", categorySortData);
            } else {
                console.warn("存储的分类序号格式无效 (不是对象)，将重新生成。");
            }
        } catch (e) {
            console.error("解析存储的分类序号时出错:", e);
        }
    }
    let needsSave = !ordersDataInitialized;
    const existingSortKeys = new Set(Object.keys(categorySortData));
    if (Array.isArray(categoryDisplayOrder)) {

        categoryDisplayOrder.forEach((categoryName, index) => {
            if (typeof categorySortData[categoryName] !== 'number') {
                console.warn(`分类 "${categoryName}" 在序号数据中缺失，赋予默认序号。`);
                categorySortData[categoryName] = (index + 1) * 10;
                needsSave = true;
            }
            existingSortKeys.add(categoryName);
        });
        Object.keys(categorySortData).forEach(key => {
            if (!categoryDisplayOrder.includes(key)) {
                console.warn(`分类 "${key}" 在序号数据中存在，但在当前分类列表中缺失，将从序号数据中移除。`);
                delete categorySortData[key];
                needsSave = true;
            }
        });
    } else {
        console.error("categoryDisplayOrder 不是有效数组，无法生成或同步分类序号。");
        categorySortData = {};
        needsSave = true;
    }
    if (needsSave) {
        saveCategorySortOrders();
        console.log("已生成或同步并保存分类序号:", categorySortData);
    }
    if (Array.isArray(linksData)) {
        const currentCategoriesInOrderSet = new Set(categoryDisplayOrder);
        let orderListChanged = false;
        let sortDataChanged = false;
        linksData.forEach(link => {
            if (link && typeof link.category === 'string' && !currentCategoriesInOrderSet.has(link.category)) {

                console.warn(`同步检查：发现分类 "${link.category}" 在 linksData 中，但在 categoryOrder 中缺失。将添加到末尾。`);
                categoryDisplayOrder.push(link.category);
                currentCategoriesInOrderSet.add(link.category);
                orderListChanged = true;

                if (typeof categorySortData[link.category] !== 'number') {
                    categorySortData[link.category] = (categoryDisplayOrder.length) * 10;
                    sortDataChanged = true;
                }
            }
        });
        if (orderListChanged) {
            saveCategoryOrder();
        }
        if (sortDataChanged) {
            saveCategorySortOrders();
        }
    }
}

function sortCategories() {
    categoryDisplayOrder.sort((a, b) => {
        const orderA = categorySortData[a] ?? Infinity;
        const orderB = categorySortData[b] ?? Infinity;
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        return a.localeCompare(b);
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const linksContainer = document.getElementById('links-container');
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('modal-title');
    const editIdInput = document.getElementById('edit-id');
    const editCategoryNameInput = document.getElementById('edit-category-name');
    const editText = document.getElementById('edit-text');
    const editUrl = document.getElementById('edit-url');
    const editLinkOrderInput = document.getElementById('edit-link-order');
    const editLinkCategorySelect = document.getElementById('edit-link-category');
    const editLinkCategoryLabel = document.getElementById('edit-link-category-label');
    const saveButton = document.getElementById('save-button');
    const cancelButton = document.getElementById('cancel-button');
    const deleteButton = document.getElementById('delete-button');
    const categoryModal = document.getElementById('edit-category-modal');
    const categoryOriginalNameInput = document.getElementById('edit-category-original-name');
    const categoryNewNameInput = document.getElementById('edit-category-new-name');
    const editCategoryOrderInput = document.getElementById('edit-category-order');
    const saveCategoryButton = document.getElementById('save-category-button');
    const cancelCategoryButton = document.getElementById('cancel-category-button');
    const deleteCategoryButton = document.getElementById('delete-category-button');
    const addCategoryButton = document.getElementById('add-category-button');
    const bgUploadInput = document.getElementById('bg-upload');
    const clearBgButton = document.getElementById('clear-bg-button');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importInput = document.getElementById('import-input');
    const toggleLayoutButton = document.getElementById('toggle-layout-button');
    const searchForm = document.getElementById('search-form');
    const searchEngineSelect = document.getElementById('search-engine-select');
    const searchInput = document.getElementById('search-input');
    console.log("获取到的 editLinkOrderInput 元素:", editLinkOrderInput);
    console.log("获取到的 editLinkCategorySelect 元素:", editLinkCategorySelect);
    if (!editLinkOrderInput || !editLinkCategorySelect) {
        console.error("页面初始化失败：未能获取到链接模态框中的序号或分类选择元素！请检查 HTML ID。");
    }
    let longPressTimer = null;
    let currentEditingLinkId = null;
    let currentEditingCategoryName = null;
    let isDnDMode = false;
    const searchEngines = {
        "百度": "https://www.baidu.com/s?wd={query}",
        "Google": "https://www.google.com/search?q={query}",
        "必应": "https://www.bing.com/search?q={query}",
        "DuckDuckGo": "https://duckduckgo.com/?q={query}",
        "搜狗": "https://www.sogou.com/web?query={query}"
    };

    function applyLayoutPreference() {
        const savedLayout = localStorage.getItem(layoutStorageKey);
        const currentLayout = savedLayout || 'grid';
        if (currentLayout === 'list') {
            document.body.classList.add('layout-list');
        } else {
            document.body.classList.remove('layout-list');
        }
        console.log("应用布局偏好:", currentLayout);
    }

    function applyDnDModePreference() {
        const savedMode = localStorage.getItem(dndModeStorageKey);
        isDnDMode = (savedMode === 'true');
        if (isDnDMode) {
            document.body.classList.add('dnd-mode-active');
        } else {
            document.body.classList.remove('dnd-mode-active');
        }
        console.log("应用拖放模式偏好 (用于控制长按):", isDnDMode);
    }

    function populateSearchEngines() {
        searchEngineSelect.innerHTML = '';
        for (const engineName in searchEngines) {
            const option = document.createElement('option');
            option.value = searchEngines[engineName];
            option.textContent = engineName;
            searchEngineSelect.appendChild(option);
        }
        const lastEngine = localStorage.getItem(lastSearchEngineStorageKey);
        const lastEngineValue = searchEngines[lastEngine];
        if (lastEngineValue) {
            searchEngineSelect.value = lastEngineValue;
        }
    }

    function performSearch() {
        const urlTemplate = searchEngineSelect.value;
        const query = searchInput.value.trim();
        if (!query) {
            searchInput.focus();
            return;
        }
        if (!urlTemplate) {
            alert("请选择一个搜索引擎！");
            return;
        }
        const encodedQuery = encodeURIComponent(query);
        const finalUrl = urlTemplate.replace('{query}', encodedQuery);
        console.log(`执行搜索: ${finalUrl}`);
        window.open(finalUrl, '_blank');
        const selectedEngineName = searchEngineSelect.options[searchEngineSelect.selectedIndex].text;
        localStorage.setItem(lastSearchEngineStorageKey, selectedEngineName);
    }

    function generateUniqueId() {
        return `link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    function getDefaultLinks() {
        const now = Date.now();
        return [{
            id: generateUniqueId(),
            text: "源社区",
            url: "https://ysqbbs.com/forum.php?mod=guide&view=hot&mobile=2&comiis_tab=2",
            category: "常用网站",
            sortOrder: now
        }, {
            id: generateUniqueId(),
            text: "GitHub",
            url: "https://github.com",
            category: "开发",
            sortOrder: now + 1
        }, ];
    }

    function saveLinks() {
        try {
            localStorage.setItem(linksDataStorageKey, JSON.stringify(linksData));
            console.log("链接数据已保存");
        } catch (e) {
            console.error("保存链接数据出错:", e);
            alert("无法保存链接数据");
        }
    }

    function loadLinks() {
        const stored = localStorage.getItem(linksDataStorageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    linksData = parsed;
                    const now = Date.now();
                    linksData.forEach((l, i) => {
                        if (!l.id) l.id = generateUniqueId();
                        if (typeof l.category !== 'string') l.category = '未分类';
                        if (typeof l.sortOrder !== 'number') {
                            console.warn(`链接 ${l.text||l.url} 缺序号`);
                            l.sortOrder = now + i;
                        }
                    });
                    console.log("加载链接:", linksData.length);
                } else {
                    linksData = getDefaultLinks();
                    console.warn("链接数据非数组，重置");
                }
            } catch (e) {
                console.error("解析链接出错:", e);
                linksData = getDefaultLinks();
            }
        } else {
            linksData = getDefaultLinks();
            console.log("无链接数据，用默认");
        }
    }

    function populateCategoryDropdown(selectElement, currentCategory = null) {

        if (!selectElement) {
            console.error("无效的 select 元素传入 populateCategoryDropdown");
            return;
        }
        selectElement.innerHTML = '';
        console.log("填充分类下拉框，当前:", currentCategory, "可用:", categoryDisplayOrder);
        if (!Array.isArray(categoryDisplayOrder)) {
            console.error("categoryDisplayOrder 无效");
            return;
        }
        categoryDisplayOrder.forEach(categoryName => {
            const option = document.createElement('option');
            option.value = categoryName;
            option.textContent = categoryName;
            if (categoryName === currentCategory) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    function createLinkElement(link) {
        if (!link || !link.id) {
            console.error("创建无效链接:", link);
            return null;
        }
        const el = document.createElement('a');
        el.href = link.url;
        el.textContent = link.text;
        el.className = 'link-item';
        el.dataset.id = link.id;
        addLongPressListener(el, 'link');
        return el;
    }

    function addLongPressListener(element, type) {
        let pressTimer = null,
            isLong = false,
            sX, sY, maxM = 15;
        const start = (e) => {
            if ((e.type === 'mousedown' && e.button !== 0) || element.classList.contains('add-link-button')) return;
            if (document.body.classList.contains('dnd-mode-active')) {
                console.log("拖放模式，阻止长按");
                return;
            }
            isLong = false;
            sX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            sY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = setTimeout(() => {
                isLong = true;
                console.log("长按触发:", type, element.dataset.id || element.dataset.categoryName);
                if (type === 'link') {
                    openEditModal(element.dataset.id);
                } else if (type === 'category') {
                    openCategoryEditModal(element.dataset.categoryName);
                }
            }, LONG_PRESS_DURATION);
            document.addEventListener('mousemove', move, {
                passive: true
            });
            document.addEventListener('touchmove', move, {
                passive: true
            });
            document.addEventListener('mouseup', end, {
                once: true
            });
            document.addEventListener('touchend', end, {
                once: true
            });
            document.addEventListener('touchcancel', end, {
                once: true
            });
        };
        const move = (e) => {
            if (pressTimer) {
                const cX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
                const cY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
                const dX = Math.abs(cX - sX);
                const dY = Math.abs(cY - sY);
                if (dX > maxM || dY > maxM) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                    console.log("移动取消长按");
                    removeGlobal();
                }
            }
        };
        const end = (e) => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            removeGlobal();
            if (isLong && type === 'link') {
                element.dataset.longPressed = 'true';
                setTimeout(() => {
                    delete element.dataset.longPressed;
                }, 100);
            }
            isLong = false;
        };
        const removeGlobal = () => {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('touchmove', move);
            document.removeEventListener('mouseup', end);
            document.removeEventListener('touchend', end);
            document.removeEventListener('touchcancel', end);
        };
        element.addEventListener('mousedown', start);
        element.addEventListener('touchstart', start, {
            passive: true
        });
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (document.body.classList.contains('dnd-mode-active')) {
                console.log("拖放模式阻止右键");
                return;
            }
            if (pressTimer) clearTimeout(pressTimer);
            removeGlobal();
            isLong = false;
            console.log("右键触发编辑:", type);
            if (type === 'link') {
                openEditModal(element.dataset.id);
            } else if (type === 'category') {
                openCategoryEditModal(element.dataset.categoryName);
            }
        });
        element.addEventListener('click', (e) => {
            if (element.dataset.longPressed === 'true' && type === 'link') {
                console.log("阻止长按后click");
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    function openEditModal(linkId, categoryNameToAdd = null) {
        console.log(`>>> 打开链接模态框. ID: ${linkId}, 添加到分类: ${categoryNameToAdd}`);

        if (!modal || !modalTitle || !editIdInput || !editText || !editUrl || !editLinkOrderInput || !editCategoryNameInput || !editLinkCategoryLabel || !editLinkCategorySelect || !deleteButton) {
            console.error("链接模态框初始化失败：缺少 DOM 元素引用！");
            return;
        }
        if (linkId) {
            currentEditingLinkId = linkId;
            const link = linksData.find(l => l.id === linkId);
            if (link) {
                console.log(`>>> 找到要编辑的链接:`, link);
                modalTitle.textContent = "编辑链接";
                editIdInput.value = link.id;
                editText.value = link.text;
                editUrl.value = link.url;
                editLinkOrderInput.value = link.sortOrder ?? '';
                editLinkOrderInput.disabled = false;
                editCategoryNameInput.value = '';
                editLinkCategoryLabel.style.display = 'block';
                editLinkCategorySelect.style.display = 'block';
                populateCategoryDropdown(editLinkCategorySelect, link.category);
                deleteButton.style.display = 'block';
                modal.style.display = 'flex';
                console.log(">>> 编辑链接模态框已显示");
            } else {
                console.error(`>>> 未找到要编辑的链接，ID: ${linkId}`);
                alert("错误：找不到要编辑的链接！");
            }
        } else if (categoryNameToAdd) {
            console.log(`>>> 准备添加到分类 "${categoryNameToAdd}"`);
            currentEditingLinkId = null;
            modalTitle.textContent = `添加到 "${categoryNameToAdd}"`;
            editIdInput.value = '';
            editCategoryNameInput.value = categoryNameToAdd;
            editText.value = '';
            editUrl.value = '';
            editLinkOrderInput.value = '';
            editLinkOrderInput.disabled = true;
            editLinkCategoryLabel.style.display = 'none';
            editLinkCategorySelect.style.display = 'none';
            deleteButton.style.display = 'none';
            modal.style.display = 'flex';
            console.log(">>> 添加链接模态框已显示");
        } else {
            console.error(">>> openEditModal 调用参数错误");
        }
    }

    function closeEditModal() {
        modal.style.display = 'none';
        currentEditingLinkId = null;
    }
    saveButton.addEventListener('click', () => {
        const id = editIdInput.value;
        const categoryNameToAdd = editCategoryNameInput.value;
        const newText = editText.value.trim();
        let newUrl = editUrl.value.trim();
        const newSortOrderRaw = editLinkOrderInput.value;
        const newSortOrder = parseInt(newSortOrderRaw, 10);
        const selectedCategory = editLinkCategorySelect.value;
        if (!newText || !newUrl) {
            alert("链接文字和 URL 不能为空！");
            return;
        }
        if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://') && newUrl.includes('.') && !newUrl.includes(':')) {
            newUrl = 'https://' + newUrl;
        }
        if (id) {
            const linkIndex = linksData.findIndex(l => l.id === id);
            if (linkIndex > -1) {
                const oldCategory = linksData[linkIndex].category;
                linksData[linkIndex].category = selectedCategory;
                linksData[linkIndex].text = newText;
                linksData[linkIndex].url = newUrl;

                if (!isNaN(newSortOrder)) {
                    linksData[linkIndex].sortOrder = newSortOrder;
                } else {
                    if (typeof linksData[linkIndex].sortOrder !== 'number') {
                        linksData[linkIndex].sortOrder = Date.now();
                    }
                    console.warn(`链接 "${newText}" 序号输入无效/为空，保持/设为: ${linksData[linkIndex].sortOrder}`);
                }
                console.log(`链接 "${newText}" 更新。分类: ${oldCategory} -> ${selectedCategory}, 序号: ${linksData[linkIndex].sortOrder}`);
                saveLinks();
                renderLinks();
            } else {
                console.error("保存失败：找不到链接 ID", id);
                alert("保存失败！");
            }
        } else if (categoryNameToAdd) {
            const newLink = {
                id: generateUniqueId(),
                text: newText,
                url: newUrl,
                category: categoryNameToAdd,
                sortOrder: Date.now()
            };
            linksData.push(newLink);
            saveLinks();
            renderLinks();
        }
        closeEditModal();
    });
    cancelButton.addEventListener('click', closeEditModal);
    deleteButton.addEventListener('click', () => {

        if (!currentEditingLinkId) return;
        const linkToDelete = linksData.find(l => l.id === currentEditingLinkId);
        if (linkToDelete && confirm(`确定删除链接 "${linkToDelete.text}"?`)) {
            linksData = linksData.filter(link => link.id !== currentEditingLinkId);
            saveLinks();
            renderLinks();
            closeEditModal();
            console.log(`链接 "${linkToDelete.text}" 已删除`);
        }
    });

    function openCategoryEditModal(categoryName) {

        console.log(`>>> 打开分类模态框，分类名: ${categoryName}`);
        if (!categoryName) {
            console.error("缺少分类名");
            return;
        }
        if (!categoryModal || !categoryOriginalNameInput || !categoryNewNameInput || !editCategoryOrderInput) {
            console.error("分类模态框元素未找到");
            return;
        }
        currentEditingCategoryName = categoryName;
        categoryOriginalNameInput.value = categoryName;
        categoryNewNameInput.value = categoryName;
        editCategoryOrderInput.value = categorySortData[categoryName] ?? '';
        categoryModal.style.display = 'flex';
    }

    function closeCategoryEditModal() {
        if (categoryModal) categoryModal.style.display = 'none';
        currentEditingCategoryName = null;
    }
    saveCategoryButton.addEventListener('click', () => {

        const oldName = categoryOriginalNameInput.value;
        const newName = categoryNewNameInput.value.trim();
        const newOrderRaw = editCategoryOrderInput.value;
        const newOrder = parseInt(newOrderRaw, 10);
        if (!newName) {
            alert("分类名不能为空");
            return;
        }
        let finalOrder = categorySortData[oldName] ?? (categoryDisplayOrder.length + 1) * 10;
        if (!isNaN(newOrder)) {
            finalOrder = newOrder;
        } else if (newOrderRaw !== '') {
            console.warn(`分类 "${newName}" 序号无效`);
        }
        categorySortData[newName] = finalOrder;
        if (newName !== oldName) {
            delete categorySortData[oldName];
        }
        saveCategorySortOrders();
        if (newName !== oldName) {
            const exists = categoryDisplayOrder.some(n => n === newName && n !== oldName);
            if (exists) {
                alert(`分类 "${newName}" 已存在`);
                return;
            }
            linksData.forEach(l => {
                if (l.category === oldName) l.category = newName;
            });
            saveLinks();
            const idx = categoryDisplayOrder.indexOf(oldName);
            if (idx > -1) {
                categoryDisplayOrder[idx] = newName;
            } else if (!categoryDisplayOrder.includes(newName)) {
                categoryDisplayOrder.push(newName);
            }
        }
        sortCategories();
        saveCategoryOrder();
        renderLinks();
        closeCategoryEditModal();
    });
    cancelCategoryButton.addEventListener('click', closeCategoryEditModal);
    deleteCategoryButton.addEventListener('click', () => {

        if (!currentEditingCategoryName) return;
        if (confirm(`确定删除分类 "${currentEditingCategoryName}" 及链接?`)) {
            linksData = linksData.filter(l => l.category !== currentEditingCategoryName);
            saveLinks();
            const idx = categoryDisplayOrder.indexOf(currentEditingCategoryName);
            if (idx > -1) {
                categoryDisplayOrder.splice(idx, 1);
                saveCategoryOrder();
            }
            delete categorySortData[currentEditingCategoryName];
            saveCategorySortOrders();
            console.log(`分类 "${currentEditingCategoryName}" 已移除`);
            renderLinks();
            closeCategoryEditModal();
        }
    });
    addCategoryButton.addEventListener('click', () => {

        const input = prompt("输入新分类名称，可用 / 分隔序号 (可选):\n例如: 生活 / 15")?.trim();
        if (!input) return;
        let newCategoryName = input;
        let newSortOrder = null;
        if (input.includes('/')) {
            const parts = input.split('/');
            newCategoryName = parts[0].trim();
            const orderPart = parseInt(parts[1]?.trim(), 10);
            if (!isNaN(orderPart)) {
                newSortOrder = orderPart;
            } else {
                alert("序号部分无效，将使用默认序号。");
            }
        }
        if (!newCategoryName) {
            alert("分类名称不能为空！");
            return;
        }
        const exists = categoryDisplayOrder.includes(newCategoryName);
        if (exists) {
            alert(`分类 "${newCategoryName}" 已存在！`);
            return;
        }
        categoryDisplayOrder.push(newCategoryName);
        categorySortData[newCategoryName] = (newSortOrder !== null) ? newSortOrder : (categoryDisplayOrder.length) * 10;
        saveCategoryOrder();
        saveCategorySortOrders();
        console.log(`新分类 "${newCategoryName}" 已添加，序号: ${categorySortData[newCategoryName]}`);
        sortCategories();
        saveCategoryOrder();
        renderLinks();
        alert(`分类 "${newCategoryName}" 已添加！`);
    });

    function renderLinks() {
        sortCategories();
        console.log("Render: 使用排序后分类顺序:", JSON.stringify(categoryDisplayOrder));
        linksContainer.innerHTML = '';
        categoryDisplayOrder.forEach(categoryName => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';
            categoryDiv.dataset.categoryName = categoryName;
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            const title = document.createElement('h2');
            title.textContent = categoryName;
            title.dataset.categoryName = categoryName;
            addLongPressListener(title, 'category');
            categoryHeader.appendChild(title);
            categoryDiv.appendChild(categoryHeader);
            const gridDiv = document.createElement('div');
            gridDiv.className = 'link-grid';
            gridDiv.dataset.categoryName = categoryName;
            let linksInCategory = linksData.filter(link => link && link.category === categoryName);
            linksInCategory.sort((a, b) => {
                const orderA = a.sortOrder ?? Infinity;
                const orderB = b.sortOrder ?? Infinity;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return (a.text ?? '').localeCompare(b.text ?? '');
            });
            const isCollapsible = linksInCategory.length > MAX_VISIBLE_LINKS;
            linksInCategory.forEach((link, index) => {
                const linkElement = createLinkElement(link);
                if (linkElement) {
                    if (isCollapsible && index >= MAX_VISIBLE_LINKS) {
                        linkElement.classList.add('link-hidden');
                    }
                    gridDiv.appendChild(linkElement);
                }
            });
            categoryDiv.appendChild(gridDiv);
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'category-actions';
            let addedExpandButton = false;
            if (isCollapsible) {
                const toggleLinksBtn = document.createElement('button');
                toggleLinksBtn.className = 'toggle-links-button control-button small-button';
                const hiddenCount = linksInCategory.length - MAX_VISIBLE_LINKS;
                toggleLinksBtn.textContent = `展开（${hiddenCount}）`;
                toggleLinksBtn.dataset.action = 'expand';
                toggleLinksBtn.dataset.targetCategory = categoryName;
                actionsContainer.appendChild(toggleLinksBtn);
                addedExpandButton = true;
            }
            const addLinkBtn = document.createElement('button');
            addLinkBtn.className = 'add-link-button control-button small-button';
            addLinkBtn.textContent = '添加链接';
            addLinkBtn.title = `添加到分类 "${categoryName}"`;
            addLinkBtn.dataset.categoryName = categoryName;
            addLinkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                openEditModal(null, categoryName);
            });
            actionsContainer.appendChild(addLinkBtn);
            if (actionsContainer.hasChildNodes()) {
                categoryDiv.appendChild(actionsContainer);
            }
            linksContainer.appendChild(categoryDiv);
        });
        console.log("Render: 渲染完成。");
    }

    function loadBackground() {

        const s = localStorage.getItem(backgroundImageStorageKey);
        if (s) {
            document.body.style.backgroundImage = `url(${s})`;
        } else {
            document.body.style.backgroundImage = '';
        }
    }
    bgUploadInput.addEventListener('change', (event) => {

        const f = event.target.files[0];
        if (!f) return;
        if (f.type.startsWith('image/')) {
            const r = new FileReader();
            r.onload = (e) => {
                const d = e.target.result;
                try {
                    localStorage.setItem(backgroundImageStorageKey, d);
                    document.body.style.backgroundImage = `url(${d})`;
                } catch (err) {
                    console.error("存背景图失败:", err);
                    alert(`保存背景失败！图太大?\n(${err.message})`);
                }
            };
            r.onerror = (e) => {
                alert("读图出错");
                console.error(e);
            };
            r.readAsDataURL(f);
        } else {
            alert("请选图片");
        }
        event.target.value = null;
    });
    clearBgButton.addEventListener('click', () => {

        if (confirm("确定清除背景?")) {
            localStorage.removeItem(backgroundImageStorageKey);
            loadBackground();
            alert("背景已清除");
        }
    });
    exportButton.addEventListener('click', () => {
        const layout = localStorage.getItem(layoutStorageKey) || 'grid';
        const data = {
            version: 4,
            layout: layout,
            order: categoryDisplayOrder,
            sortOrders: categorySortData,
            links: linksData
        };
        if (!data.links || data.links.length === 0) {
            alert("无数据导出");
            return;
        }
        try {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            function padZero(num) {
                return num < 10 ? '0' + num : String(num);
            }
            const filename = `${year}-${padZero(month)}-${padZero(day)}_${padZero(hours)}-${padZero(minutes)}-${padZero(seconds)}.json`;
            console.log(filename);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert("数据 (v4) 已导出");
        } catch (e) {
            console.error("导出失败:", e);
            alert("导出失败！");
        }
    });
    importInput.addEventListener('change', (event) => {

        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            let ok = false;
            try {
                const imp = JSON.parse(e.target.result);
                let lnk = null,
                    ord = null,
                    lay = null,
                    srt = null;
                if (typeof imp === 'object' && imp !== null) {
                    if (Array.isArray(imp.links) && Array.isArray(imp.order)) {
                        lnk = imp.links;
                        ord = imp.order;
                        lay = (imp.layout === 'list' || imp.layout === 'grid') ? imp.layout : null;
                        if (imp.version === 4 && typeof imp.sortOrders === 'object' && imp.sortOrders !== null) {
                            srt = imp.sortOrders;
                            console.log("导入V4");
                        } else {
                            console.warn("导入V2/V3(无分类序号),生成默认");
                            srt = {};
                            ord.forEach((c, i) => {
                                srt[c] = (i + 1) * 10;
                            });
                        }
                    }
                } else if (Array.isArray(imp)) {
                    console.warn("导入V1(仅链接),生成顺序和序号");
                    lnk = imp;
                    const cs = new Set();
                    lnk.forEach(l => cs.add(l?.category || '未分类'));
                    ord = Array.from(cs);
                    srt = {};
                    ord.forEach((c, i) => {
                        srt[c] = (i + 1) * 10;
                    });
                    lay = null;
                } else {
                    throw new Error("无法识别格式");
                }
                if (lnk !== null && ord !== null && srt !== null) {
                    const lm = lay || '保持当前';
                    if (confirm(`导入 ${lnk.length} 链接, ${ord.length} 分类顺序, ${Object.keys(srt).length} 分类序号。\n(布局: ${lm})。\n覆盖当前?`)) {
                        linksData = lnk;
                        categoryDisplayOrder = ord;
                        categorySortData = srt;
                        if (lay) {
                            localStorage.setItem(layoutStorageKey, lay);
                        }
                        const nb = Date.now();
                        linksData.forEach((l, i) => {
                            if (!l.id) l.id = generateUniqueId();
                            if (typeof l.category !== 'string') l.category = '未分类';
                            if (typeof l.sortOrder !== 'number') l.sortOrder = nb + i;
                            if (!categoryDisplayOrder.includes(l.category)) {
                                categoryDisplayOrder.push(l.category);
                                categorySortData[l.category] = (categoryDisplayOrder.length) * 10;
                            }
                        });
                        categoryDisplayOrder = categoryDisplayOrder.filter(c => typeof c === 'string');
                        const fs = {};
                        let oc = false;
                        categoryDisplayOrder.forEach((c, i) => {
                            if (typeof categorySortData[c] !== 'number') {
                                fs[c] = (i + 1) * 10;
                                oc = true;
                                console.warn(`分类 "${c}" 缺序号，生成默认`);
                            } else {
                                fs[c] = categorySortData[c];
                            }
                        });
                        categorySortData = fs;
                        saveLinks();
                        saveCategoryOrder();
                        saveCategorySortOrders();
                        applyLayoutPreference();
                        renderLinks();
                        alert("导入成功！");
                        ok = true;
                    } else {
                        console.log("用户取消导入");
                    }
                } else {
                    throw new Error("未能提取数据");
                }
            } catch (err) {
                console.error("导入失败:", err);
                alert(`导入失败：\n${err.message}`);
            } finally {
                event.target.value = null;
            }
        };
        reader.onerror = (err) => {
            alert("读取文件出错");
            console.error("FileReader error:", err);
            event.target.value = null;
        };
        reader.readAsText(file);
    });
    importButton.addEventListener('click', () => {
        importInput.click(); // 点击“导入”按钮时，触发隐藏的文件输入框
    });

    function processUrlHashData() {

        if (window.location.hash && window.location.hash.startsWith('#addlink=')) {
            console.log("检测到哈希数据:", window.location.hash);
            const encodedData = window.location.hash.substring('#addlink='.length);
            if (encodedData) {
                try {
                    const jsonData = decodeURIComponent(encodedData);
                    const newLinkData = JSON.parse(jsonData);
                    if (newLinkData && newLinkData.url && newLinkData.text && newLinkData.category) {
                        const alreadyExists = linksData.some(link => link.url === newLinkData.url);
                        if (!alreadyExists) {
                            newLinkData.id = generateUniqueId();
                            newLinkData.sortOrder = Date.now();
                            linksData.push(newLinkData);
                            saveLinks();
                            if (!categoryDisplayOrder.includes(newLinkData.category)) {
                                categoryDisplayOrder.push(newLinkData.category);
                                categorySortData[newLinkData.category] = (categoryDisplayOrder.length) * 10;
                                saveCategoryOrder();
                                saveCategorySortOrders();
                                console.warn(`分类 "${newLinkData.category}" 已添加`);
                            }
                            history.replaceState(null, "", window.location.pathname + window.location.search);
                            renderLinks();
                        } else {
                            console.warn("链接已存在:", newLinkData.url);
                            history.replaceState(null, "", window.location.pathname + window.location.search);
                        }
                    } else {
                        console.error("哈希数据格式无效");
                        history.replaceState(null, "", window.location.pathname + window.location.search);
                    }
                } catch (error) {
                    console.error("处理哈希出错:", error);
                    history.replaceState(null, "", window.location.pathname + window.location.search);
                }
            } else {
                history.replaceState(null, "", window.location.pathname + window.location.search);
            }
        }
    }

    applyLayoutPreference();
    applyDnDModePreference();
    populateSearchEngines();
    loadBackground();
    loadLinks();
    loadCategoryOrder();
    loadCategorySortOrders();
    renderLinks();
    processUrlHashData();

    searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        performSearch();
    });
    toggleLayoutButton.addEventListener('click', () => {
        const isList = document.body.classList.toggle('layout-list');
        const newLayout = isList ? 'list' : 'grid';
        localStorage.setItem(layoutStorageKey, newLayout);
        console.log("布局切换为:", newLayout);
    });

    linksContainer.addEventListener('click', function(event) {

        const target = event.target;
        if (!target.classList.contains('toggle-links-button')) return;
        const categoryDiv = target.closest('.category');
        if (!categoryDiv) return;
        const gridDiv = categoryDiv.querySelector('.link-grid');
        if (!gridDiv) return;
        const action = target.dataset.action;
        const allLinks = Array.from(gridDiv.querySelectorAll('.link-item:not(.add-link-button)'));
        if (action === 'expand') {
            allLinks.forEach(link => link.classList.remove('link-hidden'));
            target.textContent = '收起';
            target.dataset.action = 'collapse';
        } else if (action === 'collapse') {
            let vc = 0;
            allLinks.forEach((link, index) => {
                if (index >= MAX_VISIBLE_LINKS) {
                    link.classList.add('link-hidden');
                } else {
                    link.classList.remove('link-hidden');
                    vc++;
                }
            });
            const hc = allLinks.length - vc;
            target.textContent = `展开（${hc}）`;
            target.dataset.action = 'expand';
        }
    });

    [modal, categoryModal].forEach(m => {
        if (m) m.addEventListener('click', (event) => {
            if (event.target === m) {
                closeEditModal();
                closeCategoryEditModal();
            }
        });
    });
});