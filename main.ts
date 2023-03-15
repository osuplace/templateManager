import { UPDATE_PERIOD_MILLIS } from "./constants";
import { TemplateManager } from "./templateManager";


console.log('running Templating script');
const urlSearchParams = new URLSearchParams(window.location.hash.substring(1));
const params = Object.fromEntries(urlSearchParams.entries());
console.log(params)
if (params.jsontemplate) {
    console.log('loading template', params.jsontemplate);
    let manager = new TemplateManager(document.querySelector('#board')!.parentElement!, params.jsontemplate)
    console.log(manager)
    window.setInterval(() => {
        manager.update()
    }, UPDATE_PERIOD_MILLIS);
}

