importScripts('shared/countries.js');

const RULE_ID = 1;

async function updateRules() {
    const { enabled, activeCountry, activeIp, allCountries } = await chrome.storage.local.get(['enabled', 'activeCountry', 'activeIp', 'allCountries']);

    if (!enabled || !activeCountry) {
        // Remove all rules if disabled or no country selected
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID]
        });
        return;
    }

    const countriesData = allCountries || [];
    const country = countriesData.find(c => c.id === activeCountry || c.code === activeCountry);
    if (!country) return;

    let targetIp = '';
    if (Array.isArray(country.ip)) {
        targetIp = (activeIp && country.ip.includes(activeIp)) ? activeIp : (country.ip[0] || '');
    } else {
        targetIp = country.ip || '';
    }

    const requestHeaders = [];

    // Only inject IP headers when an IP is actually configured
    if (targetIp) {
        requestHeaders.push(
            { header: "X-Forwarded-For", operation: "set", value: targetIp },
            { header: "X-Real-IP", operation: "set", value: targetIp },
            { header: "Client-IP", operation: "set", value: targetIp },
            { header: "X-Client-IP", operation: "set", value: targetIp },
            { header: "True-Client-IP", operation: "set", value: targetIp },
            { header: "WL-Proxy-Client-IP", operation: "set", value: targetIp }
        );
    }

    if (country.timezone) {
        requestHeaders.push({ header: "Timezone", operation: "set", value: country.timezone });
    }
    requestHeaders.push({ header: "CF-IPCountry", operation: "set", value: country.code });

    if (country.userAgent) {
        requestHeaders.push({ header: "User-Agent", operation: "set", value: country.userAgent });
    }

    const newRules = [{
        id: RULE_ID,
        priority: 1,
        action: {
            type: "modifyHeaders",
            requestHeaders: requestHeaders
        },
        condition: {
            urlFilter: "*",
            resourceTypes: [
                "main_frame", "sub_frame", "xmlhttprequest", "script",
                "image", "stylesheet", "ping", "websocket", "other"
            ]
        }
    }];

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [RULE_ID],
        addRules: newRules
    });

    // Save active timezone so content script can query it; clear if empty to avoid stale injection
    if (country.timezone) {
        await chrome.storage.local.set({ _activeTimezone: country.timezone });
    } else {
        await chrome.storage.local.remove('_activeTimezone');
    }
}

// Listen to storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.enabled || changes.activeCountry || changes.activeIp || changes.allCountries)) {
        updateRules();
    }
});

// Initial setup
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['enabled', 'activeCountry', 'allCountries', 'visibleCountryCodes', 'isInitialized'], async (result) => {
        const defaultSettings = {};
        if (result.enabled === undefined) defaultSettings.enabled = false;
        if (result.activeCountry === undefined) defaultSettings.activeCountry = '';

        if (!result.isInitialized) {
            defaultSettings.isInitialized = true;
            try {
                const response = await fetch(chrome.runtime.getURL('data/default_location_nodes.json'));
                const defaultNodes = await response.json();
                defaultSettings.allCountries = defaultNodes;
                defaultSettings.visibleCountryCodes = defaultNodes.map(n => n.id);
            } catch (e) {
                console.error("Failed to load default nodes", e);
                defaultSettings.allCountries = [];
                defaultSettings.visibleCountryCodes = [];
            }
        }

        if (Object.keys(defaultSettings).length > 0) {
            await chrome.storage.local.set(defaultSettings);
        }
        updateRules();
    });
});
