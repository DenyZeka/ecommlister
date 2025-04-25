console.log("aliexpressContentScript Loaded");

async function extractAliExpressData() {
    try {
        window.scrollTo(0, 2500, {
            behavior: "smooth"
        });
        await new Promise((rs, rj) => setTimeout(rs, 2000))
        // Replace this with actual logic to extract data from the webpage
        const title = getTItle();
        const sku = getSku();
        const price = getPrice();
        const video = getMainVideo()
        const images = getImages();
        const variations = await getVariations();
        const description = getDescription();
        const shippingPolicy = 'China-AE';
        const zipCode = '07836'

        return {
            success: true,
            data: { title, sku, price, video, images, variations, description, shippingPolicy, zipCode },
        };
    } catch (error) {
        console.error("Error extracting data:", error);
        return {
            success: false,
            error: "Failed to extract data from the page.",
        };
    }
}

function getTItle() {
    const title = document.querySelector('[data-pl="product-title"]')?.innerText.trim();
    return title.replace(/"/g, '&quot;');
}

function getSku() {
    const curl = window.location.href;

    // Use a regular expression to match the product ID
    const productIdMatch = curl.match(/\/item\/(\d+)\.html/);

    // Return the product ID if found, otherwise return null
    return productIdMatch ? "AE-" + productIdMatch[1] : null;
}

function getPrice() {
    // Get the current price element
    const priceElement = document.querySelector('.price--currentPriceText--V8_y_b5');
    // Extract the price text
    var price = priceElement.textContent; // This will give you "$24.65"
    // If you need just the numeric value without the dollar sign
    price = price.replace('$', '');
    return calculatePrice(price);
}

function calculatePrice(originalPrice) {
    let myCostMoney = parseFloat(originalPrice);
    let mySalePrice;
    if (myCostMoney <= 10) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 1.20)) + 5;
    } else if (myCostMoney < 30) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.90)) + 5;
    } else if (myCostMoney < 50) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.51)) + 5;
    } else if (myCostMoney < 60) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.45)) + 5;
    } else if (myCostMoney < 70) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.40)) + 5;
    } else if (myCostMoney < 80) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.35)) + 5;
    } else if (myCostMoney < 100) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.33)) + 5;
    } else if (myCostMoney < 200) {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.28)) + 5;
    } else {
        mySalePrice = (((myCostMoney + 0.3) / (1 - 0.20)) + ((myCostMoney + 0.3) * 0.20)) + 5;
    }
    return parseFloat(mySalePrice.toFixed(2));
}

function getMainVideo() {
    console.log('getMainVideo called');
    const video = document.querySelector('[class*="video--video"] source')?.src
    console.log('video');
    console.log(video);
    if (video) {
        return video;
    }
    return false;
}

function getImages() {
    //return Array.from(document.querySelectorAll(".magnifier-line img")).map(img => img.src);
    const image = []
    const images = document.querySelector('.slider--wrap--dfLgmYD')?.querySelectorAll('img')
    images.forEach(img => {
        if (!img.className.startsWith('slider--videoIcon')) {
            img = fixImage(img);
            image.push(img);
        }
    })
    if (image.length > 0) {
        return image
    }
}

function fixImage(img) {
    if (img.src.includes('.jpg_')) {
        // Find the base ID part of the URL (everything before the resize parameters)
        img = img.src.split('.jpg_')[0] + '.jpg';
    }
    else if (img.src.includes('.png_')) {
        // Find the base ID part of the URL (everything before the resize parameters)
        img = img.src.split('.png_')[0] + '.png';
    }
    return img;
}

async function getVariations() {
    let variations = [];
    const variationsSection = document.querySelector('.sku-item--skus--StEhULs');
    const variationsImages = variationsSection.querySelectorAll("img");

    for (let i = 0; i < variationsImages.length; i++) {
        variationsImages[i].click();
        await new Promise((rs, rj) => setTimeout(rs, 500));
        let variationName = document.querySelector('[class^="sku-item--title"]')?.innerText?.replace('Color:', '').trim();
        let variationImage = fixImage(variationsImages[i]);

        // Start with the base name
        let finalName = variationName;
        let counter = 2;

        // Keep checking if the name exists and incrementing counter until we find a unique name
        while (variations.some(item => item.name === finalName)) {
            finalName = `${variationName}-${counter}`;
            counter++;
        }

        // Now we have a unique name, add it to the array
        variations.push({
            name: finalName,
            image: variationImage
        });
    }
    return variations;
}

function getDescription() {
    const test = document.querySelector('.detail-desc-decorate-richtext')
    test?.querySelector('p')?.remove()
    if (test) {
        const productDescription = test
        if (productDescription) {
            return htmlToString(productDescription.innerHTML);
        }
    }
    else if (document.querySelector("#product-description")) {
        return htmlToString(document.querySelector("#product-description").innerHTML);
    }
}

function htmlToString(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    return doc.body.innerHTML;
}

// Expose the function to other scripts
window.saliexpressData = extractAliExpressData;