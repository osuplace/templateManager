import { TemplateManager } from "../templateManager";
import * as utils from "../utils";
import { Settings } from "./settingsContainer";

var ICON_SETTINGS_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 416c0-17.7 14.3-32 32-32l54.7 0c12.3-28.3 40.5-48 73.3-48s61 19.7 73.3 48L480 384c17.7 0 32 14.3 32 32s-14.3 32-32 32l-246.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 448c-17.7 0-32-14.3-32-32zm192 0a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM384 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm-32-80c32.8 0 61 19.7 73.3 48l54.7 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-54.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l246.7 0c12.3-28.3 40.5-48 73.3-48zM192 64a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm73.3 0L480 64c17.7 0 32 14.3 32 32s-14.3 32-32 32l-214.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 128C14.3 128 0 113.7 0 96S14.3 64 32 64l86.7 0C131 35.7 159.2 16 192 16s61 19.7 73.3 48z"/></svg>'
var URL_IMAGE_YCDI = "https://cdn.discordapp.com/attachments/773872895813484554/1133840838422700113/you-can-drag-it.png";
// change after pull: var URL_IMAGE_YCDI = "https://raw.githubusercontent.com/osuplace/templateManager/main/image/you-can-drag-it-296x256.png";

export async function init(manager: TemplateManager) {
    let settings = new Settings(manager);

    while (window.innerWidth === 0 || window.innerHeight === 0)
        await utils.sleep(1000);

    const KEY_X = `${window.location.host}_settingsX`;
    const KEY_Y = `${window.location.host}_settingsY`;

    let imageElement = document.createElement('img');
    imageElement.src = URL_IMAGE_YCDI;
    imageElement.height = 96;
    imageElement.style.display = "none";
    imageElement.style.transform = "translate(-120px, -70px)";
    settings.onToggle(isOpened => {
        imageElement.style.display = isOpened ? "block" : "none";
    });

    let settingsButton = document.createElement('button');
    settingsButton.id = 'osuplaceSettingsButton';
    settingsButton.appendChild(utils.stringToHtml(ICON_SETTINGS_SVG));
    settingsButton.appendChild(imageElement);
    document.body.append(settingsButton);

    let setPosition = async (x: number, y: number) => {
        var x = x * (100 / window.innerWidth);
        var y = y * (100 / window.innerHeight);

        await GM.setValue(KEY_X, x);
        await GM.setValue(KEY_Y, y);

        updateButtonPosition(x, y);
    }

    let updateButtonPosition = function(x: number, y: number) {
        var xConvertToPercent = 100 / window.innerWidth;
        var yConvertToPercent = 100 / window.innerHeight;

        let xMin = 16 * xConvertToPercent;
        let xMax = 100 - 48 * xConvertToPercent;
        x = Math.min(xMax, Math.max(xMin, x));
        settingsButton.style.left = `${x}vw`;

        let yMin = 16 * yConvertToPercent;
        let yMax = 100 - 48 * yConvertToPercent;
        y = Math.min(yMax, Math.max(yMin, y));
        settingsButton.style.top = `${y}vh`;
    }

    let GMx = await GM.getValue(KEY_X, 10);
    let GMy = await GM.getValue(KEY_Y, 10);
    updateButtonPosition(GMx, GMy);

    let clicked = false;
    let dragged = false;

    settingsButton.addEventListener('mousedown', event => {
        if (event.button === 0) {
            clicked = true;
            settings.changeMouseEvents(true);
            event.preventDefault(); // prevent text from getting selected
        }
    });
    settingsButton.addEventListener('mouseleave', event => {
        if (clicked)
            dragged = true;
    });
    settingsButton.addEventListener('touchstart', event => {
        clicked = true;
    });

    window.addEventListener('mouseup', event => {
        if (event.button === 0) {
            if (clicked && !dragged) {
                settings.toggle();
            }
            clicked = false;
            dragged = false;
            settings.changeMouseEvents(false);
        }
    });
    window.addEventListener('mousemove', event => {
        if (dragged)
            setPosition(event.clientX, event.clientY);
    });
    window.addEventListener('touchend', event => {
        clicked = false;
        dragged = false;
    });
    window.addEventListener('touchmove', event => {
        if (event.touches.length === 1) {
            if (settingsButton !== document.elementFromPoint(event.touches[0].pageX, event.touches[0].pageY) && clicked) dragged = true;
            if (dragged) setPosition(event.touches[0].clientX, event.touches[0].clientY);
        }
    });
}