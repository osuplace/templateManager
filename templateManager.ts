import { CACHE_BUST_PERIOD, CONTACT_INFO_CSS, GLOBAL_CANVAS_CSS, MAX_TEMPLATES, NO_JSON_TEMPLATE_IN_PARAMS } from './constants';
import { Template, JsonParams, NamedURL } from './template';
import { NotificationManager } from './ui/notificationsManager';
import * as utils from './utils';

interface NotificationTopic {
    id: string
    description: string
    forced: boolean | undefined;
}

export class TemplateManager {
    templatesToLoad = MAX_TEMPLATES;
    alreadyLoaded = new Array<string>();
    websockets = new Array<WebSocket>();
    notificationTypes = new Map<string, NotificationTopic[]>();
    enabledNotifications = new Array<string>();
    whitelist = new Array<NamedURL>();
    blacklist = new Array<string>();
    templateConstructors = new Array<(a: HTMLCanvasElement) => Template>();
    templates = new Array<Template>();
    responseDiffs = new Array<number>();

    canvasElements: HTMLCanvasElement[] = [];
    selectedCanvas: HTMLCanvasElement;
    startingUrl: string;
    randomness = Math.random();
    percentage = 1
    lastCacheBust = this.getCacheBustString();
    notificationManager = new NotificationManager();
    notificationSent = false;
    canvasObserver: MutationObserver | undefined;

    constructor(canvasElements: HTMLCanvasElement[], startingUrl: string) {
        console.log('TemplateManager constructor ', canvasElements);
        this.canvasElements = canvasElements;
        this.selectedCanvas = canvasElements[0];
        this.selectBestCanvas();
        this.startingUrl = startingUrl
        this.initOrReloadTemplates(true)

        GM.getValue(`${window.location.host}_notificationsEnabled`, "[]").then((value) => {
            this.enabledNotifications = JSON.parse(value)
        })

        let style = document.createElement('style')
        style.id = 'osuplace-contactinfo-style'
        style.innerHTML = CONTACT_INFO_CSS
        this.selectedCanvas.parentElement!.appendChild(style)

        let globalStyle = document.createElement("style")
        globalStyle.innerHTML = GLOBAL_CANVAS_CSS;
        document.body.appendChild(globalStyle);

        this.canvasObserver = new MutationObserver(() => {
            let css = getComputedStyle(this.selectedCanvas);
            let left = css.left;
            let top = css.top;
            let translate = css.translate;
            let transform = css.transform;
            let zIndex = css.zIndex;
            let globalRatio = parseFloat(this.selectedCanvas.style.width) / this.selectedCanvas.width
            for (let i = 0; i < this.templates.length; i++) {
                this.templates[i].updateStyle(
                    globalRatio, left, top, translate, transform, zIndex
                );
            }
        })
        this.canvasObserver.observe(this.selectedCanvas, { attributes: true })
    }

    selectBestCanvas() {
        let selectionChanged = false;
        let selectedBounds = this.selectedCanvas.getBoundingClientRect()
        for (let i = 0; i < this.canvasElements.length; i++) {
            let canvas = this.canvasElements[i];
            let canvasBounds = canvas.getBoundingClientRect()
            let selectedArea = selectedBounds.width * selectedBounds.height;
            let canvasArea = canvasBounds.width * canvasBounds.height;
            if (canvasArea > selectedArea) {
                this.selectedCanvas = canvas;
                selectedBounds = canvasBounds;
                selectionChanged = true;
            }
        }
        if (selectionChanged) {
            while (this.templates.length) {
                this.templates.shift()?.destroy()
            }
            for (let i = 0; i < this.templateConstructors.length; i++) {
                this.templates.push(this.templateConstructors[i](this.selectedCanvas))
            }
            this.canvasObserver?.disconnect()
            this.canvasObserver?.observe(this.selectedCanvas, { attributes: true })
        }
    }

    getCacheBustString() {
        return Math.floor(Date.now() / CACHE_BUST_PERIOD).toString(36)
    }

