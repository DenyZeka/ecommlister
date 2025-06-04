console.log("mainScript Loaded");

// Wait for the page to fully load
window.addEventListener("load", () => {
  setTimeout(function() {
    // Create the white circle container
    const circleContainer = document.createElement("div");
    circleContainer.id = "circle-container";

    // Create the floating icon
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("Icons/ecom-lister-high-resolution-logo-transparent.png"); // Use the icon image
    icon.id = "floating-icon";

    // Append the icon to the circle container
    circleContainer.appendChild(icon);

    // Append the circle container to the body
    document.body.appendChild(circleContainer);

    // Create the floating panel
    const floatingPanel = document.createElement("div");
    floatingPanel.id = "floating-panel";
    floatingPanel.style.display = "none"; // Hide the panel initially
    document.body.appendChild(floatingPanel);

    // Add click event to the icon
    circleContainer.addEventListener("click", async () => {
        // Show the floating panel
        floatingPanel.style.display = "block";

        // Add the loading spinner
        floatingPanel.innerHTML = `
        <div class="spinner"></div>
      `;

        try {
            const currentUrl = window.location.href;

            // Call saleyeeContentScript to get the data

            const result = currentUrl.includes('saleyee') ? await window.extractSaleYeeData() : await window.extractAliExpressData();

            if (result.success) {
                const { title, sku, price, video, images, variations, description, shippingPolicy, zipCode } = result.data;

                // Limit the number of images to 24
                const displayedImages = images.slice(0, 24);

                // Create variations HTML if variations exist
                let variationsHTML = '';
                if (variations && variations.length > 0) {
                    variationsHTML = `
                        <div class="form-group">
                            <label for="variations">Variations:</label>
                            <div class="variations-gallery">
                                ${variations.map((variation, index) => `
                                    <div class="variation-item">
                                        <div class="variation-checkbox-container">
                                            <input type="checkbox" id="variation-${index}" class="variation-checkbox" checked />
                                            <label for="variation-${index}" class="custom-checkbox"></label>
                                        </div>
                                        <div class="variation-image-container">
                                            <img src="${variation.image || images[0]}" alt="${variation.name}" class="variation-image" />
                                            <div class="variation-name">${variation.name || 'Variation ' + (index + 1)}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }

                // Update the panel with editable fields and buttons
                floatingPanel.innerHTML = `
                    <div class="panel-content">
                    <div class="button-group">
                        <button id="list-item" class="action-button">List the Item</button>
                        <button id="save-to-bulk" class="action-button">Save to Bulk</button>
                        <button id="list-bulk" class="action-button">List the Bulk</button>
                        <button id="close-panel" class="close-button">×</button>
                    </div>
                    <h3>Edit Product Details</h3>
                    <div class="form-group">
                        <label for="title">Title:</label>
                        <input type="text" id="title" value="${title}" />
                    </div>
                    <div class="form-group">
                        <label for="sku">SKU:</label>
                        <input type="text" id="sku" value="${sku}" />
                    </div>
                    <div class="form-group">
                        <label for="price">Price:</label>
                        <input type="text" id="price" value="${price}" />
                    </div>
                    <div class="form-group">
                        <label for="description">Description:</label>
                        <textarea id="description">${description}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="images">Images:</label>
                        <div class="image-gallery">
                            ${displayedImages.map((img) => `<img src="${img}" alt="Product Image" />`).join("")}
                        </div>
                    </div>
                    ${variationsHTML}
                    </div>
                `;

                // Add functionality to the buttons
                const listItemButton = floatingPanel.querySelector("#list-item");
                const saveToBulkButton = floatingPanel.querySelector("#save-to-bulk");
                const listBulkButton = floatingPanel.querySelector("#list-bulk");

                if (listItemButton) {
                    listItemButton.addEventListener("click", () => {
                        HandleListItemButton(displayedImages, result.data.shippingPolicy, result.data.zipCode, getSelectedVariations(), result.data.video);
                    });
                }

                if (saveToBulkButton) {
                    saveToBulkButton.addEventListener("click", () => {
                        HandleSaveToBulkButton(displayedImages, result.data.shippingPolicy, result.data.zipCode, getSelectedVariations(), result.data.video);
                    });
                }

                if (listBulkButton) {
                    listBulkButton.addEventListener("click", () => {
                        HandleListBulkButton();
                    });
                }
            } else {
                // Show error message
                floatingPanel.innerHTML = `
                    <div class="panel-content">
                    <button id="close-panel" class="close-button">×</button>
                    <h3>Error</h3>
                    <p>${result.error}</p>
                    </div>
                `;
            }
        } catch (error) {
            // Handle unexpected errors
            floatingPanel.innerHTML = `
                <div class="panel-content">
                    <button id="close-panel" class="close-button">×</button>
                    <h3>Error</h3>
                    <p>Something went wrong. Please try again.</p>
                </div>
                `;
        }

        // Add close button functionality
        const closeButton = floatingPanel.querySelector("#close-panel");
        if (closeButton) {
            closeButton.addEventListener("click", () => {
                floatingPanel.style.display = "none";
            });
        }
    });
});

function getSelectedVariations() {
    const variationCheckboxes = document.querySelectorAll('.variation-checkbox');
    const selectedVariations = [];

    variationCheckboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            const variationItem = checkbox.closest('.variation-item');
            const nameElement = variationItem.querySelector('.variation-name');
            const imageElement = variationItem.querySelector('.variation-image');

            const variationData = {
                index: index,
                name: nameElement ? nameElement.textContent : `Variation ${index + 1}`,
                image: imageElement ? imageElement.src : null
            };

            selectedVariations.push(variationData);
        }
    });

    return selectedVariations;
}

