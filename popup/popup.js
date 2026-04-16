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

    const result = await chrome.storage.local.get([
        'enabled', 'activeCountry', 'allCountries', 'visibleCountryCodes', 'pinnedCountryCodes'
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
            item.innerHTML = `<span class="dd-name">${c.name} (${c.code})${pinBadge}</span>`;

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

            detailIp.textContent = info.ip;
            detailTimezone.textContent = info.timezone;
        } else {
            statusCard.classList.remove('active');
            statusText.textContent = '模拟器已关闭';

            detailIp.textContent = '--';
            detailTimezone.textContent = '--';
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
