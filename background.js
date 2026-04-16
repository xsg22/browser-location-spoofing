importScripts('shared/countries.js');

const RULE_ID = 1;

async function updateRules() {
    const { enabled, activeCountry, allCountries } = await chrome.storage.local.get(['enabled', 'activeCountry', 'allCountries']);

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

    const requestHeaders = [
        { header: "X-Forwarded-For", operation: "set", value: country.ip },
        { header: "X-Real-IP", operation: "set", value: country.ip },
        { header: "Client-IP", operation: "set", value: country.ip },
        { header: "X-Client-IP", operation: "set", value: country.ip },
        { header: "True-Client-IP", operation: "set", value: country.ip },
        { header: "WL-Proxy-Client-IP", operation: "set", value: country.ip },
        { header: "Timezone", operation: "set", value: country.timezone },
        { header: "CF-IPCountry", operation: "set", value: country.code }
    ];

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

    // Also save the active timezone string so content script can query it easily
    await chrome.storage.local.set({ _activeTimezone: country.timezone });
}

// Listen to storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.enabled || changes.activeCountry || changes.allCountries)) {
        updateRules();
    }
});

// Initial setup
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['enabled', 'activeCountry', 'allCountries', 'visibleCountryCodes'], (result) => {
        const defaultSettings = {};
        if (result.enabled === undefined) defaultSettings.enabled = false;
        if (result.activeCountry === undefined) defaultSettings.activeCountry = '';
        if (result.allCountries === undefined) defaultSettings.allCountries = [];
        if (result.visibleCountryCodes === undefined) defaultSettings.visibleCountryCodes = [];

        if (Object.keys(defaultSettings).length > 0) {
            chrome.storage.local.set(defaultSettings);
        }
    });
    updateRules();
});
