// popup.js
document.addEventListener('DOMContentLoaded', async () => {
    const togglePower = document.getElementById('toggle-power');
    const statusCard = document.getElementById('status-card');
    const statusText = document.getElementById('status-text');
    const detailIp = document.getElementById('detail-ip');
    const detailTimezone = document.getElementById('detail-timezone');
    const settingsBtn = document.getElementById('settings-btn');

    const customDropdown = document.getElementById('custom-dropdown');
    const dropdownHeader = document.getElementById('dropdown-header');
    const dropdownPanel = document.getElementById('dropdown-panel');
    const selectedCountryText = document.getElementById('selected-country-text');
    const popupSearch = document.getElementById('popup-search');
    const dropdownList = document.getElementById('dropdown-list');
    const dropdownArrow = document.getElementById('dropdown-arrow');

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // State
    let isPanelOpen = false;
    let activeCountryId = '';
    let allCountries = [];
    let displayableCountries = [];
    let pinnedIds = [];
    let searchQuery = '';

    let activeIp = '';

    const result = await chrome.storage.local.get([
        'enabled', 'activeCountry', 'activeIp', 'allCountries', 'visibleCountryCodes', 'pinnedCountryCodes'
    ]);

    allCountries = result.allCountries || COUNTRIES;
    // Fallback map ids if purely legacy
    allCountries.forEach(c => { if (!c.id) c.id = c.code; });

    const visibleIds = result.visibleCountryCodes || COUNTRIES.map(c => c.id);
    pinnedIds = result.pinnedCountryCodes || [];

    displayableCountries = allCountries.filter(c => visibleIds.includes(c.id));

    if (result.enabled) {
        togglePower.checked = true;
    }

    activeIp = result.activeIp || '';
    activeCountryId = result.activeCountry;
    if (!visibleIds.includes(activeCountryId) && visibleIds.length > 0) {
        activeCountryId = visibleIds[0];
        await chrome.storage.local.set({ activeCountry: activeCountryId });
    }

    function renderDropdown() {
        dropdownList.innerHTML = '';

        let filtered = [...displayableCountries];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q) ||
                (c.region && c.region.toLowerCase().includes(q)) ||
                c.ip.includes(q)
            );
        }

        filtered.sort((a, b) => {
            const aPin = pinnedIds.includes(a.id) ? 1 : 0;
            const bPin = pinnedIds.includes(b.id) ? 1 : 0;
            return bPin - aPin;
        });

        if (filtered.length === 0) {
            dropdownList.innerHTML = '<div class="dd-empty">没有找到匹配的节点</div>';
            return;
        }

        filtered.forEach(c => {
            const isPinned = pinnedIds.includes(c.id);

            const item = document.createElement('div');
            item.className = `dd-item ${c.id === activeCountryId ? 'selected' : ''}`;

            const pinBadge = isPinned ? ' <span style="font-size:0.75rem" title="已置顶">📌</span>' : '';
            item.innerHTML = `<span class="dd-name">${c.name} <span style="font-size: 0.8em; color: var(--text-muted)">(${c.code})</span>${pinBadge}</span>`;

            item.addEventListener('click', async () => {
                activeCountryId = c.id;
                await chrome.storage.local.set({ activeCountry: activeCountryId });
                updateDetailsVisual(togglePower.checked);
                closeDropdown();
            });

            dropdownList.appendChild(item);
        });
    }

    function updateDetailsVisual(enabled) {
        const info = displayableCountries.find(c => c.id === activeCountryId);
        if (!info) {
            selectedCountryText.textContent = "请选择节点...";
            return;
        }

        selectedCountryText.textContent = `${info.name} (${info.code})`;

        if (enabled) {
            statusCard.classList.add('active');
            statusText.textContent = `正在模拟：${info.name}`;

            detailTimezone.innerHTML = `<span class="detail-value">${info.timezone}</span>`;

            if (Array.isArray(info.ip) && info.ip.length > 1) {
                if (!info.ip.includes(activeIp)) {
                    activeIp = info.ip[0];
                    chrome.storage.local.set({ activeIp });
                }
                let optionsHtml = info.ip.map(ip => `<option value="${ip}" ${ip === activeIp ? 'selected' : ''}>${ip}</option>`).join('');
                detailIp.innerHTML = `<select id="ip-select" class="ip-selector" style="appearance: none; background: rgba(0, 102, 255, 0.08); border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 22px 4px 8px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.8rem; color: var(--primary); font-weight: 600; cursor: pointer; background-image: url(&quot;data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%230066ff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 6px center; outline: none;">${optionsHtml}</select>`;

                document.getElementById('ip-select').addEventListener('change', async (e) => {
                    activeIp = e.target.value;
                    await chrome.storage.local.set({ activeIp });
                });
            } else {
                let singleIp = Array.isArray(info.ip) ? (info.ip[0] || '--') : (info.ip || '--');
                detailIp.innerHTML = `<span class="detail-value">${singleIp}</span>`;
                if (activeIp !== singleIp) {
                    activeIp = singleIp;
                    chrome.storage.local.set({ activeIp });
                }
            }
        } else {
            statusCard.classList.remove('active');
            statusText.textContent = '模拟器已关闭';

            detailIp.innerHTML = '<span class="detail-value inactive">--</span>';
            detailTimezone.innerHTML = '<span class="detail-value inactive">--</span>';
        }
    }

    dropdownHeader.addEventListener('click', (e) => {
        isPanelOpen = !isPanelOpen;
        if (isPanelOpen) {
            customDropdown.classList.add('open');
            dropdownArrow.classList.add('open');
            searchQuery = '';
            popupSearch.value = '';
            renderDropdown();
            setTimeout(() => popupSearch.focus(), 50);
        } else {
            closeDropdown();
        }
    });

    function closeDropdown() {
        isPanelOpen = false;
        customDropdown.classList.remove('open');
        dropdownArrow.classList.remove('open');
    }

    document.addEventListener('click', (e) => {
        if (!customDropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    popupSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderDropdown();
    });

    togglePower.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        await chrome.storage.local.set({ enabled });
        updateDetailsVisual(enabled);
    });

    renderDropdown();
    updateDetailsVisual(togglePower.checked);
});