function HandleListItemButton(displayedImages, shippingPolicy, zipCode, selectedVariations, video) {
    chrome.storage.local.clear();
    const updatedData = createUpdatedData(displayedImages, shippingPolicy, zipCode, selectedVariations, video);

    // Save the data to Chrome storage
    chrome.storage.local.get({ bulkItems: [] }, (result) => {
        const bulkItems = result.bulkItems;
        bulkItems.push(updatedData);
        chrome.storage.local.set({ bulkItems }, () => {
            console.log("Data saved to bulk:", updatedData);
        });
    });

    // Open eBay.com and run a new script with the data
    window.open('https://www.ebay.com/sl/prelist/suggest?status=true', '_blank');
}

async function HandleSaveToBulkButton(displayedImages, shippingPolicy, zipCode, selectedVariations, video) {
    const updatedData = createUpdatedData(displayedImages, shippingPolicy, zipCode, selectedVariations, video);

    // Create notification label if it doesn't exist
    let notificationLabel = document.querySelector('.notification-label');
    if (!notificationLabel) {
        notificationLabel = document.createElement('div');
        notificationLabel.className = 'notification-label';
        const buttonGroup = document.querySelector('.button-group');
        buttonGroup.insertAdjacentElement('afterend', notificationLabel);
    }

    try {
        // Get bulk items from storage
        const result = await new Promise(resolve =>
            chrome.storage.local.get({ bulkItems: [] }, resolve)
        );

        const bulkItems = result.bulkItems;
        const isAlreadyListedInBulk = bulkItems.findIndex(item => item.sku === updatedData.sku);

        // Check if SKU is listed using background script
        let dbResponse = await new Promise(resolve =>
            chrome.runtime.sendMessage({
                action: "checkSku",
                sku: updatedData.sku
            }, resolve)
        );

        if (!dbResponse.isListed && (updatedData.sku.split('-').length > 1)) {
            dbResponse = await new Promise(resolve =>
                chrome.runtime.sendMessage({
                    action: "checkSku",
                    sku: updatedData.sku.split('-')[1].trim()
                }, resolve)
            );
        }

        if (isAlreadyListedInBulk === -1 && !dbResponse.isListed) {
            bulkItems.push(updatedData);
            await new Promise(resolve =>
                chrome.storage.local.set({ bulkItems }, resolve)
            );
            console.log("Data saved to bulk:", updatedData);
            showSuccessMessage(notificationLabel, "Product successfully saved to bulk");
        } else if (dbResponse.isListed) {
            showErrorMessage(notificationLabel, "Product already exists in DB");
        } else {
            showErrorMessage(notificationLabel, "Product already saved to bulk");
        }
    } catch (error) {
        console.error("Error saving to bulk:", error);
        showErrorMessage(notificationLabel, "Failed to save item to bulk");
    }
}

function HandleListBulkButton() {
    // Retrieve bulk items from Chrome storage
    chrome.storage.local.get({ bulkItems: [] }, (result) => {
        const bulkItems = result.bulkItems;
        if (bulkItems.length > 0) {
            // Open Google.com for each item in the bulk
            // Open eBay.com and run a new script with the data
            window.open('https://www.ebay.com/sl/prelist/suggest?status=true', '_blank');
        } else {
            alert("No items in bulk to list!");
        }
    });
}

function createUpdatedData(displayedImages, shippingPolicy, zipCode, selectedVariations = [], video) {
    const updatedData = {
        title: document.getElementById("title").value.slice(0, 80),
        sku: document.getElementById("sku").value,
        price: document.getElementById("price").value,
        description: document.getElementById("description").value,
        images: displayedImages,
        shippingPolicy: shippingPolicy,
        zipCode: zipCode,
        variations: selectedVariations,
        video: video
    };

    return updatedData;
}

function showSuccessMessage(notificationLabel, text) {
    // Show success notification
    notificationLabel.textContent = text;
    notificationLabel.className = 'notification-label notification-success notification-show';

    // Hide notification after 2 seconds
    setTimeout(() => {
        notificationLabel.className = 'notification-label notification-success';
    }, 1000);
}

function showErrorMessage(notificationLabel, text) {

    // Show error notification
    notificationLabel.textContent = text;
    notificationLabel.className = 'notification-label notification-error notification-show';

    // Hide notification after 2 seconds
    setTimeout(() => {
        notificationLabel.className = 'notification-label notification-error';
    }, 1000);
}

// Listen for confirmation from ebaylist.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "processComplete") {
        console.log("I catch your message");
        var skuId = request.itemSku;
        console.log('The list process ${skuId} completed successfully!');

        // Save the data to Chrome storage
        chrome.storage.local.get({ bulkItems: [] }, (result) => {
            const bulkItems = result.bulkItems;
            const index = bulkItems.findIndex(item => item.sku === skuId);
            if (index !== -1) {
                bulkItems.splice(index, 1);
                console.log("Item removed from bulk");
            }
            chrome.storage.local.set({ bulkItems }, () => {
                console.log("bulkItems saved to Chrome local storage!");
            });
            if (bulkItems.length > 0) {
                // Open eBay.com and run a new script with the data
                window.open('https://www.ebay.com/sl/prelist/suggest?status=true', '_blank');
            }
        });
    }
  }, 0);
});