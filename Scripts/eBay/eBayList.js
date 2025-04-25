console.log("eBayList Loaded");

var itemToList;
// Global timeout settings
const TIMEOUT_SHORT = 1000;  // 1 second
const TIMEOUT_MEDIUM = 3000; // 3 seconds
const TIMEOUT_LONG = 6000;   // 6 seconds
const MAX_RETRIES = 3;       // Maximum number of retries for operations

// Create a central logging system
const logger = {
    info: (message) => console.log(`[INFO] ${message}`),
    warn: (message) => console.warn(`[WARNING] ${message}`),
    error: (message, error = null) => {
        console.error(`[ERROR] ${message}`);
        if (error) console.error(error);
    },
    success: (message) => console.log(`[SUCCESS] ${message}`)
};

window.onload = async () => {
    try {
        // Check if the script has already run
        if (sessionStorage.getItem("scriptRan")) {
            logger.info("Script already ran, exiting...");
            return;
        }

        logger.info("eBayList starting");
        await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

        await waitForElement('[name="title"]', TIMEOUT_LONG * 2)
            .then(() => {
                logger.success("eBay page loaded successfully");
                setData();

                // Mark script as executed in sessionStorage
                sessionStorage.setItem("scriptRan", "true");
            })
            .catch((error) => {
                logger.error("Timed out waiting for page to load", error);
            });
    } catch (error) {
        logger.error("Error in window.onload", error);
    }
};

async function waitForElement(selector, timeout = TIMEOUT_MEDIUM) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(selector)) {
            resolve(document.querySelector(selector));
            return;
        }

        const observer = new MutationObserver((mutations) => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for element: ${selector}`));
        }, timeout);
    });
}

async function setData() {
    try {
        logger.info("Starting to set data");
        const result = await chrome.storage.local.get({ bulkItems: [] });

        if (!result.bulkItems || result.bulkItems.length === 0) {
            logger.error("No items found in storage");
            return;
        }

        itemToList = result.bulkItems[0];
        logger.info(`Processing item: ${itemToList.sku}`);

        // Process each step with proper error handling
        try {
            logger.info("Handling video");
            await HandleVideo(itemToList.video);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

            logger.info("Handling images");
            await HandleImages(itemToList.images);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

            logger.info("Handling SKU");
            await HandleSku(itemToList.sku);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

            logger.info("Handling Variations");
            await HandleVariations(itemToList.variations);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

            logger.info("Handling description");
            await HandleDescription(itemToList.description);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

            logger.info("Handling shipping policy");
            await HandleShippingPolicy(itemToList.shippingPolicy);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

            logger.info("Handling item location");
            await HandleItemLocation(itemToList.zipCode);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

            logger.info("Handling price");
            await HandlePrice(itemToList.price);
            await new Promise((rs) => setTimeout(rs, TIMEOUT_MEDIUM));

            logger.success("All data set successfully");

            // Notify background script about completion
            await sendMessageWithRetry({
                action: "processComplete",
                itemSku: itemToList.sku
            });

            // Add a small delay before reload
            await new Promise(rs => setTimeout(rs, 1000));

            // Force reload the page but maintain the form data
            window.location.reload(false);

        } catch (error) {
            logger.error("Error processing item", error);
        }
    } catch (error) {
        logger.error("Error in setData", error);
    }
}

async function sendMessageWithRetry(message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await chrome.runtime.sendMessage(message);
            logger.success('Message sent successfully');
            return response;
        } catch (error) {
            logger.error(`Error sending message (attempt ${attempt}/${maxRetries})`, error);
            if (attempt === maxRetries) throw error;
            await new Promise(rs => setTimeout(rs, 1000)); // Wait before retry
        }
    }
}

async function HandleVideo(video) {
    if (!video) {
        console.warn("No video to upload");
        return;
    }

    console.log("Handling video:", video);

    // Send message to background script to fetch the video
    chrome.runtime.sendMessage({
        action: "fetchVideo",
        videoUrl: video
    }, response => {
        console.log("Initial response:", response);
    });
}

// Listen for the response with the video data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "videoDataReady") {
        console.log("Video data received, length:", request.videoData.length);
        // Now you can use the base64 video data
        // For example, you might want to send it to the page
        if (request?.videoData) {
            const base64String = request.videoData;
            const mimeType = 'video/mp4';
            const blob = base64ToBlob(base64String, mimeType);
            const dT = new DataTransfer();
            dT.items.add(new File([blob], 'video/mp4', { type: "video/mp4", lastModified: new Date().getTime() }));

            let inp = document.querySelector('[type="file"]')
            if (inp) {
                inp.files = dT.files;
                inp.dispatchEvent(new Event('change', { bubble: true }))

                checkVidoeProgress()
            }


        }
    } else if (request.message === "videoFetchError") {
        console.error("Failed to fetch video:", request.error);
        // Handle the error case
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { message: "baseUrl" });
        });
    }
});

function base64ToBlob(base64String, mimeType) {
    const byteCharacters = atob(base64String);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i++) {
        byteArrays.push(byteCharacters.charCodeAt(i));
    }

    const byteArray = new Uint8Array(byteArrays);
    return new Blob([byteArray], { type: mimeType });
}

async function checkVidoeProgress() {

    await new Promise((rs, rj) => setTimeout(rs, 2000))
    console.log(document.querySelector('.uploader-thumbnails__wait'));
    if (document.querySelector('.uploader-thumbnails__wait')) {
        const chekcProgress = setInterval(async () => {

            const percentag = document.querySelector('.uploader-thumbnails__wait')?.getAttribute('data-percent')
            console.log(percentag);
            if (percentag == 'done') {
                clearInterval(chekcProgress)
                console.log('vidoe uploded 100%');
            }
        }, 100)
    }

}

async function HandleImages(images) {
    if (!images || images.length === 0) {
        logger.warn("No images to upload");
        return;
    }

    logger.info(`Processing ${images.length} images`);

    for (let i = 0; i < images.length; i++) {
        try {
            logger.info(`Uploading image ${i + 1}/${images.length}`);
            await uploadImage(images[i]);
            await new Promise(rs => setTimeout(rs, TIMEOUT_SHORT)); // Wait between uploads
        } catch (error) {
            logger.error(`Failed to upload image ${i + 1}`, error);
        }
    }

    // Verify images were uploaded
    await verifyImageUpload(images.length);
}

async function verifyImageUpload(expectedCount) {
    try {
        // Wait for image thumbnails to appear
        await new Promise(rs => setTimeout(rs, TIMEOUT_MEDIUM));

        // This selector needs to be adjusted based on eBay's actual structure
        const thumbnails = document.querySelectorAll('.image-manager__thumbnail');

        if (thumbnails && thumbnails.length > 0) {
            logger.success(`Verified ${thumbnails.length} images uploaded`);
        } else {
            logger.warn(`Expected ${expectedCount} images, but couldn't verify upload`);
        }
    } catch (error) {
        logger.error("Error verifying image upload", error);
    }
}

