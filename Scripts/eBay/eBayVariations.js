console.log('iframe loaded successfully');
// alert('iframe loaded successfully');

window.onload = async function () {

    const { iframeStatus } = await chrome.storage.local.get("iframeStatus")
    console.log(iframeStatus);
    if (iframeStatus) {


        if (document.querySelector('[id*="msku-variation-tag"]')) {



            const { data } = await chrome.storage.local.get('data')
            console.log(data);
            await new Promise((rs, rj) => setTimeout(rs, 1000))
            document.querySelectorAll('[id*="msku-variation-tag"]').forEach(e => {
                e.querySelector('button').click()
            })
            await new Promise((rs, rj) => setTimeout(rs, 500))
            document.querySelector("#msku-attribute-add")?.click()
            await new Promise((rs, rj) => setTimeout(rs, 500))
            document.querySelector('[for="msku-own-parent-tag-checkbox"] input')?.click()
            await new Promise((rs, rj) => setTimeout(rs, 500))
            setText(document.querySelector("#msku-custom-parent-attribute-input"), 'colur')
            await new Promise((rs, rj) => setTimeout(rs, 500))
            document.querySelector("#msku-add-parent-tag-btn")?.click()
            await new Promise((rs, rj) => setTimeout(rs, 500))
            const colors = data.color
            for (let i = 0; i < colors.length; i++) {
                const color = colors[i];
                document.querySelector("#msku-custom-option-link")?.click()
                await new Promise((rs, rj) => setTimeout(rs, 500))
                setText(document.querySelector("#msku-custom-option-input"), color)
                await new Promise((rs, rj) => setTimeout(rs, 500))
                document.querySelector("#msku-custom-option-add")?.click()

            }
            await new Promise((rs, rj) => setTimeout(rs, 2000))
            document.querySelector("#msku-create-variations-button")?.click()
            await new Promise((rs, rj) => setTimeout(rs, 1000))
            document.querySelector('button[func="save"]')?.click()
            chrome.storage.local.set({ iframeStatus: false })
        }
    }
}
function setText(input, text) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    nativeInputValueSetter.call(input, text)

    const event = new Event('input', { bubbles: true })
    input.dispatchEvent(event)
}