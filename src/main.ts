import { NO_JSON_TEMPLATE_IN_PARAMS, UPDATE_PERIOD_MILLIS, TEMPLATE_RELOAD_INTERVAL } from "./constants";
import * as reddit from "./reddit";
import { TemplateManager } from "./templateManager";
import * as utils from "./utils";
import * as settings from "./ui/settingsIcon";

let jsontemplate: string;
let canvasElements: HTMLCanvasElement[]; // FIXME: This should probably be a list and the user can just select the correct one manually

function topWindow() {
    console.log("top window code for", window.location.href)
    GM.setValue('canvasFound', false)
    let params = utils.findJSONTemplateInURL(window.location) || NO_JSON_TEMPLATE_IN_PARAMS;
    jsontemplate = params
    GM.setValue('jsontemplate', jsontemplate)
}

async function canvasWindow() {
    while (document.readyState !== 'complete') {
        console.log("Template manager sleeping for 1 second because document isn't ready yet.")
        await utils.sleep(1000)
    }

    console.log("canvas code for", window.location.href)
    let sleep = 0;
    while (canvasElements === undefined || canvasElements.length === 0) {
        if (await GM.getValue('canvasFound', false) && !utils.windowIsEmbedded()) {
            console.log('canvas found by iframe')
            return;
        }
        await utils.sleep(1000 * sleep);
        sleep++;
        console.log("trying to find canvas")
        canvasElements = utils.findElementOfType(document.documentElement, HTMLCanvasElement)
    }
    GM.setValue('canvasFound', true)
    sleep = 0
    while (true) {
        if (jsontemplate) {
            runCanvas(jsontemplate, canvasElements!)
            break
        } else if (utils.windowIsEmbedded()) {
            jsontemplate = (await GM.getValue('jsontemplate', ''))
        }
        await utils.sleep(1000 * sleep);
        sleep++;
    }
}

async function runCanvas(jsontemplate: string, canvasElements: HTMLCanvasElement[]) {
    let manager = new TemplateManager(canvasElements, jsontemplate)
    settings.init(manager)
    window.setInterval(() => {
        manager.update()
    }, UPDATE_PERIOD_MILLIS);
    window.setInterval(() => {
        console.log("Reloading template...");
        manager.initOrReloadTemplates(false, null)
    }, TEMPLATE_RELOAD_INTERVAL);
    GM.setValue('jsontemplate', '')
}

console.log(`running templating script in ${window.location.href}`);
if (!utils.windowIsEmbedded()) {
    // we are the top window
    topWindow()
}
canvasWindow()

let __url = new URL(window.location.href)
if (__url.origin.endsWith('reddit.com')) {
    reddit.run()
}