async function uploadImage(url) {
    const corsProxy = 'https://corsproxy.io/?url=';

    try {
        // Add timeout to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_LONG);

        // Fetch the image using a CORS proxy
        const response = await fetch(corsProxy + encodeURIComponent(url), {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();

        // Create a File object from the blob
        const file = new File([blob], 'image.jpeg', {
            type: "image/jpeg",
            lastModified: new Date().getTime()
        });

        // Find the file input element with retry
        const inp = await waitForElement('[type="file"]', TIMEOUT_MEDIUM);
        if (!inp) {
            throw new Error("File input not found");
        }

        // Create a DataTransfer object and add the file
        const dT = new DataTransfer();
        dT.items.add(file);

        // Set the files property of the input element
        inp.files = dT.files;

        // Trigger the change event to upload the image
        inp.dispatchEvent(new Event('change', { bubbles: true }));

        // Wait for the image to be uploaded before proceeding to the next one
        await waitForImageUpload(inp);

        logger.success("Image uploaded successfully");
    } catch (err) {
        logger.error('Image upload failed', err);
        throw err; // Re-throw to be handled by caller
    }
}

function waitForImageUpload(inputElement, timeout = TIMEOUT_LONG) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkUpload = () => {
            // Check if the file input is empty (indicating the upload is complete)
            if (inputElement.files.length === 0) {
                resolve();
                return;
            }

            // Check for timeout
            if (Date.now() - startTime > timeout) {
                reject(new Error("Image upload timed out"));
                return;
            }

            // Check again after a short delay
            setTimeout(checkUpload, 100);
        };

        checkUpload();
    });
}

