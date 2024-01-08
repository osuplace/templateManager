import { TemplateManager } from "../templateManager";
import * as utils from "../utils";
import { Settings } from "./settingsContainer";

let SLIDERS_SVG = '<button><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 416c0-17.7 14.3-32 32-32l54.7 0c12.3-28.3 40.5-48 73.3-48s61 19.7 73.3 48L480 384c17.7 0 32 14.3 32 32s-14.3 32-32 32l-246.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 448c-17.7 0-32-14.3-32-32zm192 0a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM384 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm-32-80c32.8 0 61 19.7 73.3 48l54.7 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-54.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l246.7 0c12.3-28.3 40.5-48 73.3-48zM192 64a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm73.3 0L480 64c17.7 0 32 14.3 32 32s-14.3 32-32 32l-214.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 128C14.3 128 0 113.7 0 96S14.3 64 32 64l86.7 0C131 35.7 159.2 16 192 16s61 19.7 73.3 48z"/></svg></button>'

function createTooltip(content: string, width=100) {
    let tooltipElement = document.createElement('span');
    tooltipElement.classList.add('osuplaceTooltip')
    tooltipElement.textContent = content;
    tooltipElement.style.width = `${width}px`;
    tooltipElement.style.position = "relative";
    return tooltipElement;
}

export async function init(manager: TemplateManager) {
    let settings = new Settings(manager);

    while (window.innerWidth === 0 || window.innerHeight === 0) {
        await utils.sleep(1000);
    }

    let xKey = `${window.location.host}_settingsX`
    let yKey = `${window.location.host}_settingsY`
    let GMx = await GM.getValue(xKey, null) || 10
    let GMy = await GM.getValue(yKey, null) || 10

    let tooltipElement = createTooltip('You can click and drag this icon around');
    tooltipElement.style.display = "none";
    tooltipElement.style.top = `-44px`;
    settings.onToggle(isOpened => {
        tooltipElement.style.display = isOpened ? "block" : "none";
    });

    let iconElement = utils.stringToHtml(SLIDERS_SVG)
    iconElement.appendChild(tooltipElement);
    document.body.append(iconElement)

    let setPosition = async (mouseX: number, mouseY: number) => {
        let xMin = 16 / window.innerWidth * 100
        let yMin = 16 / window.innerHeight * 100
        let x = (mouseX) / window.innerWidth * 100
        let y = (mouseY) / window.innerHeight * 100
        await GM.setValue(xKey, x)
        await GM.setValue(yKey, y)

        let tooltipXMargin = 126 / window.innerWidth * 100
        let left = x < tooltipXMargin ? 42 : -110;
        tooltipElement.style.left = `${left}px`;

        if (x < 50) {
            x = Math.max(xMin, x - xMin)
            iconElement.style.left = `${x}vw`
            iconElement.style.right = 'unset'
        } else {
            x = Math.max(xMin, 100 - x - xMin)
            iconElement.style.right = `${x}vw`
            iconElement.style.left = 'unset'
        }

        if (y < 50) {
            y = Math.max(yMin, y - yMin)
            iconElement.style.top = `${y}vh`
            iconElement.style.bottom = 'unset'
        } else {
            y = Math.max(yMin, 100 - y - yMin)
            iconElement.style.bottom = `${y}vh`
            iconElement.style.top = 'unset'
        }
    }

    await setPosition(GMx / 100 * window.innerWidth, GMy / 100 * window.innerHeight)
    iconElement.style.position = 'absolute'
    iconElement.style.width = "32px"
    iconElement.style.height = "32px"
    iconElement.style.backgroundColor = '#fff'
    iconElement.style.padding = "5px"
    iconElement.style.borderRadius = "5px"
    iconElement.style.zIndex = `${Number.MAX_SAFE_INTEGER - 1}`
    iconElement.style.cursor = "pointer"

    let clicked = false
    let dragged = false

    iconElement.addEventListener('mousedown', (ev) => {
        if (ev.button === 0) {
            clicked = true
            settings.changeMouseEvents(true)
            ev.preventDefault() // prevent text from getting selected
        }
    })
    iconElement.addEventListener('mouseleave', (ev) => {
        if (clicked) {
            dragged = true
        }
    })
    window.addEventListener('mouseup', (ev) => {
        if (ev.button === 0) {
            if (clicked && !dragged) {
                settings.toggle()
            }
            clicked = false
            dragged = false
            settings.changeMouseEvents(false)
        }
    })
    window.addEventListener('mousemove', (ev) => {
        if (dragged) {
            setPosition(ev.clientX, ev.clientY)
        }
    })

    iconElement.addEventListener('touchstart', (ev) => {
        clicked = true
    })
    window.addEventListener('touchend', (ev) => {
        clicked = false
        dragged = false
    })
    window.addEventListener('touchmove', (ev) => {
        if (ev.touches.length === 1) {
            if (iconElement !== document.elementFromPoint(ev.touches[0].pageX, ev.touches[0].pageY) && clicked) dragged = true;
            if (dragged) setPosition(ev.touches[0].clientX, ev.touches[0].clientY)
        }
    })
}