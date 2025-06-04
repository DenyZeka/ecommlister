console.log("saleyeeContentScript Loaded");

async function extractSaleYeeData() {
  try {
    // Replace this with actual logic to extract data from the webpage
    const title = getTItle();
    const sku = getSku();
    const price = getPrice();
    const images = getImages();
    const description = getDescription();
    const shippingPolicy = 'SaleYee';
    const zipCode = '07836'

    return {
      success: true,
      // data: { title, sku, price, description, images, shippingPolicy, zipCode },
      data: { title, sku, price, video: null, images, variations: null, description, shippingPolicy, zipCode },
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
  const title = document.querySelector(".choose_h1").innerText.trim();
  return title.replace(/"/g, '&quot;');
}

function getSku() {
  const sku = document.querySelector(".choose_sku").innerText.trim();
  // Remove "SKU：" and add "SY-" at the beginning
  return sku.replace("SKU：", "SY-");
}

function getPrice() {
  const priceElemnt = document.querySelector(".oprice");
  var price = (priceElemnt && priceElemnt.innerText) ? priceElemnt.innerText.trim() : document.querySelector(".currPrice").innerText.trim();
  // Remove "USD " from the price
  price = price.replace("USD ", "");
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

function getImages() {
  return Array.from(document.querySelectorAll(".magnifier-line img")).map(img => img.src);
}

function getDescription() {
  const description = document.querySelector(".richtext").innerHTML;
  return htmlToString(description);
}

function htmlToString(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.innerHTML;
}

// Expose the function to other scripts
window.extractSaleYeeData = extractSaleYeeData;