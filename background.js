// Import the IndexDBManager script
importScripts('indexdb-manager.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "processComplete") {
    // Find and send to only the last SaleYee tab
    chrome.tabs.query({ url: "https://www.saleyee.com/*" }, function (tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[tabs.length - 1].id, {
          action: "processComplete",
          itemSku: request.itemSku
        });
      }
    });
  } else if (request.action === "checkSku") {
    // Handle SKU check requests from content scripts
    IndexDBManager.isSkuListed(request.sku)
      .then(isListed => {
        sendResponse({ isListed });
      });
    return true; // Keep message channel open for async response
  } else if (request.action === "addSku") {
    // Handle SKU addition requests
    IndexDBManager.addListedSku(request.sku)
      .then(success => {
        sendResponse({ success });
      });
    return true;
  } else if (request.action === "getAllSkus") {
    // Handle requests to get all SKUs
    IndexDBManager.getAllListedSkus()
      .then(skus => {
        sendResponse({ skus });
      });
    return true;
  } else if (request.action === "fetchVideo") {
    // Let the sender know we got the message
    sendResponse({ status: "fetching" });

    fetch(request.videoUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        return blobToBase64(blob);
      })
      .then(base64String => {
        // Send the result to the tab that requested it
        chrome.tabs.sendMessage(sender.tab.id, {
          message: "videoDataReady",
          videoData: base64String
        });
      })
      .catch(error => {
        console.error("Error fetching video:", error);
        chrome.tabs.sendMessage(sender.tab.id, {
          message: "videoFetchError",
          error: error.message
        });
      });
    return true; // Keep the message channel open for async response
  }
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === "SHARE_DATA") {
    const processSkus = async () => {
      try {
        const allListedSkus = request.data;

        for (const item of allListedSkus) {
          const isAlreadyListed = await IndexDBManager.isSkuListed(item.sku);
          if (!isAlreadyListed) {
            await IndexDBManager.addListedSku(item.sku);
          }
        }
        sendResponse({ message: "Data received and stored successfully" });
      } catch (error) {
        console.error('Error processing SKUs:', error);
        sendResponse({ message: "Error processing data" });
      }
    };

    processSkus();
    return true;
  }
});

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64String = reader.result;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
  });
}