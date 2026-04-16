document.addEventListener('DOMContentLoaded', async () => {
    const nodesList = document.getElementById('nodes-list');
    const searchInput = document.getElementById('search-nodes');
    const importArea = document.getElementById('import-area');
    const importBtn = document.getElementById('import-btn');
    const resetBtn = document.getElementById('reset-btn');
    const importMsg = document.getElementById('import-msg');

    // Modal 
    const modal = document.getElementById('edit-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveEditBtn = document.getElementById('save-edit-btn');
    const editCode = document.getElementById('edit-code');
    const editName = document.getElementById('edit-name');
    const editRegion = document.getElementById('edit-region');
    const editIp = document.getElementById('edit-ip');
    const editTimezone = document.getElementById('edit-timezone');
    const editUa = document.getElementById('edit-ua');

    let allCountries = [];
    let visibleIds = [];
    let pinnedIds = [];
    let searchQuery = '';
    let currentEditId = null;

    async function loadData() {
        const res = await chrome.storage.local.get(['allCountries', 'visibleCountryCodes', 'pinnedCountryCodes']);
        allCountries = res.allCountries || window.COUNTRIES;
        // Normalize IDs for legacy configs
        allCountries.forEach(c => {
            if (!c.id) c.id = c.code;
            if (!c.name) c.name = c.code + (c.region ? '-' + c.region : '');
        });

        visibleIds = res.visibleCountryCodes || window.COUNTRIES.map(c => c.id || c.code);
        pinnedIds = res.pinnedCountryCodes || [];
        renderList();
    }

    function renderList() {
        nodesList.innerHTML = '';

        let displayList = [...allCountries];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            displayList = displayList.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                c.ip.includes(q) ||
                (c.region && c.region.toLowerCase().includes(q))
            );
        }

        displayList.sort((a, b) => {
            const aPin = pinnedIds.includes(a.id) ? 1 : 0;
            const bPin = pinnedIds.includes(b.id) ? 1 : 0;
            return bPin - aPin; // Pinned first
        });

        displayList.forEach(country => {
            const isVisible = visibleIds.includes(country.id);
            const isPinned = pinnedIds.includes(country.id);

            const div = document.createElement('div');
            div.className = `node-item ${isPinned ? 'pinned' : ''}`;

            div.innerHTML = `
        <div class="node-info">
          <span class="node-title">
            ${country.name}
            ${isPinned ? '<span class="pin-badge">📌 置顶</span>' : ''}
          </span>
          <span class="node-details">IP: ${country.ip} | TZ: ${country.timezone}</span>
        </div>
        <div class="node-actions">
          <button class="icon-btn ${isPinned ? 'active-pin' : ''}" title="置顶" data-action="pin" data-id="${country.id}">📌</button>
          <button class="icon-btn" title="编辑" data-action="edit" data-id="${country.id}">✏️</button>
          <button class="icon-btn danger-hover" title="删除" data-action="delete" data-id="${country.id}">🗑️</button>
          <input type="checkbox" title="是否启用" data-id="${country.id}" ${isVisible ? 'checked' : ''}>
        </div>
      `;

            // Checkbox
            div.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (e.target.checked) {
                    if (!visibleIds.includes(id)) visibleIds.push(id);
                } else {
                    visibleIds = visibleIds.filter(c => c !== id);
                }
                await chrome.storage.local.set({ visibleCountryCodes: visibleIds });
            });

            // Actions
            div.querySelectorAll('.icon-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const action = btn.getAttribute('data-action');
                    const id = btn.getAttribute('data-id');

                    if (action === 'delete') {
                        if (await showConfirm('确认删除', `确定删除该节点吗？`)) {
                            allCountries = allCountries.filter(c => c.id !== id);
                            visibleIds = visibleIds.filter(c => c !== id);
                            pinnedIds = pinnedIds.filter(c => c !== id);
                            await saveAllToStorage();
                            renderList();
                        }
                    } else if (action === 'pin') {
                        if (pinnedIds.includes(id)) {
                            pinnedIds = pinnedIds.filter(c => c !== id);
                        } else {
                            pinnedIds.push(id);
                        }
                        await chrome.storage.local.set({ pinnedCountryCodes: pinnedIds });
                        renderList();
                    } else if (action === 'edit') {
                        const tgt = allCountries.find(c => c.id === id);
                        if (tgt) openModal(tgt);
                    }
                });
            });

            nodesList.appendChild(div);
        });
    }

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderList();
    });

    async function saveAllToStorage() {
        await chrome.storage.local.set({
            allCountries,
            visibleCountryCodes: visibleIds,
            pinnedCountryCodes: pinnedIds
        });
    }

    // Edit logic
    function openModal(country) {
        currentEditId = country.id;
        editCode.value = country.code;
        editName.value = country.name;
        editRegion.value = country.region || '';
        editIp.value = country.ip;
        editTimezone.value = country.timezone;
        editUa.value = country.userAgent || '';
        modal.classList.add('open');
    }

    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        currentEditId = null;
    });

    saveEditBtn.addEventListener('click', async () => {
        const id = currentEditId;
        const idx = allCountries.findIndex(c => c.id === id);
        if (idx !== -1) {
            allCountries[idx].name = editName.value;
            allCountries[idx].region = editRegion.value || undefined;
            allCountries[idx].ip = editIp.value;

            let finalTz = editTimezone.value.trim();
            if (!finalTz && window.inferTimezone) {
                finalTz = window.inferTimezone(editCode.value, allCountries[idx].region);
            }
            allCountries[idx].timezone = finalTz || 'UTC';

            if (editUa.value) allCountries[idx].userAgent = editUa.value;

            await saveAllToStorage();
            renderList();
            modal.classList.remove('open');
            showMessage(`成功更新节点`, 'success');
        }
    });

    importBtn.addEventListener('click', async () => {
        try {
            const val = importArea.value.trim();
            if (!val) throw new Error("内容不能为空");

            const parsed = JSON.parse(val);
            if (!Array.isArray(parsed)) throw new Error("必须是一个 JSON 数组格式");

            let added = 0;
            parsed.forEach(newItem => {
                if (!newItem.code || !newItem.ip) return;

                if (!newItem.name) {
                    newItem.name = newItem.code + (newItem.region ? '-' + newItem.region : '');
                }

                if (!newItem.timezone && window.inferTimezone) {
                    newItem.timezone = window.inferTimezone(newItem.code, newItem.region) || 'UTC';
                }

                if (!newItem.timezone) return;

                // Ensure unique ID for imported nodes
                if (!newItem.id) {
                    newItem.id = newItem.code + '_' + (newItem.region || '').replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
                }

                const existingIdx = allCountries.findIndex(c => c.id === newItem.id);
                if (existingIdx !== -1) {
                    allCountries[existingIdx] = { ...allCountries[existingIdx], ...newItem };
                } else {
                    allCountries.push(newItem);
                }

                if (!visibleIds.includes(newItem.id)) visibleIds.push(newItem.id);
                added++;
            });

            if (added === 0) throw new Error("没有找到有效的节点数据(需包含code, ip, (timezone或支持推导的region))");

            await saveAllToStorage();
            showMessage(`成功导入/更新了 ${added} 个节点！`, 'success');
            importArea.value = '';
            renderList();
        } catch (err) {
            showMessage(`导入失败: ${err.message}`, 'error');
        }
    });

    resetBtn.addEventListener('click', async () => {
        if (await showConfirm('恢复默认', '确定要恢复默认配置吗？这会清除所有自定义导入的节点！')) {
            allCountries = window.COUNTRIES;
            visibleIds = allCountries.map(c => c.id);
            pinnedIds = [];
            await saveAllToStorage();
            await chrome.storage.local.set({ activeCountry: 'US' });

            showMessage('已重置为默认节点！', 'success');
            renderList();
        }
    });

    function showMessage(msg, type) {
        importMsg.textContent = msg;
        importMsg.className = `msg ${type}`;
        setTimeout(() => {
            importMsg.textContent = '';
            importMsg.className = 'msg';
        }, 4000);
    }

    // Custom Confirm Dialog
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMsg = document.getElementById('confirm-msg');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');

    function showConfirm(title, msg) {
        return new Promise(resolve => {
            confirmTitle.textContent = title;
            confirmMsg.textContent = msg;
            confirmModal.classList.add('open');

            const cleanup = () => {
                confirmYesBtn.removeEventListener('click', onYes);
                confirmNoBtn.removeEventListener('click', onNo);
                confirmModal.classList.remove('open');
            };

            const onYes = () => { cleanup(); resolve(true); };
            const onNo = () => { cleanup(); resolve(false); };

            confirmYesBtn.addEventListener('click', onYes);
            confirmNoBtn.addEventListener('click', onNo);
        });
    }

    loadData();
});