async function HandleSku(text) {
    if (!text) {
        logger.warn("No SKU provided");
        return;
    }

    try {
        scrollToElement('#s0-0-0-24-8-TITLE-3-34-11-2-se-textbox');
        await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

        const textareaElement = await waitForElement('#s0-0-0-24-8-TITLE-3-34-11-2-se-textbox');
        if (!textareaElement) {
            throw new Error("SKU textarea not found");
        }

        // Set the text value
        textareaElement.value = text;

        // Trigger input and change events
        ['input', 'change', 'blur'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            textareaElement.dispatchEvent(event);
        });

        // Verify value was set
        await new Promise((rs) => setTimeout(rs, 500));
        if (textareaElement.value !== text) {
            logger.warn("SKU value verification failed, retrying...");
            textareaElement.value = text;
            textareaElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        logger.success(`SKU set to: ${text}`);
    } catch (error) {
        logger.error("Error setting SKU", error);
    }
}

// Global flag to track if we're currently waiting to process variations
let waitingForVariationPage = false;

async function HandleVariations(variations) {
    if (!variations || variations.length == 0) {
        logger.warn("No Variations provided");
        return;
    }

    try {
        scrollToElement('.summary__variations .summary__header-edit-button');
        await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

        const textareaElement = await waitForElement('#s0-0-0-24-8-TITLE-3-34-11-2-se-textbox');
        if (!textareaElement) {
            throw new Error("textarea not found");
        }

        // Click to navigate to variations page
        document.querySelector('.summary__variations .summary__header-edit-button').click();

        await new Promise((resolve) => setTimeout(resolve, TIMEOUT_LONG));

        const variationsInterface = await observeElement('[id*="msku-variation-tag"]');
        if (!variationsInterface) {
            throw new Error("Variations element not found");
        }

        console.log('Variations element found:', variationsInterface);
        // Additional logic to interact with variationsInterface can go here


    } catch (error) {
        logger.error("Error handling variations", error);
    }
}

