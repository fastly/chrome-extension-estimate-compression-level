// const pako = require("./pako.js");
import { gzip, ungzip } from "./pako.es5.min.js";
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
    let contentLength;
    for (const header of responseHeaders) {
      if (header.name.toLowerCase() === "content-encoding") {
        contentEncoding = header.value;
        console.log(`${url} Content-Encoding: ${header.value}`);
      } else if (header.name.toLowerCase() === "content-length") {
        contentLength = parseInt(header.value, 10);
        console.log(`${url} Content-Length: ${header.value}`);
      }
    }

    if (contentEncoding != "gzip" || !contentLength) {
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
        return blob.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        console.log(arrayBuffer);
        let level = estimateGzipLevel(arrayBuffer, contentLength);
        tabs[tabId].level = level;
        console.log(`tabs[tabId].level: ${tabs[tabId].level}`);
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
  console.log(`tabs[tabId].level: ${tabs[tabId].level}`);
  let text = `${parseFloat(tabs[tabId].level, 10).toFixed(1)}`;
  text = text.replace(".0", "");
  console.log(`Text: ${text}`);
  chrome.browserAction.setBadgeBackgroundColor({
    color: [232, 44, 42, 255],
    tabId,
  });
  chrome.browserAction.setBadgeText({
    text,
    tabId,
  });
}

function estimateGzipLevel(uncompressed, originalLength) {
  console.log(`Original length: ${originalLength}`);

  let estimate = 11;
  let previousCompressedLength = uncompressed.length;

  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let level of levels) {
    const compressed = pako.gzip(uncompressed, { level: level });
    const compressedLength = compressed.length;
    console.log(`${level}: ${compressedLength}`);

    if (compressedLength == originalLength) {
      estimate = level;
      break;
    }

    if (compressedLength < originalLength) {
      console.log(
        `originalLength - compressedLength = ${
          originalLength - compressedLength
        }`
      );
      console.log(
        `previousCompressedLength - compressedLength = ${
          previousCompressedLength - compressedLength
        }`
      );
      estimate =
        level -
        (originalLength - compressedLength) /
          (previousCompressedLength - compressedLength);
      break;
    }
    previousCompressedLength = compressedLength;
  }
  return estimate;
}
