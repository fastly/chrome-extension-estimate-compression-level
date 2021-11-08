import { gzip, ungzip } from "./pako.es5.min.js";

// For each tab, we store some state
const tabs = {};

// As a new page is loaded, reset our state for that tab
chrome.webNavigation.onBeforeNavigate.addListener(({ frameId, tabId }) => {
  if (frameId === 0) {
    tabs[tabId] = {};
  }
});

// As a page is loaded, estimate the compression level and update the badge text
chrome.webRequest.onCompleted.addListener(
  ({ method, url, fromCache, responseHeaders, statusCode, tabId, type }) => {
    if (method != "GET" || type != "main_frame" || statusCode != 200) {
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

    fetch(url)
      .then(function (response) {
        if (!response.ok) {
          console.log(`HTTP error! status: ${response.status}`);
          return;
        }
        return response.arrayBuffer();
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

// Update the badge text
function updateText(tabId) {
  // No level, no badge
  if (!tabs[tabId].level) {
    return;
  }

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

// Estimate the gzip level
function estimateGzipLevel(uncompressed, originalLength) {
  console.log(`Original length: ${originalLength}`);

  let previousCompressedLength = uncompressed.length;

  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let level of levels) {
    const compressed = pako.gzip(uncompressed, { level: level });
    const compressedLength = compressed.length;
    console.log(`${level}: ${compressedLength}`);

    if (compressedLength == originalLength) {
      return level;
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
      return (
        level -
        (originalLength - compressedLength) /
          (previousCompressedLength - compressedLength)
      );
    }
    previousCompressedLength = compressedLength;
  }
  return 11;
}