function observeElement(selector) {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver((mutations, observerInstance) => {
            const element = document.querySelector(selector);
            if (element) {
                observerInstance.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Timeout to reject if element is not found
        setTimeout(() => {
            observer.disconnect();
            reject(`Element ${selector} not found within the timeout period`);
        }, 10000); // 10-second timeout
    });
}

async function waitForElement2(selector, timeout = 10000, interval = 500) {
    const endTime = Date.now() + timeout;
    let element = null;

    while (Date.now() < endTime) {
        element = document.querySelector(selector);
        if (element) {
            return element;
        }
        console.log(`Waiting for element: ${selector}`);
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
    console.warn(`Element ${selector} not found within timeout`);
    return null;
}

async function HandleDescription(text) {
    if (!text) {
        logger.warn("No description provided");
        return;
    }

    try {
        scrollToElement('[name="descriptionEditorMode"]');
        await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

        // Wait for editor mode checkbox with retry
        const checkbox = await waitForElement(
            '[name="descriptionEditorMode"]',
            TIMEOUT_MEDIUM
        );

        if (!checkbox) {
            throw new Error("Description editor mode checkbox not found");
        }

        // Click the checkbox to switch to HTML mode
        checkbox.click();
        logger.info("Switched to HTML mode for description");

        // Wait for editor to switch modes
        await new Promise((rs) => setTimeout(rs, TIMEOUT_MEDIUM));

        // Multiple attempts to find and set the description textarea
        let textareaElement = null;
        let attempts = 0;

        while (!textareaElement && attempts < MAX_RETRIES) {
            attempts++;
            try {
                textareaElement = await waitForElement(
                    '#s0-0-0-24-8-DESCRIPTION-0-34-rich-text-editor-rawEditor',
                    TIMEOUT_MEDIUM
                );

                if (textareaElement) {
                    break;
                }

                logger.warn(`Attempt ${attempts}: Description textarea not found, retrying...`);
                await new Promise(rs => setTimeout(rs, TIMEOUT_SHORT));
            } catch (err) {
                logger.error(`Attempt ${attempts}: Error finding textarea`, err);
            }
        }

        if (!textareaElement) {
            throw new Error("Description textarea not found after multiple attempts");
        }

        // Set the text value with multiple approaches
        textareaElement.value = text;

        // Dispatch events
        ['input', 'change', 'keyup', 'blur'].forEach(eventType => {
            textareaElement.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        // Focus and use selection approach as backup
        textareaElement.focus();

        // Add a MutationObserver to ensure value stays set
        const observer = new MutationObserver((mutations, obs) => {
            if (textareaElement.value !== text) {
                textareaElement.value = text;
                textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        observer.observe(textareaElement, {
            attributes: true,
            attributeFilter: ['value']
        });

        // Keep checking the value for a period
        let verificationAttempts = 0;
        const verifyInterval = setInterval(() => {
            verificationAttempts++;

            if (textareaElement.value !== text) {
                logger.warn(`Description verification attempt ${verificationAttempts}: Value changed, fixing...`);
                textareaElement.value = text;
                textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (verificationAttempts >= 5) {
                clearInterval(verifyInterval);
                observer.disconnect();

                // Final verification
                if (textareaElement.value === text) {
                    logger.success("Description set successfully");
                } else {
                    logger.warn("Description may not be set correctly");
                }
            }
        }, 500);

        // Wait before proceeding
        await new Promise(rs => setTimeout(rs, TIMEOUT_MEDIUM));
    } catch (error) {
        logger.error("Error setting description", error);
    }
}

async function HandlePrice(text) {
    if (!text) {
        logger.warn("No price provided");
        return;
    }

    try {
        scrollToElement('#s0-0-0-24-8-PRICE-0-34-1-11-2-1-se-textbox');
        await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

        const textareaElement = await waitForElement('#s0-0-0-24-8-PRICE-0-34-1-11-2-1-se-textbox');
        if (!textareaElement) {
            throw new Error("Price input not found");
        }

        // Set the text value
        textareaElement.value = text;

        // Trigger events
        ['input', 'change', 'blur'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            textareaElement.dispatchEvent(event);
        });

        // Verify value was set
        await new Promise((rs) => setTimeout(rs, 500));
        if (textareaElement.value !== text) {
            logger.warn("Price value verification failed, retrying...");
            textareaElement.value = text;
            textareaElement.dispatchEvent(new Event('change', { bubbles: true }));
        }

        logger.success(`Price set to: ${text}`);
    } catch (error) {
        logger.error("Error setting price", error);
    }
}

async function HandleShippingPolicy(shippingPolicy) {
    if (!shippingPolicy) {
        logger.warn("No shipping policy provided");
        return;
    }

    try {
        scrollToElement('input[role="combobox"][name="shippingPolicyId"]');
        await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

        // Find the combobox input with retry
        const comboboxInput = await waitForElement('input[role="combobox"][name="shippingPolicyId"]');
        if (!comboboxInput) {
            throw new Error("Shipping policy combobox not found");
        }

        if (comboboxInput.value === shippingPolicy) {
            logger.info(`Shipping policy already set to ${shippingPolicy}`);
            return;
        }

        // Function to select the shipping policy
        async function selectShippingPolicy(attempts = 0) {
            if (attempts >= MAX_RETRIES) {
                throw new Error(`Failed to select shipping policy after ${MAX_RETRIES} attempts`);
            }

            try {
                // Focus and click to open dropdown
                comboboxInput.focus();
                comboboxInput.click();
                comboboxInput.setAttribute('aria-expanded', 'true');

                await new Promise(rs => setTimeout(rs, TIMEOUT_SHORT));

                // Find all options
                const options = document.querySelectorAll('.combobox__option');
                logger.info(`Found ${options.length} shipping policy options`);

                // Find matching option
                const targetOption = Array.from(options)
                    .find(option => option.textContent.includes(shippingPolicy));

                if (targetOption) {
                    // Click the option
                    targetOption.click();

                    // Dispatch events
                    ['change', 'input', 'blur'].forEach(eventType => {
                        comboboxInput.dispatchEvent(new Event(eventType, { bubbles: true }));
                    });

                    comboboxInput.blur();

                    // Verify selection
                    await new Promise(rs => setTimeout(rs, TIMEOUT_SHORT));
                    if (comboboxInput.value.includes(shippingPolicy)) {
                        logger.success(`Shipping policy set to: ${shippingPolicy}`);
                        return true;
                    } else {
                        logger.warn(`Shipping policy verification failed, value is: ${comboboxInput.value}`);
                        return false;
                    }
                } else {
                    logger.warn(`Option for '${shippingPolicy}' not found`);
                    return false;
                }
            } catch (error) {
                logger.error(`Attempt ${attempts + 1}: Error selecting shipping policy`, error);
                return false;
            }
        }

        // Try to select the policy with retries
        let success = false;
        for (let i = 0; i < MAX_RETRIES && !success; i++) {
            success = await selectShippingPolicy(i);
            if (!success) {
                await new Promise(rs => setTimeout(rs, TIMEOUT_SHORT));
            }
        }

        // Set up observer to ensure value stays selected
        if (success) {
            const observer = new MutationObserver((mutations) => {
                if (!comboboxInput.value.includes(shippingPolicy)) {
                    logger.warn("Shipping policy changed, reselecting...");
                    selectShippingPolicy();
                }
            });

            observer.observe(comboboxInput, {
                attributes: true,
                attributeFilter: ['value']
            });

            // Disconnect observer after some time
            setTimeout(() => observer.disconnect(), TIMEOUT_LONG);
        }
    } catch (error) {
        logger.error("Error setting shipping policy", error);
    }
}

async function HandleItemLocation(zipCode) {
    if (!zipCode) {
        logger.warn("No ZIP code provided");
        return;
    }

    try {
        scrollToElement('.summary__shipping--section');
        await new Promise((rs) => setTimeout(rs, TIMEOUT_SHORT));

        // Find the location text span
        const locationSpan = await waitForElement('.summary__shipping--section-container div span.textual-display');
        if (!locationSpan) {
            throw new Error("Location span not found");
        }

        // Check if location already has correct ZIP code
        if (locationSpan.textContent.includes(zipCode)) {
            logger.info(`ZIP code already set to ${zipCode}`);
            return;
        }

        logger.info("Current location does not match desired ZIP code, editing...");

        // Find and click the edit button
        const editButton = await waitForElement('button[aria-label="Your settings - edit"]');
        if (!editButton) {
            throw new Error("Edit button for location not found");
        }

        editButton.click();
        logger.info("Clicked edit button for location");

        // Wait for dialog to open
        await new Promise((rs) => setTimeout(rs, TIMEOUT_MEDIUM));

        // Set location to US and ZIP code
        await setLocationToUSAndZipCode(zipCode);
    } catch (error) {
        logger.error("Error setting item location", error);
    }
}

async function setLocationToUSAndZipCode(zipCode) {
    try {
        logger.info(`Setting location to US with ZIP code: ${zipCode}`);

        // Wait for country input
        const countryInput = await waitForElement('input[name="itemLocationCountry"]');
        if (!countryInput) {
            throw new Error("Country input not found");
        }

        // Set country to US
        countryInput.value = 'United States';
        ['input', 'change', 'blur'].forEach(eventType => {
            countryInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        logger.info("Country set to United States");

        // Wait for ZIP code field to appear
        await new Promise(rs => setTimeout(rs, TIMEOUT_MEDIUM));

        // Find ZIP code input with retry
        const zipCodeInput = await waitForElement('input[name="itemLocation"]');
        if (!zipCodeInput) {
            throw new Error("ZIP code input not found");
        }

        // Set ZIP code
        zipCodeInput.value = zipCode;
        ['input', 'change', 'blur'].forEach(eventType => {
            zipCodeInput.dispatchEvent(new Event(eventType, { bubbles: true }));
        });

        logger.info(`ZIP code set to: ${zipCode}`);

        // Wait for city/state to populate
        await new Promise(rs => setTimeout(rs, TIMEOUT_MEDIUM));

        // Click Done button
        const doneButton = await waitForElement('button.btn--secondary');
        if (doneButton) {
            doneButton.click();
            logger.success("Location settings saved");
        } else {
            throw new Error("Done button not found");
        }

        // Verify changes
        await new Promise(rs => setTimeout(rs, TIMEOUT_MEDIUM));

        const updatedLocationSpan = document.querySelector('.summary__shipping--section-container div span.textual-display');
        if (updatedLocationSpan && updatedLocationSpan.textContent.includes(zipCode)) {
            logger.success("ZIP code verified in location section");
        } else {
            logger.warn("Could not verify ZIP code was updated correctly");
        }
    } catch (error) {
        logger.error("Error in setLocationToUSAndZipCode", error);
    }
}

function scrollToElement(selector) {
    try {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            logger.info(`Scrolled to element: ${selector}`);
            return true;
        } else {
            logger.warn(`Element not found for scrolling: ${selector}`);
            return false;
        }
    } catch (error) {
        logger.error("Error scrolling to element", error);
        return false;
    }
}