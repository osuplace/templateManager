import { ANIMATION_DEFAULT_PERCENTAGE, CACHE_BUST_PERIOD, MAX_TEMPLATES } from './constants';
import { Template, JsonParams } from './template';



export class TemplateManager {
    alreadyLoaded: Array<string> = new Array<string>();
    whitelist: Array<string> = new Array<string>();
    blacklist: Array<string> = new Array<string>();
    templates: Array<Template> = new Array<Template>();
    responseDiffs: Array<number> = new Array<number>();

    canvasElement: HTMLCanvasElement;
    startingUrl: string;
    randomness = Math.random();
    percentage = 1

    constructor(canvasElement: HTMLCanvasElement, startingUrl: string) {
        this.canvasElement = canvasElement;
        this.startingUrl = startingUrl
        this.loadTemplatesFromJsonURL(startingUrl)

        window.addEventListener('keydown', (ev: KeyboardEvent) => {
            if (ev.key.match(/^\d$/)) {
                let number = parseInt(ev.key) || 1.1
                this.percentage = 1 / number
            } else if (ev.key === 'd') {
                this.randomness = (0.1 + Math.random()) % 1;
            }
        })
    }

    loadTemplatesFromJsonURL(url: string | URL, minPriority = 0) {
        let _url = new URL(url);
        let uniqueString = `${_url.origin}${_url.pathname}`;

        // exit if already loaded
        // exit if blacklisted
        if (this.alreadyLoaded.includes(uniqueString) || this.blacklist.includes(uniqueString))
            return;
        this.alreadyLoaded.push(uniqueString);

        console.log(`loading template from ${_url}`);
        // do some cache busting
        _url.searchParams.append("date", Math.floor(Date.now() / CACHE_BUST_PERIOD).toString(36));

        GM.xmlHttpRequest({
            method: 'GET',
            url: _url.href,
            onload: (response) => {
                // use this request to callibrate the latency to general internet requests
                let responseMatch = response.responseHeaders.match(/date:(.*)\r/i);
                if (responseMatch) {
                    let responseTime = Date.parse(responseMatch[1]);
                    this.responseDiffs.push(responseTime - Date.now());
                }
                // parse the response
                let json: JsonParams = JSON.parse(response.responseText);
                // read blacklist. These will never be loaded
                if (json.blacklist) {
                    for (let i = 0; i < json.blacklist.length; i++) {
                        this.blacklist.push(json.blacklist[i].url);
                    }
                }
                // read whitelist. These will be loaded later
                if (json.whitelist) {
                    for (let i = 0; i < json.whitelist.length; i++) {
                        this.whitelist.push(json.whitelist[i].url);
                    }
                }
                // read templates
                if (json.templates) {
                    for (let i = 0; i < json.templates.length; i++) {
                        if (this.templates.length < MAX_TEMPLATES) {
                            this.templates.push(new Template(json.templates[i], this.canvasElement, minPriority + this.templates.length));
                        }
                    }
                }
            }
        });
    }

    reload() {
        // reload the templates
        // reloading only the json is not possible because it's user input and not uniquely identifiable
        // so everything is reloaded as if the template manager was just initialized
        while (this.templates.length) {
            this.templates.shift()?.destroy()
        }
        this.loadTemplatesFromJsonURL(this.startingUrl)
    }

    currentSeconds() {
        let averageDiff = this.responseDiffs.reduce((a, b) => a + b, 0) / (this.responseDiffs.length)
        return (Date.now() + averageDiff) / 1000;
    }
 
    update() {
        let cs = this.currentSeconds()
        for (let i = 0; i < this.templates.length; i++)
            this.templates[i].update(this.percentage, this.randomness, cs);
        if (this.templates.length < MAX_TEMPLATES) {
            for (let i = 0; i < this.whitelist.length; i++) {
                // yes this calls all whitelist all the time but the load will cancel if already loaded
                this.loadTemplatesFromJsonURL(this.whitelist[i], i * MAX_TEMPLATES)
            }
        }
    }

    restart() {
        while (this.templates.length > 0) {
            let template = this.templates.shift()
            template?.destroy()
        }
        this.alreadyLoaded = new Array<string>();
        this.loadTemplatesFromJsonURL(this.startingUrl)
    }
}
