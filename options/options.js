document.addEventListener('DOMContentLoaded', async () => {
    const nodesList = document.getElementById('nodes-list');
    const searchInput = document.getElementById('search-nodes');
    const importArea = document.getElementById('import-area');
    const importBtn = document.getElementById('import-btn');
    const resetBtn = document.getElementById('reset-btn');
    const importMsg = document.getElementById('import-msg');

    const openAddModalBtn = document.getElementById('open-add-modal-btn');
    const openImportModalBtn = document.getElementById('open-import-modal-btn');
    const closeImportModalBtn = document.getElementById('close-import-modal-btn');
    const importModal = document.getElementById('import-modal');
    const exportBtn = document.getElementById('export-btn');

    const toggleBatchModeBtn = document.getElementById('toggle-batch-mode-btn');
    const executeBatchDeleteBtn = document.getElementById('execute-batch-delete-btn');
    const selectAllWrapper = document.getElementById('select-all-wrapper');
    const selectAllCb = document.getElementById('select-all-cb');

    // Modal 
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('edit-modal-title');
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
    let isBatchMode = false;

    function showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = '';
        if (type === 'success') icon = '✅ ';
        else if (type === 'error') icon = '❌ ';
        else if (type === 'warning') icon = '⚠️ ';

        toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        // trigger reflow
        void toast.offsetWidth;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // --- Populate timezone datalist ---
    (function populateTimezones() {
        const dl = document.getElementById('timezone-list');
        if (!dl) return;
        let tzList = [];
        try {
            tzList = Intl.supportedValuesOf('timeZone');
        } catch (e) {
            // Fallback common list
            tzList = [
                'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', 'Africa/Cairo',
                'Africa/Casablanca', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi', 'America/Anchorage',
                'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Caracas', 'America/Chicago',
                'America/Denver', 'America/Guayaquil', 'America/Jamaica', 'America/Lima', 'America/Los_Angeles',
                'America/Mexico_City', 'America/Montreal', 'America/New_York', 'America/Phoenix', 'America/Sao_Paulo',
                'America/Santiago', 'America/Toronto', 'Asia/Almaty', 'Asia/Baghdad', 'Asia/Baku', 'Asia/Bangkok',
                'Asia/Beirut', 'Asia/Bishkek', 'Asia/Colombo', 'Asia/Damascus', 'Asia/Dhaka', 'Asia/Dubai',
                'Asia/Hong_Kong', 'Asia/Jakarta', 'Asia/Jerusalem', 'Asia/Kabul', 'Asia/Karachi', 'Asia/Kathmandu',
                'Asia/Kolkata', 'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Muscat', 'Asia/Nicosia', 'Asia/Phnom_Penh',
                'Asia/Qatar', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Taipei',
                'Asia/Tashkent', 'Asia/Tehran', 'Asia/Tokyo', 'Asia/Yerevan', 'Atlantic/Reykjavik', 'Australia/Sydney',
                'Europe/Amsterdam', 'Europe/Athens', 'Europe/Belgrade', 'Europe/Berlin', 'Europe/Brussels',
                'Europe/Bucharest', 'Europe/Budapest', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Helsinki',
                'Europe/Istanbul', 'Europe/Kyiv', 'Europe/Lisbon', 'Europe/Ljubljana', 'Europe/London',
                'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Minsk', 'Europe/Monaco', 'Europe/Moscow',
                'Europe/Oslo', 'Europe/Paris', 'Europe/Prague', 'Europe/Riga', 'Europe/Rome', 'Europe/Sarajevo',
                'Europe/Skopje', 'Europe/Sofia', 'Europe/Stockholm', 'Europe/Tallinn', 'Europe/Tirane',
                'Europe/Vilnius', 'Europe/Warsaw', 'Europe/Vienna', 'Europe/Zagreb', 'Europe/Zurich',
                'Indian/Maldives', 'Indian/Mauritius', 'Pacific/Auckland', 'Pacific/Guam', 'Pacific/Honolulu', 'UTC'
            ];
        }
        tzList.forEach(tz => {
            const opt = document.createElement('option');
            opt.value = tz;
            dl.appendChild(opt);
        });
    })();

    async function loadData() {
        const res = await chrome.storage.local.get(['allCountries', 'visibleCountryCodes', 'pinnedCountryCodes']);
        allCountries = res.allCountries || [];
        allCountries.forEach(c => {
            if (!c.id) c.id = c.code;
            if (!c.name) c.name = c.code + (c.region ? '-' + c.region : '');
            if (typeof c.ip === 'string') {
                c.ip = c.ip.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (!c.ip) c.ip = [];
        });

        visibleIds = res.visibleCountryCodes || [];
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
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                (c.ip && c.ip.some(i => i.includes(q))) ||
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

            const pinSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V7a4 4 0 0 0-8 0v3.76z"/></svg>`;
            const editSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
            const delSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

            div.innerHTML = `
        <div class="node-info-wrapper">
          <input type="checkbox" class="custom-checkbox batch-delete-cb danger-cb" data-batch-id="${country.id}">
          <div class="node-info">
            <span class="node-title">
              ${country.name} <span style="color:var(--text-muted); font-weight:500;">(${country.code})</span>
              ${isPinned ? `<span class="pin-icon" title="已置顶">${pinSvg}</span>` : ''}
            </span>
            <span class="node-details">IP: ${country.ip.join(', ')} <span style="color:#d1d5db; margin:0 6px;">|</span> TZ: ${country.timezone}</span>
          </div>
        </div>
        <div class="node-actions">
          <button class="icon-btn ${isPinned ? 'active-pin' : ''}" title="置顶首屏" data-action="pin" data-id="${country.id}">
             ${pinSvg}
          </button>
          <button class="icon-btn" title="编辑信息" data-action="edit" data-id="${country.id}">
             ${editSvg}
          </button>
          <button class="icon-btn danger-hover" title="彻底删除" data-action="delete" data-id="${country.id}">
             ${delSvg}
          </button>
          <div style="width: 1px; height: 24px; background: var(--border-color); margin: 0 4px;"></div>
          <input type="checkbox" class="custom-checkbox" title="开启在弹窗的显示" data-id="${country.id}" ${isVisible ? 'checked' : ''}>
        </div>
      `;

            // Checkbox for display
            div.querySelector('input[data-id]').addEventListener('change', async (e) => {
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

    // Batch Delete Handlers
    toggleBatchModeBtn.addEventListener('click', () => {
        isBatchMode = !isBatchMode;
        nodesList.classList.toggle('batch-mode', isBatchMode);
        if (isBatchMode) {
            toggleBatchModeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> 退出管理`;
            executeBatchDeleteBtn.style.display = 'inline-flex';
            selectAllWrapper.style.display = 'inline-flex';
            selectAllCb.checked = false;
        } else {
            toggleBatchModeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> 批量管理`;
            executeBatchDeleteBtn.style.display = 'none';
            selectAllWrapper.style.display = 'none';
        }
    });

    selectAllCb.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.querySelectorAll('.batch-delete-cb').forEach(cb => {
            cb.checked = isChecked;
        });
    });

    executeBatchDeleteBtn.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('.batch-delete-cb:checked');
        if (checkboxes.length === 0) {
            showMessage('请先勾选需要删除的节点！', 'error');
            return;
        }

        if (await showConfirm('批量删除', `确定要删除选中的 ${checkboxes.length} 个节点吗？`)) {
            const idsToDelete = Array.from(checkboxes).map(cb => cb.getAttribute('data-batch-id'));

            allCountries = allCountries.filter(c => !idsToDelete.includes(c.id));
            visibleIds = visibleIds.filter(id => !idsToDelete.includes(id));
            pinnedIds = pinnedIds.filter(id => !idsToDelete.includes(id));

            await saveAllToStorage();

            // Exit batch mode
            isBatchMode = false;
            nodesList.classList.remove('batch-mode');
            toggleBatchModeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> 批量管理`;
            executeBatchDeleteBtn.style.display = 'none';
            selectAllWrapper.style.display = 'none';

            showMessage(`成功删除了 ${idsToDelete.length} 个节点`, 'success');
            renderList();
        }
    });

    async function saveAllToStorage() {
        await chrome.storage.local.set({
            allCountries,
            visibleCountryCodes: visibleIds,
            pinnedCountryCodes: pinnedIds
        });
    }

    // --- Import Modal Handlers ---
    openImportModalBtn.addEventListener('click', () => {
        importArea.value = '';
        importMsg.textContent = '';
        importModal.classList.add('open');
    });

    closeImportModalBtn.addEventListener('click', () => {
        importModal.classList.remove('open');
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

                if (typeof newItem.ip === 'string') {
                    newItem.ip = newItem.ip.split(',').map(s => s.trim()).filter(Boolean);
                }

                if (!newItem.name || COUNTRIES.some(c => c.name === newItem.name)) {
                    const defaultCountry = COUNTRIES.find(c => c.code === newItem.code);
                    const baseName = defaultCountry ? defaultCountry.name : newItem.code;
                    newItem.name = baseName + (newItem.region ? '-' + newItem.region : '');
                }

                if (!newItem.timezone && window.inferTimezone) {
                    newItem.timezone = window.inferTimezone(newItem.code, newItem.region) || 'UTC';
                }

                if (!newItem.timezone) return;

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

            showToast(`成功导入/更新了 ${added} 个节点！`, 'success');
            renderList();
            setTimeout(() => {
                importModal.classList.remove('open');
            }, 1000);
        } catch (err) {
            showToast(`导入失败: ${err.message}`, 'error');
        }
    });

    // --- Export Logic ---
    exportBtn.addEventListener('click', () => {
        if (allCountries.length === 0) {
            showToast('当前没有可导出的节点数据！', 'warning');
            return;
        }
        // Export just the array of nodes (stripping properties that might be too internal if we want, but doing raw is fine)
        const jsonStr = JSON.stringify(allCountries, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `location_simulator_config_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- Edit/Add Modal Handlers ---
    openAddModalBtn.addEventListener('click', () => {
        openModal(null);
    });

    function openModal(country) {
        if (country) {
            modalTitle.textContent = '编辑节点信息';
            currentEditId = country.id;
            editCode.value = country.code;
            editCode.disabled = true; // Disabled when editing
            editName.value = country.name;
            editRegion.value = country.region || '';
            editIp.value = (country.ip && Array.isArray(country.ip)) ? country.ip.join(', ') : (country.ip || '');
            editTimezone.value = country.timezone;
            editUa.value = country.userAgent || '';
        } else {
            modalTitle.textContent = '新增国家节点';
            currentEditId = null;
            editCode.value = '';
            editCode.disabled = false; // Enabled when adding
            editName.value = '';
            editRegion.value = '';
            editIp.value = '';
            editTimezone.value = '';
            editUa.value = '';
        }
        modal.classList.add('open');
    }

    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('open');
        currentEditId = null;
    });

    saveEditBtn.addEventListener('click', async () => {
        let code = editCode.value.trim().toUpperCase();
        let ipArray = editIp.value.split(',').map(s => s.trim()).filter(Boolean);

        if (!code) {
            showToast("国家代码不能为空！", 'warning');
            return;
        }

        let name = editName.value.trim();
        let region = editRegion.value.trim() || undefined;

        if (!name) {
            const defaultCountry = COUNTRIES.find(c => c.code === code);
            const baseName = defaultCountry ? defaultCountry.name : code;
            name = baseName + (region ? '-' + region : '');
        }

        let finalTz = editTimezone.value.trim() || undefined;
        // Auto-infer timezone only when adding new node, not when user explicitly clears it during edit
        if (!finalTz && !currentEditId && window.inferTimezone) {
            finalTz = window.inferTimezone(code, region) || undefined;
        }

        let userAgent = editUa.value.trim() || undefined;

        if (currentEditId) {
            // Edit existing
            const idx = allCountries.findIndex(c => c.id === currentEditId);
            if (idx !== -1) {
                allCountries[idx].name = name;
                allCountries[idx].region = region;
                allCountries[idx].ip = ipArray;
                allCountries[idx].timezone = finalTz;
                if (userAgent) allCountries[idx].userAgent = userAgent;
                else delete allCountries[idx].userAgent;

                await saveAllToStorage();
                renderList();
                modal.classList.remove('open');
                showToast(`成功更新节点`, 'success');
            }
        } else {
            // Add new
            let newId = code + '_' + (region || '').replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
            const newNode = {
                id: newId,
                code: code,
                name: name,
                region: region,
                ip: ipArray,
                timezone: finalTz,
                userAgent: userAgent
            };
            allCountries.unshift(newNode);
            if (!visibleIds.includes(newId)) visibleIds.push(newId);

            await saveAllToStorage();
            renderList();
            modal.classList.remove('open');
            showToast(`成功添加新节点: ${name}`, 'success');
        }
    });

    resetBtn.addEventListener('click', async () => {
        if (await showConfirm('清空列表', '确定要清空所有数据吗？这会清除所有的节点！')) {
            allCountries = [];
            visibleIds = [];
            pinnedIds = [];
            await saveAllToStorage();
            await chrome.storage.local.set({ activeCountry: '' });
            renderList();
        }
    });

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
