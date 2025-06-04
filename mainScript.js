console.log("mainScript Loaded");

// Listener for messages from the popup or other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "popupFetchProductDetails") {
    (async () => { // Use async IIFE to handle promises nicely
      try {
        let siteName = "";
        const currentUrl = window.location.href; // Get current URL for site determination

        if (window.location.hostname.includes("aliexpress.")) {
          siteName = "aliexpress";
        } else if (window.location.hostname.includes("saleyee.")) {
          siteName = "saleyee";
        } else {
          sendResponse({ error: "Not a supported product page. Hostname not recognized." });
          return;
        }

        // Further check for specific page types if necessary (e.g. /item/ for aliexpress)
        if (siteName === "aliexpress" && !currentUrl.includes("/item/")) {
            sendResponse({ error: "Not an AliExpress item page." });
            return;
        }
        // Add similar checks for SaleYee if its product URLs have a specific pattern to check against non-product pages.


        let productDataResult = null; // To store the result from extraction functions {success: boolean, data: object, error: string}
        let skuForCheck = null;

        // Call the main data extraction function
        if (siteName === "aliexpress") {
          if (typeof window.extractAliExpressData === 'function') {
            productDataResult = await window.extractAliExpressData();
          } else {
            sendResponse({ error: "AliExpress data extraction function not found." });
            return;
          }
        } else if (siteName === "saleyee") {
          if (typeof window.extractSaleYeeData === 'function') {
            productDataResult = await window.extractSaleYeeData();
          } else {
            sendResponse({ error: "SaleYee data extraction function not found." });
            return;
          }
        }

        if (!productDataResult || !productDataResult.success) {
          sendResponse({ error: productDataResult ? productDataResult.error : "Failed to extract product data." });
          return;
        }

        const productData = productDataResult.data;
        skuForCheck = productData.sku; // Get SKU from the extracted data

        let isSkuListed = false;
        if (skuForCheck) {
          isSkuListed = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "checkSku", sku: skuForCheck }, (response) => {
              if (chrome.runtime.lastError) {
                console.warn("Error checking SKU:", chrome.runtime.lastError.message);
                resolve(false); // Assume not listed if error communicating
              } else {
                resolve(response && response.isListed);
              }
            });
          });
        }

        // Add the skuListed flag to the product data object itself
        // The popup.js expects this within the 'data' object that it receives.
        const responseData = { ...productData, skuListed: isSkuListed };

        sendResponse({ data: responseData });

      } catch (error) {
        console.error("Error in mainScript fetching details:", error);
        sendResponse({ error: error.message || "Unknown error occurred during data extraction." });
      }
    })(); // End of async IIFE

    return true; // Crucial for asynchronous sendResponse
  }
  // Keep the existing listener for "processComplete"
  else if (request.action === "processComplete") {
    console.log("I catch your message (processComplete in mainScript)");
        var skuId = request.itemSku;
    console.log(`The list process for SKU ${skuId} completed successfully!`);

    // Save the data to Chrome storage (remove the item from bulkItems)
        chrome.storage.local.get({ bulkItems: [] }, (result) => {
            const bulkItems = result.bulkItems;
            const index = bulkItems.findIndex(item => item.sku === skuId);
            if (index !== -1) {
                bulkItems.splice(index, 1);
        console.log("Item removed from bulk in mainScript");
            }
            chrome.storage.local.set({ bulkItems }, () => {
        console.log("bulkItems saved to Chrome local storage (mainScript)!");
            });
            if (bulkItems.length > 0) {
                // Open eBay.com and run a new script with the data
        // This part might be re-evaluated based on whether popup controls this flow now
        // For now, keeping existing behavior from mainScript.js
        console.log("More items in bulk, reopening eBay prelist page from mainScript.");
                window.open('https://www.ebay.com/sl/prelist/suggest?status=true', '_blank');
            }
        });
    // Note: No sendResponse needed here as this is just reacting to a message.
    }
});