document.addEventListener('DOMContentLoaded', () => {
  const fetchDetailsButton = document.getElementById('fetchDetailsButton');
  const bulkAddButton = document.getElementById('bulkAddButton');
  const listEbayButton = document.getElementById('listEbayButton');

  const productDetailsDiv = document.getElementById('productDetails');
  const productTitleSpan = document.getElementById('productTitle');
  const productSkuSpan = document.getElementById('productSku');
  const productPriceSpan = document.getElementById('productPrice');

  const loader = document.getElementById('loader');
  const statusMessage = document.getElementById('statusMessage');

  let currentProductData = null;

  // Function to update UI elements
  function updateButtonStates(isDataLoaded) {
    if (isDataLoaded) {
      bulkAddButton.disabled = false;
      listEbayButton.disabled = false;
      fetchDetailsButton.disabled = true; // Optional: disable after successful fetch
      fetchDetailsButton.textContent = "Details Fetched";
    } else {
      bulkAddButton.disabled = true;
      listEbayButton.disabled = true;
      fetchDetailsButton.disabled = false;
      fetchDetailsButton.textContent = "Fetch Product Details";
    }
  }

  function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
  }

  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'red' : '#666';
  }

  function displayProductDetails(data) {
    if (data) {
      productTitleSpan.textContent = data.title || 'N/A';
      productSkuSpan.textContent = data.sku || 'N/A';
      productPriceSpan.textContent = data.price ? data.price.toString() : 'N/A'; // Assuming price is a number or string
      // Add more fields here as needed, e.g., description, image count
      productDetailsDiv.style.display = 'block';
      currentProductData = data;
      updateButtonStates(true);
      showStatus('Product details loaded.', false);
    } else {
      productDetailsDiv.style.display = 'none';
      currentProductData = null;
      updateButtonStates(false);
      // Do not clear status if it's showing an error from fetching
    }
  }

  fetchDetailsButton.addEventListener('click', async () => {
    showLoader(true);
    showStatus('Fetching details from page...');
    productDetailsDiv.style.display = 'none'; // Hide old details
    currentProductData = null;
    updateButtonStates(false); // Disable action buttons while fetching

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showStatus('Error: No active tab found.', true);
        showLoader(false);
        return;
      }

      // Check if the URL is supported (AliExpress or SaleYee)
      // This is a basic check; mainScript.js will do the more robust site determination
      if (!tab.url || (!tab.url.includes('aliexpress.com/item/') && !tab.url.includes('saleyee.com/'))) {
        showStatus('Error: Not a supported AliExpress or SaleYee product page.', true);
        showLoader(false);
        return;
      }

      // Send message to content script (mainScript.js)
      // The content script needs to be listening for this.
      chrome.tabs.sendMessage(tab.id, { action: "popupFetchProductDetails" }, (response) => {
        showLoader(false);
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError.message);
          showStatus(`Error: ${chrome.runtime.lastError.message || 'Could not connect to page script.'}`, true);
          return;
        }

        if (response && response.error) {
          console.error('Error from content script:', response.error);
          showStatus(`Error: ${response.error}`, true);
          displayProductDetails(null);
        } else if (response && response.data) {
          if (response.data.skuListed) {
            showStatus('Note: This SKU has been processed before.', false);
            // Still display data but let user know
          }
          displayProductDetails(response.data);
        } else {
          showStatus('No data received from page. Ensure you are on a product page.', true);
          displayProductDetails(null);
        }
      });
    } catch (error) {
      console.error('Error in popup trying to send message:', error);
      showLoader(false);
      showStatus(`Error: ${error.message}`, true);
      displayProductDetails(null);
    }
  });

  bulkAddButton.addEventListener('click', () => {
    if (!currentProductData) {
      showStatus('No product data to add.', true);
      return;
    }
    showStatus('Adding to bulk list...');
    // Logic from mainScript.js's bulk add:
    // 1. Get existing bulkItems from chrome.storage.local
    // 2. Add currentProductData to it
    // 3. Save back to chrome.storage.local
    // 4. (Optional) Send SKU to background script to mark as listed/processed
    chrome.storage.local.get({ bulkItems: [] }, (result) => {
      const bulkItems = result.bulkItems;
      // Prevent duplicates in bulk list by SKU
      if (!bulkItems.find(item => item.sku === currentProductData.sku)) {
        bulkItems.push(currentProductData);
        chrome.storage.local.set({ bulkItems }, () => {
          showStatus(`Item ${currentProductData.sku} added to bulk list. Total: ${bulkItems.length}`, false);

          // Optionally, also add to the permanent "listed SKUs" database via background script
          // This depends on whether "Add to Bulk" should also mean "don't show again via SKU check"
          // For now, let's assume adding to bulk also means it's "processed"
          chrome.runtime.sendMessage({ action: "addSku", sku: currentProductData.sku }, (response) => {
            if (chrome.runtime.lastError) console.warn("Error adding SKU to DB (optional):", chrome.runtime.lastError.message);
            // else console.log("SKU added to DB response:", response);
          });

        });
      } else {
        showStatus(`Item ${currentProductData.sku} is already in the bulk list.`, false);
      }
    });
  });

  listEbayButton.addEventListener('click', () => {
    if (!currentProductData) {
      showStatus('No product data to list.', true);
      return;
    }
    showStatus('Preparing to list on eBay...');
    // This logic is similar to mainScript.js's direct list or how eBayList.js gets its data.
    // For simplicity, we'll put the current item into `chrome.storage.local` under a specific key
    // that `eBayList.js` can pick up. `eBayList.js` currently picks the *first* item from `bulkItems`.
    // We need a way to signal "list this specific item now".
    //
    // Option 1: Add to bulkItems and then navigate. eBayList.js will pick the first one.
    // This assumes eBayList.js clears the item after listing or bulkItems is managed carefully.
    // For now, let's make "List on eBay" effectively add it to the front of bulkItems
    // and then trigger navigation.
    chrome.storage.local.get({ bulkItems: [] }, (result) => {
      let bulkItems = result.bulkItems;
      // Remove if already exists to add it to the front
      bulkItems = bulkItems.filter(item => item.sku !== currentProductData.sku);
      bulkItems.unshift(currentProductData); // Add to the beginning

      chrome.storage.local.set({ bulkItems }, () => {
        // Mark as processed
        chrome.runtime.sendMessage({ action: "addSku", sku: currentProductData.sku });

        // Navigate to eBay or open eBay tab
        // This URL might need to be configurable or more intelligent
        chrome.tabs.create({ url: "https://www.ebay.com/sl/prelist/suggest" }); // Or the actual listing page
        showStatus(`Item ${currentProductData.sku} prepared. Opening eBay...`, false);
      });
    });
  });

  // Initial state
  updateButtonStates(false);
});
