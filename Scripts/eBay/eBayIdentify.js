console.log("eBayIdentify Loaded");

window.onload = async () => {
    await new Promise((rs, rj) => setTimeout(rs, 1000))
    var generalEleemnt;
    generalEleemnt = document.querySelector('.prelist-radix__next-container button');
    if (generalEleemnt) {
        generalEleemnt.click();
        await new Promise((rs, rj) => setTimeout(rs, 1000));
    }

    generalEleemnt = document.querySelector('.se-field-card__content-value');
    if (generalEleemnt) {
        generalEleemnt.click();
        await new Promise((rs, rj) => setTimeout(rs, 1000));
    }

    generalEleemnt = document.querySelector('.prelist-radix__next-container button');
    if (generalEleemnt) {
        generalEleemnt.click();
        await new Promise((rs, rj) => setTimeout(rs, 1000));
    }

    generalEleemnt = document.querySelector('.condition-picker-radix input');
    if (generalEleemnt) {
        generalEleemnt.click();
        await new Promise((rs, rj) => setTimeout(rs, 1000));
    }

    generalEleemnt = document.querySelector('.condition-dialog-radix__continue-btn');
    if (generalEleemnt) {
        generalEleemnt.click();
        await new Promise((rs, rj) => setTimeout(rs, 1000));
    }

    generalEleemnt = document.querySelector('.condition-dialog-non-block-radix__continue button');
    if (generalEleemnt) {
        generalEleemnt.click();
    }
}