    loadTemplatesFromJsonURL(url: string | URL, minPriority = 0, lastContact='') {
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
                        let entry = json.whitelist[i];
                        let contactInfo = json.contact || json.contactInfo || lastContact
                        entry.name = entry.name ? `${entry.name}, from: ${contactInfo}` : contactInfo
                        this.whitelist.push(json.whitelist[i]);
                    }
                }
                // read templates
                if (json.templates) {
                    for (let i = 0; i < json.templates.length; i++) {
                        if (this.templates.length < this.templatesToLoad) {
                            let constructor = (a: HTMLCanvasElement) => new Template(json.templates[i], json.contact || json.contactInfo || lastContact, a, minPriority + this.templates.length)
                            this.templateConstructors.push(constructor)
                            this.templates.push(constructor(this.selectedCanvas));
                        }
                    }
                }
                // connect to websocket
                if (json.notifications) {
                    this.setupNotifications(json.notifications, url == this.startingUrl);
                }
            }
        });
    }

    setupNotifications(serverUrl: string, isTopLevelTemplate: boolean) {
        console.log('attempting to set up notification server ' + serverUrl);
        // get topics
        let domain = new URL(serverUrl).hostname.replace('broadcaster.', '');
        fetch(`${serverUrl}/topics`)
            .then((response) => {
                if (!response.ok) {
                    console.error(`error getting ${serverUrl}/topics, trying again in 10s...`);
                    setTimeout(() => { this.setupNotifications(serverUrl, isTopLevelTemplate) }, 10000);
                    return false;
                }
                return response.json();
            })
            .then(async (data: any) => {
                if (data == false) return;
                let topics: Array<NotificationTopic> = [];
                data.forEach((topicFromApi: any) => {
                    if (!topicFromApi.id || !topicFromApi.description) {
                        console.error('Invalid topic: ' + topicFromApi);
                        return;
                    };

                    let topic: NotificationTopic = topicFromApi;
                    if (isTopLevelTemplate) {
                        topic.forced = true;
                        utils.removeItem(this.enabledNotifications, `${domain}??${topic.id}`)
                        this.enabledNotifications.push(`${domain}??${topic.id}`)
                    }

                    topics.push(topic);
                });
                this.notificationTypes.set(domain, topics);

                if (isTopLevelTemplate) {
                    let enabledKey = `${window.location.host}_notificationsEnabled`
                    await GM.setValue(enabledKey, JSON.stringify(this.enabledNotifications))
                    this.notificationManager.newNotification("template manager", `You were automatically set to recieve notifications from ${domain} as it's from your address-bar template`);
                }

                // actually connecting to the websocket now
                let wsUrl = new URL('/listen', serverUrl)
                wsUrl.protocol = wsUrl.protocol == 'https:' ? 'wss:' : 'ws:';
                let ws = new WebSocket(wsUrl);

                ws.addEventListener('open', (_) => {
                    console.log(`successfully connected to websocket for ${serverUrl}`);
                    this.websockets.push(ws);
                });

                ws.addEventListener('message', async (event) => {
                    // https://github.com/osuplace/broadcaster/blob/main/API.md
                    let data = JSON.parse(await event.data);
                    if (data.e == 1) {
                        if (!data.t || !data.c) {
                            console.error(`Malformed event from ${serverUrl}: ${data}`);
                        };
                        let topic = topics.find(t => t.id == data.t); // FIXME: if we add dynamically updating topics, this will use the old topic list instead of the up to date one
                        if (!topic) return;
                        if (this.enabledNotifications.includes(`${domain}??${data.t}`) || topic.forced) {
                            this.notificationManager.newNotification(domain, data.c);
                        }
                    } else {
                        console.log(`Received unknown event from ${serverUrl}: ${data}`);
                    }
                });

                ws.addEventListener('close', (_) => {
                    utils.removeItem(this.websockets, ws);
                    setTimeout(() => {
                        this.setupNotifications(serverUrl, isTopLevelTemplate);
                    }, 1000 * 60)
                });

                ws.addEventListener('error', (_) => {
                    ws.close();
                });
            }).catch((error) => {
                console.error(`Couldn\'t get topics from ${serverUrl}: ${error}`);
            })
    }

    canReload(): boolean {
        return this.lastCacheBust !== this.getCacheBustString()
    }

    initOrReloadTemplates(forced = false, contactInfo: boolean | null = null) {
        if (contactInfo)
            this.setContactInfoDisplay(contactInfo);

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
            } else if (!this.notificationSent) {
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
        this.selectBestCanvas()
        let cs = this.currentSeconds()
        for (let i = 0; i < this.templates.length; i++)
            this.templates[i].update(this.percentage, this.randomness, cs);
        if (this.templates.length < this.templatesToLoad) {
            for (let i = 0; i < this.whitelist.length; i++) {
                // yes this calls all whitelist all the time but the load will cancel if already loaded
                let entry = this.whitelist[i];
                this.loadTemplatesFromJsonURL(entry.url, i * this.templatesToLoad, entry.name)
            }
        }
    }

    setContactInfoDisplay(enabled: boolean) {
        for (let i = 0; i < this.templates.length; i++) {
            this.templates[i].setContactInfoDisplay(enabled)
        }
    }
}
