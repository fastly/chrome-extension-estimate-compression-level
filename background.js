//const pako = require("pako");

// for each tab, we store the number of Fastly hits and misses
const tabs = {};

// as a new page is loaded, reset our stats for that tab
chrome.webNavigation.onBeforeNavigate.addListener(({ frameId, tabId }) => {
  if (frameId === 0) {
    tabs[tabId] = { hits: 0, misses: 0, updated: 0 };
  }
});

// once the page is completely loaded, make sure to show the badge text
chrome.webNavigation.onCompleted.addListener(({ frameId, tabId }) => {
  if (frameId === 0) {
    updateText(tabId);
  }
});

// as a resource is loaded, see if it came through Fastly as a hit or a miss
// and if so update our stats and the badge text
chrome.webRequest.onCompleted.addListener(
  ({ method, url, fromCache, responseHeaders, statusCode, tabId, type }) => {
    if (method != "GET" || type != "main_frame") {
      return;
    }

    let contentEncoding;
    for (const header of responseHeaders) {
      if (header.name.toLowerCase() === "content-encoding") {
        contentEncoding = header.value;
        console.log(`${url} Content-Encoding: ${header.value}`);
      }
    }

    if (contentEncoding != "gzip") {
      return;
    }

    // console.log(`${method} ${url}`);

    fetch(url, {
      method: "GET",
      headers: { "Accept-Encoding": "gzip" },
    })
      .then(function (response) {
        if (!response.ok) {
          console.log(`HTTP error! status: ${response.status}`);
          return;
        }
        return response.blob();
      })
      .then(function (blob) {
        console.log(blob);

        tabs[tabId].level = 6;
        updateText(tabId);
      });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// update the badge text with the cache hit ratio
function updateText(tabId) {
  // no level, no badge
  if (!tabs[tabId].level) {
    return;
  }

  // Set the icon
  chrome.browserAction.setIcon({
    path: {
      16: "images/pc16.png",
      48: "images/pc48.png",
      128: "images/pc128.png",
    },
    tabId,
  });

  // Set the badge
  let text = `G:${Math.round(tabs[tabId].level)}`;
  chrome.browserAction.setBadgeBackgroundColor({
    color: [232, 44, 42, 255],
    tabId,
  });
  chrome.browserAction.setBadgeText({
    text,
    tabId,
  });
}
