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

    let seenXServedBy = false;
    let contentEncoding;
    for (const header of responseHeaders) {
      if (header.name.toLowerCase() === "x-served-by") {
        seenXServedBy = true;
      }
      if (header.name.toLowerCase() === "content-length") {
        console.log(`${url} Content-Length: ${header.value}`);
      }
      if (header.name.toLowerCase() === "content-encoding") {
        contentEncoding = header.value;
        console.log(`${url} Content-Encoding: ${header.value}`);
      }
    }

    if (contentEncoding != "gzip") {
      return;
    }

    console.log(`${method} ${url}`);

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
      .then(function (response) {
        console.log(response);
      });

    // doesn't have a header from Fastly?
    if (!seenXServedBy) {
      return;
    }

    if (fromCache) {
      return;
    }

    for (const header of responseHeaders) {
      if (header.name.toLowerCase() === "x-cache") {
        if (tabs[tabId]) {
          if (header.value.indexOf("HIT") !== -1) {
            tabs[tabId].hits++;
            updateTextOccasionally(tabId);
            console.log(`${url} HIT`);
          } else if (header.value.indexOf("MISS") !== -1) {
            tabs[tabId].misses++;
            updateTextOccasionally(tabId);
            console.log(`${url} MISS`);
          }
        }
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// update the badge text with the cache hit ratio
// but only occasionally to not use too much CPU
function updateTextOccasionally(tabId) {
  // only update the badge every 0.1 seconds
  if (Date.now() - tabs[tabId].updated > 100) {
    updateText(tabId);
  }
}

// update the badge text with the cache hit ratio
function updateText(tabId) {
  // save when we last updated the badge
  tabs[tabId].updated = Date.now();

  // no requests, no badge
  if (tabs[tabId].hits + tabs[tabId].misses === 0) {
    return;
  }

  chrome.browserAction.setIcon({
    path: {
      19: "images/pc-on.png",
      38: "images/pc-on-hidpi.png",
    },
    tabId,
  });
  chrome.browserAction.setBadgeBackgroundColor({
    color: [232, 44, 42, 255],
    tabId,
  });
  let text = `${Math.round(
    (tabs[tabId].hits / (tabs[tabId].hits + tabs[tabId].misses)) * 100
  )}%`;
  // not enough space for four characters
  if (text === "100%") {
    text = "100";
  }
  chrome.browserAction.setBadgeText({
    text,
    tabId,
  });
}
