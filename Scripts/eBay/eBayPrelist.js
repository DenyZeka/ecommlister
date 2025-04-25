console.log("eBayPrelist Loaded");

window.onload = async () => {

    const url = window.location.href;
    const urlParams = new URLSearchParams(new URL(url).search);
    const statusValue = urlParams.get('status');

    if (statusValue) {
        const result = await chrome.storage.local.get({ bulkItems: [] });
        const itemToList = result.bulkItems[0];
        
        if (itemToList.title) {
            const input = document.querySelector("[id*='input-textbox']")
            setText(input, itemToList.title)
            await new Promise((rs, rj) => setTimeout(rs, 1000))
            document.querySelector(".keyword-suggestion__button").click()
        }
    }
}

function setText(input, text) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    nativeInputValueSetter.call(input, text)

    const event = new Event('input', { bubbles: true })
    input.dispatchEvent(event)
}