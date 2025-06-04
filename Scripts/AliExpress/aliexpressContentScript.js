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

function getImages(doc) {
    const images = [];
    const imageElements = doc.querySelectorAll('.gallery_Gallery__picList__1gso5 img.gallery_Gallery__image__1gBmb, .images-view-item img, #j-image-thumb-list img, .picRtol img, .main-img img, .product-main-image img, .img-zoom img, .gallery-main-img__img');

    imageElements.forEach(imgElement => {
        const imageUrl = fixImage(imgElement); // Pass the element to fixImage
        if (imageUrl) {
        images.push(imageUrl);
        }
    });

    // Fallback for schema or meta tags if no images found via selectors
    if (images.length === 0) {
        try {
            const schemaOrgElement = doc.querySelector('script[type="application/ld+json"]');
            if (schemaOrgElement) {
                const schemaData = JSON.parse(schemaOrgElement.innerText);
                if (schemaData && schemaData.image) {
                    if (Array.isArray(schemaData.image)) {
                        schemaData.image.forEach(img => {
                            if (typeof img === 'string') {
                                const fixedImg = fixImage(img);
                                if(fixedImg) images.push(fixedImg);
                            } else if (img && img.contentUrl) {
                                 const fixedImg = fixImage(img.contentUrl);
                                 if(fixedImg) images.push(fixedImg);
                            }
                        });
                    } else if (typeof schemaData.image === 'string') {
                         const fixedImg = fixImage(schemaData.image);
                         if(fixedImg) images.push(fixedImg);
                    } else if (schemaData.image && schemaData.image.contentUrl) {
                        const fixedImg = fixImage(schemaData.image.contentUrl);
                        if(fixedImg) images.push(fixedImg);
                    }
                }
            }
        } catch (e) {
            // console.warn("Error parsing schema.org data for images:", e);
        }
    }

    return [...new Set(images)]; // Ensure unique images
}

function fixImage(imageInput) {
    let imageUrl = '';
    if (typeof imageInput === 'string') {
        imageUrl = imageInput;
    } else if (imageInput && typeof imageInput.getAttribute === 'function') {
        imageUrl = imageInput.getAttribute('src') || imageInput.getAttribute('data-src');
    }

    if (!imageUrl) {
        // console.warn('fixImage received invalid input or no src found:', imageInput);
        return null;
    }

    imageUrl = imageUrl.replace(/(_50x50|_60x60|_100x100|_120x120|_180x180|_200x200|_220x220|_300x300|_350x350|_400x400|_450x450|_500x500|_640x640)\.(jpg|jpeg|png|gif|webp)/i, '.$2');
    imageUrl = imageUrl.replace(/\.avif$/, '.jpg');
    if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
    }
    return imageUrl;
}

async function getVariations() {
    let variations = [];
    const variationsSection = document.querySelector('.sku-item--skus--StEhULs');
    if (!variationsSection) return variations; // Guard clause if section not found

    const variationsImages = variationsSection.querySelectorAll("img");

    for (let i = 0; i < variationsImages.length; i++) {
        variationsImages[i].click();
        await new Promise((rs, rj) => setTimeout(rs, 500));
        let variationName = document.querySelector('[class^="sku-item--title"]')?.innerText?.replace('Color:', '').trim();
        // Ensure variationName is a string, provide a fallback if null or undefined
        variationName = variationName || `Variation ${i + 1}`;
        let variationImage = fixImage(variationsImages[i]); // Pass the element

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
window.extractAliExpressData = extractAliExpressData; // Corrected global function name