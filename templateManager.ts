import { CACHE_BUST_PERIOD, CONTACT_INFO_CSS, GLOBAL_CANVAS_CSS, MAX_TEMPLATES, NO_JSON_TEMPLATE_IN_PARAMS } from './constants';
import { Template, JsonParams, NotificationServer, NotificationTypes } from './template';
import { NotificationManager } from './ui/notificationsManager';
import * as utils from './utils';

export class TemplateManager {
    templatesToLoad = MAX_TEMPLATES;
    alreadyLoaded = new Array<string>();
    websockets = new Array<WebSocket>();
    notificationTypes = new Map<string, NotificationTypes[]>();
    enabledNotifications = new Array<string>();
    whitelist = new Array<string>();
    blacklist = new Array<string>();
    templates = new Array<Template>();
    responseDiffs = new Array<number>();

    canvasElement: HTMLCanvasElement;
    startingUrl: string;
    randomness = Math.random();
    percentage = 1
    lastCacheBust = this.getCacheBustString();
    notificationManager = new NotificationManager();
    notificationSent = false;

    constructor(canvasElement: HTMLCanvasElement, startingUrl: string) {
        this.canvasElement = canvasElement;
        this.startingUrl = startingUrl
        this.initOrReloadTemplates(true)

        GM.getValue(`${window.location.host}_notificationsEnabled`, "[]").then((value) => {
            this.enabledNotifications = JSON.parse(value)
        })

        let style = document.createElement('style')
        style.innerHTML = CONTACT_INFO_CSS
        canvasElement.parentElement!.appendChild(style)

        let globalStyle = document.createElement("style")
        globalStyle.innerHTML = GLOBAL_CANVAS_CSS;
        document.body.appendChild(globalStyle);
    }

    getCacheBustString() {
        return Math.floor(Date.now() / CACHE_BUST_PERIOD).toString(36)
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
        this.lastCacheBust = this.getCacheBustString()
        _url.searchParams.append("date", this.lastCacheBust);

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
                        if (this.templates.length < this.templatesToLoad) {
                            this.templates.push(new Template(json.templates[i], json.contact || json.contactInfo, this.canvasElement, minPriority + this.templates.length));
                        }
                    }
                }
                // connect to websocket
                if (json.notifications) {
                    this.connectToWebSocket(json.notifications)
                }
            }
        });
    }

    connectToWebSocket(server: NotificationServer) {
        console.log("trying to connect to websocket at ", server.url)
        let client = new WebSocket(server.url)
        this.notificationTypes.set(server.url, server.types)

        client.addEventListener('open', (_) => {
            console.log("successfully connected to ", server.url)
            this.websockets.push(client);
        })

        client.addEventListener('message', async (ev) => {
            console.log("received message from ", server, ev)
            console.log(await ev.data.text())
            let key = await ev.data.text()
            let notification = server.types.find((t) => t.key === key)
            if (notification && this.enabledNotifications.includes(`${server.url}??${key}`)) {
                this.notificationManager.newNotification(server.url, notification.message)
            }
        })

        client.addEventListener('close', (_) => {
            utils.removeItem(this.websockets, client)
            setTimeout(() => {
                this.connectToWebSocket(server)
            }, 1000 * 60);
        });

        client.addEventListener('error', (_) => {
            client.close();
        });
    }

    canReload(): boolean {
        return this.lastCacheBust !== this.getCacheBustString()
    }

    initOrReloadTemplates(forced = false) {
        if (!this.canReload() && !forced) {
            // fake a reload
            for (let i = 0; i < this.templates.length; i++) {
                this.templates[i].fakeReload(i * 50)
            }
            return;
        }

        // reload the templates
        // reloading only the json is not possible because it's user input and not uniquely identifiable
        // so everything is reloaded as if the template manager was just initialized
        while (this.templates.length) {
            this.templates.shift()?.destroy()
        }
        while (this.websockets.length) {
            this.websockets.shift()?.close()
        }
        this.templates = []
        this.websockets = []
        this.alreadyLoaded = []
        this.whitelist = []
        this.blacklist = []
        if (this.startingUrl !== NO_JSON_TEMPLATE_IN_PARAMS)
            this.loadTemplatesFromJsonURL(this.startingUrl)
        GM.getValue(`${window.location.host}_alwaysLoad`).then(value => {
            if (value && value !== "[]") {
                let templates: string[] = JSON.parse(value as string);
                for (let i = 0; i < templates.length; i++) {
                    this.loadTemplatesFromJsonURL(templates[i])
                }
            } else if (!this.notificationSent){
                this.notificationManager.newNotification("template manager", "No default template set. Consider adding one via settings.")
                this.notificationSent = true
            }
        })
    }

    currentSeconds() {
        let averageDiff = this.responseDiffs.reduce((a, b) => a + b, 0) / (this.responseDiffs.length)
        return (Date.now() + averageDiff) / 1000;
    }

    update() {
        let cs = this.currentSeconds()
        for (let i = 0; i < this.templates.length; i++)
            this.templates[i].update(this.percentage, this.randomness, cs);
        if (this.templates.length < this.templatesToLoad) {
            for (let i = 0; i < this.whitelist.length; i++) {
                // yes this calls all whitelist all the time but the load will cancel if already loaded
                this.loadTemplatesFromJsonURL(this.whitelist[i], i * this.templatesToLoad)
            }
        }
    }

    setContactInfoDisplay(enabled: boolean) {
        for (let i = 0; i < this.templates.length; i++) {
            this.templates[i].setContactInfoDisplay(enabled)
        }
    }
}
