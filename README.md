# EcommLister Usage Guide

The EcommLister browser extension helps you grab product information from supplier websites (AliExpress and SaleYee) and then uses that information to speed up the process of listing those items on eBay.

## How to Use EcommLister Extension

**Step 1: Navigate to a Product Page on AliExpress or SaleYee**

*   Go to a specific product page on `aliexpress.com` (or `.us`) or `saleyee.com`.

**Step 2: Activate the EcommLister UI**

*   Once on a product page, the EcommLister extension will inject a floating UI element (or button) onto the page. You'll need to interact with this UI (e.g., click a button like "Get Details" or similar – the exact text might vary).

**Step 3: Data Extraction and Editing**

*   **Automatic Extraction:**
    *   **AliExpress:** The extension will attempt to automatically extract the product title, SKU (from the URL), price, images (it tries to get full-resolution ones), product variations (like different colors or sizes), the main product video, and the product description.
    *   **SaleYee:** The extension will attempt to extract the product title, SKU, price, images, and description.
        *   **Limitation:** Currently, the SaleYee script does *not* extract product variations or videos; these are ignored.
*   **Price Calculation:** For both AliExpress and SaleYee, the extracted price is not used directly. A built-in calculation modifies it (this could be for adding a profit margin, currency conversion, or shipping estimation, but the exact formula is internal to the script).
*   **SKU Check:** Before proceeding, the extension will check (using `indexdb-manager.js` via the `background.js` script) if the product's SKU has already been listed or processed by you to avoid duplicates. If it's a duplicate, it will likely inform you.
*   **Editing Data:** The UI injected by `mainScript.js` should allow you to review and edit the extracted details before sending them to eBay.

**Step 4: Choose Your Listing Method**

The UI will likely offer you a couple of options:

*   **Option A: List Item Directly (Single Listing)**
    *   If you choose to list the item directly, the extension will prepare the data.
    *   It will then likely navigate you to the eBay listing page (or you'll navigate there yourself, and the script will activate).
    *   The `Scripts/eBay/eBayList.js` script will attempt to automatically fill in the eBay listing form with the data extracted from the supplier site.
    *   **SKU Tracking for Direct List:** It's important to note that if you list directly, the SKU might be added to the "already listed" database (`indexdb-manager.js`) *after* the eBay listing process is initiated or completed by `eBayList.js`.

*   **Option B: Add to Bulk List**
    *   You can choose to add the item to a "bulk list." This saves the product data temporarily in your browser's local storage (`chrome.storage.local`).
    *   You can repeat Steps 1-3 to add multiple items from AliExpress and/or SaleYee to this bulk list.

**Step 5: Listing from the Bulk List on eBay**

*   When you're ready to list items from your bulk list, you'll likely navigate to the eBay "create listing" page.
*   The `Scripts/eBay/eBayList.js` script will activate. It will take the *first item* from your `bulkItems` list (stored in `chrome.storage.local`) and attempt to populate the eBay listing form with its details.
*   **One by One:** It seems the bulk listing process still lists items one by one from the stored list. After an item is processed, `eBayList.js` signals completion, and the page reloads. The next time it runs, it would presumably take the next item from the bulk list (though the mechanism for advancing to the next item in the bulk list after a page reload needs to be robustly handled by the scripts).
*   **SKU Tracking for Bulk List:** SKUs from items added to the bulk list are likely added to the `indexdb-manager.js` database when you click the "Add to Bulk List" button on the supplier page.

**Step 6: Handling the eBay Listing Process (via `eBayList.js`)**

*   **Automatic Population:** `eBayList.js` will try to fill in:
    *   Title
    *   SKU
    *   Description (this might be plain text or basic HTML from the supplier)
    *   Price (the calculated one)
    *   Images (these might be uploaded via a CORS proxy, meaning the extension fetches them from the supplier's server on your behalf)
    *   Video (if extracted from AliExpress; this is done by `background.js` fetching the video and converting it to base64 for embedding or upload).
    *   Shipping details (some fields like `shippingPolicy` and `zipCode` might be hardcoded or need manual input if not fully extracted).
    *   Item location.
*   **eBay Variations - SIGNIFICANT LIMITATION:**
    *   While `eBayList.js` can navigate to eBay's interface for setting up product variations, the current code **does not automatically populate the individual details for each variation** (e.g., each color/size combination's specific SKU, price, quantity, or image).
    *   **What this means for you:** If you list an item with variations (e.g., a T-shirt that comes in different sizes and colors), you will likely need to **manually enter the details for each specific variation on the eBay site** after the script has filled in the main item information.
*   **Completion:** Once `eBayList.js` has finished its attempt to fill the form, it sends a message to `background.js`. If the listing originated from SaleYee, `background.js` will try to notify the last active SaleYee tab that the process is complete. The eBay page will then typically reload.

## Other Potential Features (Inferred)

*   **External SKU Import (`background.js`):** There's a feature to allow external sources (like a companion web app or another extension) to send a list of SKUs directly to the extension to be added to the `listedSkus` database. This is likely for advanced users or integration with other systems.

## Key Limitations to Be Aware Of

1.  **Incomplete eBay Variation Handling:** As mentioned, the script does not fill in individual details for product variations on eBay. This is the most significant operational limitation for users selling variable products.
2.  **No Variation/Video Extraction from SaleYee:** The script for SaleYee currently does not extract product variations or video links.
3.  **Fragile eBay Selectors:** The extension relies on specific IDs and structures of the eBay website to fill in forms. If eBay changes its website design, the extension could break or fail to populate fields correctly until it's updated.
4.  **Price Calculation is a Black Box:** You don't have direct control from a UI over how the price is calculated; it's a fixed logic in the script.
5.  **Bulk Listing Workflow:** The bulk listing processes items one at a time by reloading the eBay page. Ensure you monitor this process.

Remember to double-check the information on eBay before finalizing your listings, especially for items with variations.
