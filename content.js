// content.js
// Runs in ISOLATED world at document_start

chrome.storage.local.get(['enabled', '_activeTimezone'], (result) => {
    if (!result.enabled || !result._activeTimezone) return;

    const targetTimezone = result._activeTimezone;

    const scriptContent = `
    (function() {
      const targetTimezone = "${targetTimezone}";
      
      try {
        const OriginalDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = function(...args) {
          let options = args[1] || {};
          if (!options.timeZone) {
            options.timeZone = targetTimezone;
          }
          return new OriginalDateTimeFormat(args[0], options);
        };
        
        Object.assign(Intl.DateTimeFormat, OriginalDateTimeFormat);
        Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;

        const calculateOffset = (tz) => {
          try {
            const date = new Date();
            const tzString = date.toLocaleString('en-US', { timeZone: tz });
            const localString = date.toLocaleString('en-US');
            return Math.round((new Date(localString) - new Date(tzString)) / 60000);
          } catch(e) {
            return new Date().getTimezoneOffset();
          }
        };

        const customOffset = calculateOffset(targetTimezone);
        
        const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
        Date.prototype.getTimezoneOffset = function() {
          return customOffset;
        };

        console.log("[Location Simulator] Timezone successfully mocked to: " + targetTimezone);
      } catch (e) {
        console.error("[Location Simulator] Failed to mock timezone:", e);
      }
    })();
  `;

    const script = document.createElement('script');
    script.textContent = scriptContent;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
});
