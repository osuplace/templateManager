import { UPDATE_PERIOD_MILLIS } from "./constants";
import { TemplateManager } from "./templateManager";
import * as utils from "./utils";

let jsontemplate: string;
let canvasElement: HTMLCanvasElement;
let canvasRunning: boolean = false;

function findCanvas(element: Element | ShadowRoot) {
    if (element instanceof HTMLCanvasElement) {
        console.log('found canvas', element, window.location.href);
        if (!canvasElement) {
            canvasElement = element;
        } else if (element.width * element.height > canvasElement.width * canvasElement.height) {
            canvasElement = element;
        }
    }

    // find in Shadow DOM elements
    if (element instanceof HTMLElement && element.shadowRoot) {
        findCanvas(element.shadowRoot)
    }
    // find in children
    for (let child of element.children) {
        findCanvas(child)
    }
}

function findParams(urlString: string): string | null {
    const urlSearchParams = new URLSearchParams(urlString);
    const params = Object.fromEntries(urlSearchParams.entries());
    console.log(params)
    return params.jsontemplate ? params.jsontemplate : null;
}

function topWindow() {
    let params = findParams(window.location.hash.substring(1)) || findParams(window.location.search.substring(1));
    if (params) {
        jsontemplate = params
    }
    window.addEventListener('message', (ev) => {
        if (ev.data.type === 'jsonTemplate') {
            ev.source?.postMessage({ 'type': 'templateResponse', 'jsontemplate': jsontemplate })
        }
    })
}

async function canvasWindow() {
    window.addEventListener('message', (ev) => {
        if (ev.data.type === 'templateResponse') {
            jsontemplate = ev.data.jsontemplate
        }
    })
    let sleep = 0;
    while (!canvasElement) {
        await utils.sleep(1000 * 2 ** sleep);
        sleep++;
        console.log("trying to find canvas")
        findCanvas(document.documentElement)
    }
    sleep = 0
    while (!canvasRunning) {
        if (jsontemplate) {
            runCanvas(jsontemplate, canvasElement.parentElement!)
            break
        } else if (utils.windowIsEmbedded()) {
            window.top?.postMessage({ 'type': 'jsonTemplate' })
        }
        await utils.sleep(1000 * 2 ** sleep);
        sleep++;
    }
}

function runCanvas(jsontemplate: string, canvasParent: HTMLElement) {
    let manager = new TemplateManager(canvasParent, jsontemplate)
    window.setInterval(() => {
        manager.update()
    }, UPDATE_PERIOD_MILLIS);
}

console.log(`running templating script in ${window.location.href}`);
if (!utils.windowIsEmbedded()) {
    // we are the top window
    topWindow()
}
canvasWindow() 