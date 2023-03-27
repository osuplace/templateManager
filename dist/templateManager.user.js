
// ==UserScript==
// @name			template-manager
// @version			0.4.2
// @description		Manages your templates on various canvas games
// @author			LittleEndu
// @license			MIT
// @grant			GM.xmlHttpRequest
// @grant			GM.setValue
// @grant			GM.getValue
// @match			https://pxls.space/
// @match			https://new.reddit.com/r/place/*
// @match			https://www.reddit.com/r/place/*
// @match			https://garlic-bread.reddit.com/embed*
// @match			https://hot-potato.reddit.com/embed*
// @match			https://www.twitch.tv/otknetwork/*
// @match			https://9jjigdr1wlul7fbginbq7h76jg9h3s.ext-twitch.tv/*
// @namespace		littleendu.xyz
// @updateURL		https://github.com/osuplace/templateManager/raw/main/dist/templateManager.user.js
// @downloadURL		https://github.com/osuplace/templateManager/raw/main/dist/templateManager.user.js
//
// Created with love using Gorilla
// ==/UserScript==

(function () {
    'use strict';

    const MAX_TEMPLATES = 100;
    const CACHE_BUST_PERIOD = 1000 * 60 * 2;
    const UPDATE_PERIOD_MILLIS = 100;
    const SECONDS_SPENT_BLINKING = 5;
    const AMOUNT_OF_BLINKING = 11;
    const ANIMATION_DEFAULT_PERCENTAGE = 1 / 3;

    function run() {
        let reticuleStyleSetter = setInterval(() => {
            var _a, _b;
            let embed = document.querySelector("mona-lisa-embed");
            let camera = (_a = embed === null || embed === void 0 ? void 0 : embed.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector("mona-lisa-camera");
            let preview = camera === null || camera === void 0 ? void 0 : camera.querySelector("mona-lisa-pixel-preview");
            if (preview) {
                clearInterval(reticuleStyleSetter);
                let style = document.createElement('style');
                style.innerHTML = '.pixel { clip-path: polygon(-20% -20%, 120% -20%, 120% 20%, 63% 20%, 63% 37%, 37% 37%, 37% 20%, 20% 20%, 20% 37%, 37% 37%, 37% 63%, 20% 63%, 20% 80%, 37% 80%, 37% 63%, 63% 63%, 63% 80%, 80% 80%, 80% 63%, 63% 63%, 63% 37%, 80% 37%, 80% 20%, 120% 20%, 120% 120%, -20% 120%);}';
                console.log(preview);
                (_b = preview === null || preview === void 0 ? void 0 : preview.shadowRoot) === null || _b === void 0 ? void 0 : _b.appendChild(style);
            }
        }, UPDATE_PERIOD_MILLIS);
    }

    function negativeSafeModulo(a, b) {
        return (a % b + b) % b;
    }
    function getFileStemFromUrl(url) {
        const lastSlashIndex = url.lastIndexOf('/');
        const fileName = url.slice(lastSlashIndex + 1);
        const lastDotIndex = fileName.lastIndexOf('.');
        const fileStem = (lastDotIndex === -1) ? fileName : fileName.slice(0, lastDotIndex);
        return fileStem;
    }
    function windowIsEmbedded() {
        return window.top !== window.self;
    }
    async function sleep(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    function stringToHtml(str) {
        let div = document.createElement('div');
        div.innerHTML = str;
        return div.firstChild;
    }
    function wrapInHtml(html, str) {
        let tag = document.createElement(html);
        tag.innerText = str;
        return tag;
    }
    function removeItem(array, item) {
        let index = array.indexOf(item);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }

    function extractFrame(image, frameWidth, frameHeight, frameIndex) {
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        if (!context)
            return null;
        let gridWidth = Math.round(image.naturalWidth / frameWidth);
        let gridX = frameIndex % gridWidth;
        let gridY = Math.floor(frameIndex / gridWidth);
        context.drawImage(image, gridX * frameWidth, gridY * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        return context.getImageData(0, 0, frameWidth, frameHeight);
    }
    function ditherData(imageData, randomness, percentage, x, y, frameWidth, frameHeight) {
        let rv = new ImageData(frameWidth * 3, frameHeight * 3);
        let m = Math.round(1 / percentage); // which nth pixel should be displayed
        let r = Math.floor(randomness * m); // which nth pixel am I (everyone has different nth pixel)
        for (let i = 0; i < frameWidth; i++) {
            for (let j = 0; j < frameHeight; j++) {
                let imageIndex = (j * frameWidth + i) * 4;
                let middlePixelIndex = ((j * 3 + 1) * rv.width + i * 3 + 1) * 4;
                let alpha = imageData.data[imageIndex + 3];
                let p = percentage > 0.99 ? 1 : Math.ceil(m / (alpha / 200));
                if (negativeSafeModulo(i + x + (j + y) * 2 + r, p) !== 0) {
                    continue;
                }
                rv.data[middlePixelIndex] = imageData.data[imageIndex];
                rv.data[middlePixelIndex + 1] = imageData.data[imageIndex + 1];
                rv.data[middlePixelIndex + 2] = imageData.data[imageIndex + 2];
                rv.data[middlePixelIndex + 3] = alpha > 2 ? 255 : 0;
            }
        }
        return rv;
    }

    class Template {
        constructor(params, contact, globalCanvas, priority) {
            this.imageLoader = new Image();
            this.canvasElement = document.createElement('canvas');
            this.loading = false;
            // assign params
            this.name = params.name;
            this.sources = params.sources;
            this.x = params.x;
            this.y = params.y;
            this.frameWidth = params.frameWidth;
            this.frameHeight = params.frameHeight;
            this.frameCount = params.frameCount || 1;
            this.frameSpeed = params.frameRate || params.frameSpeed || Infinity;
            this.startTime = params.startTime || 0;
            this.looping = params.looping || this.frameCount > 1;
            // assign from arguments
            this.globalCanvas = globalCanvas;
            this.priority = priority;
            //calulate from consts
            let period = SECONDS_SPENT_BLINKING * 1000 / AMOUNT_OF_BLINKING;
            this.blinkingPeriodMillis = Math.floor(period / UPDATE_PERIOD_MILLIS) * UPDATE_PERIOD_MILLIS;
            this.animationDuration = (this.frameCount * this.frameSpeed);
            // initialize image loader
            // set image loader style
            this.imageLoader.style.position = 'absolute';
            this.imageLoader.style.top = '0';
            this.imageLoader.style.left = '0';
            this.imageLoader.style.width = '1px';
            this.imageLoader.style.height = '1px';
            this.imageLoader.style.opacity = `${Number.MIN_VALUE}`;
            this.imageLoader.style.pointerEvents = 'none';
            document.body.appendChild(this.imageLoader); // firefox doesn't seem to load images outside of DOM
            // set image loader event listeners
            this.imageLoader.addEventListener('load', () => {
                if (!this.frameWidth || !this.frameHeight) {
                    this.frameWidth = this.imageLoader.naturalWidth;
                    this.frameHeight = this.imageLoader.naturalHeight;
                }
                if (!this.name) {
                    this.name = getFileStemFromUrl(this.imageLoader.src);
                }
                this.initCanvas();
                this.loading = false;
            });
            this.imageLoader.addEventListener('error', () => {
                this.loading = false;
                // assume loading from this source fails
                this.sources.shift();
            });
            // add contact info container
            if (contact) {
                this.contactElement = document.createElement('div');
                this.contactElement.style.fontWeight = "bold";
                this.contactElement.style.fontSize = "1px";
                this.contactElement.style.fontFamily = "serif"; // this fixes firefox
                this.contactElement.style.color = "#eee";
                this.contactElement.style.backgroundColor = "#111";
                this.contactElement.style.padding = "1px";
                this.contactElement.style.borderRadius = "1px";
                this.contactElement.style.opacity = "0";
                this.contactElement.style.transition = "opacity 500ms, width 200ms, height 200ms";
                this.contactElement.style.position = "absolute";
                this.contactElement.style.left = `${this.x}px`;
                this.contactElement.style.top = `${this.y}px`;
                this.contactElement.style.pointerEvents = "none";
                this.contactElement.setAttribute('priority', Math.round(Number.MIN_SAFE_INTEGER / 100 + priority).toString());
                this.contactElement.className = 'iHasContactInfo';
                if (params.name) {
                    this.contactElement.appendChild(document.createTextNode(params.name));
                    this.contactElement.appendChild(document.createElement('br'));
                    this.contactElement.appendChild(document.createTextNode(`contact: `));
                }
                this.contactElement.appendChild(document.createTextNode(contact));
                globalCanvas.parentElement.appendChild(this.contactElement);
            }
        }
        tryLoadSource() {
            if (this.loading)
                return;
            if (this.sources.length === 0)
                return;
            this.loading = true;
            let candidateSource = this.sources[0];
            let displayName = this.name ? this.name + ': ' : '';
            console.log(`${displayName}trying to load ${candidateSource}`);
            GM.xmlHttpRequest({
                method: 'GET',
                url: candidateSource,
                responseType: 'blob',
                onload: (response) => {
                    this.imageLoader.src = URL.createObjectURL(response.response);
                }
            });
        }
        getCurrentFrameIndex(currentSeconds) {
            if (!this.looping && this.startTime + this.frameCount * this.frameSpeed < currentSeconds)
                return this.frameCount - 1;
            return negativeSafeModulo(Math.floor((currentSeconds - this.startTime) / this.frameSpeed), this.frameCount);
        }
        initCanvas() {
            this.canvasElement.style.position = 'absolute';
            this.canvasElement.style.top = `${this.y}px`;
            this.canvasElement.style.left = `${this.x}px`;
            this.canvasElement.style.width = `${this.frameWidth}px`;
            this.canvasElement.style.height = `${this.frameHeight}px`;
            this.canvasElement.style.pointerEvents = 'none';
            this.canvasElement.style.imageRendering = 'pixelated';
            this.canvasElement.setAttribute('priority', this.priority.toString());
            // find others and append to correct position
            let templateElements = this.globalCanvas.parentElement.children;
            let templateElementsArray = Array.from(templateElements).filter(element => element.hasAttribute('priority'));
            if (templateElementsArray.length === 0) {
                this.globalCanvas.parentElement.appendChild(this.canvasElement);
            }
            else {
                // add the new template element to the array
                templateElementsArray.push(this.canvasElement);
                // sort the array by priority
                templateElementsArray.sort((a, b) => parseInt(b.getAttribute('priority')) - parseInt(a.getAttribute('priority')));
                // find the index of the new template element in the sorted array
                let index = templateElementsArray.findIndex(element => element === this.canvasElement);
                // insert the new template element at the index
                if (index === templateElementsArray.length - 1) {
                    this.globalCanvas.parentElement.appendChild(this.canvasElement);
                }
                else {
                    this.globalCanvas.parentElement.insertBefore(this.canvasElement, templateElementsArray[index + 1]);
                }
            }
        }
        frameStartTime(n = null) {
            return (this.startTime + (n || this.currentFrame || 0) * this.frameSpeed) % this.animationDuration;
        }
        updateStyle() {
            // for canvas games where the canvas itself has css applied
            let globalRatio = parseFloat(this.globalCanvas.style.width) / this.globalCanvas.width;
            this.canvasElement.style.width = `${this.frameWidth * globalRatio}px`;
            this.canvasElement.style.height = `${this.frameHeight * globalRatio}px`;
            this.canvasElement.style.left = `${this.x * globalRatio}px`;
            this.canvasElement.style.top = `${this.y * globalRatio}px`;
        }
        update(percentage, randomness, currentSeconds) {
            var _a;
            this.updateStyle();
            // return if the animation is finished
            if (!this.looping && currentSeconds > this.startTime + this.frameSpeed * this.frameCount) {
                return;
            }
            // return if image isn't loaded yet
            if (!this.imageLoader.complete || !this.imageLoader.src) {
                this.tryLoadSource();
                return;
            }
            // return if canvas not initialized (works because last step of canvas initialization is inserting it to DOM)
            if (!this.canvasElement.isConnected) {
                return;
            }
            // set percentage for animated
            let frameIndex = this.getCurrentFrameIndex(currentSeconds);
            if (this.frameCount > 1 && this.frameSpeed > 30) {
                let framePast = currentSeconds % this.animationDuration - this.frameStartTime(frameIndex);
                let framePercentage = framePast / this.frameSpeed;
                if (framePercentage < 0.5) {
                    percentage *= ANIMATION_DEFAULT_PERCENTAGE;
                }
            }
            // update canvas if necessary
            if (this.currentFrame !== frameIndex || this.currentPercentage !== percentage || this.currentRandomness !== randomness) {
                let frameData = extractFrame(this.imageLoader, this.frameWidth, this.frameHeight, frameIndex);
                if (!frameData)
                    return;
                let ditheredData = ditherData(frameData, randomness, percentage, this.x, this.y, this.frameWidth, this.frameHeight);
                this.canvasElement.width = ditheredData.width;
                this.canvasElement.height = ditheredData.height;
                (_a = this.canvasElement.getContext('2d')) === null || _a === void 0 ? void 0 : _a.putImageData(ditheredData, 0, 0);
            }
            // update done
            this.currentPercentage = percentage;
            this.currentFrame = frameIndex;
            this.currentRandomness = randomness;
            this.blinking(currentSeconds);
        }
        blinking(currentSeconds) {
            // return if no blinking needed
            if (this.frameSpeed === Infinity || this.frameSpeed < 30 || this.frameCount === 1)
                return;
            let frameEndTime = this.frameStartTime() + this.frameSpeed;
            let blinkTime = (currentSeconds % this.animationDuration) + (AMOUNT_OF_BLINKING * this.blinkingPeriodMillis / 1000);
            if (blinkTime > frameEndTime) {
                let blinkDiff = blinkTime - frameEndTime;
                this.canvasElement.style.opacity = Math.floor(blinkDiff / (this.blinkingPeriodMillis / 1000)) % 2 === 0 ? '0' : '1';
            }
            else {
                this.canvasElement.style.opacity = '1';
            }
        }
        destroy() {
            var _a, _b, _c, _d;
            (_a = this.imageLoader.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(this.imageLoader);
            this.imageLoader = new Image();
            (_b = this.canvasElement.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(this.canvasElement);
            this.canvasElement = document.createElement('canvas');
            (_d = (_c = this.contactElement) === null || _c === void 0 ? void 0 : _c.parentElement) === null || _d === void 0 ? void 0 : _d.removeChild(this.contactElement);
            this.contactElement = undefined;
        }
        async fakeReload(time) {
            this.canvasElement.style.opacity = '0';
            await sleep(300 + time);
            this.canvasElement.style.opacity = '1';
        }
    }

    class NotificationManager {
        constructor() {
            this.container = document.createElement('div');
            this.container.style.width = '150px';
            this.container.style.height = '66%';
            this.container.style.position = 'absolute';
            this.container.style.zIndex = '9999';
            this.container.style.top = '-0.1px';
            this.container.style.right = '0px';
            this.container.style.backgroundColor = 'rgba(255, 255, 255, 0)';
            this.container.style.pointerEvents = 'none';
            this.container.style.userSelect = 'none';
            document.body.appendChild(this.container);
        }
        newNotification(url, message) {
            let div = document.createElement('div');
            div.appendChild(document.createTextNode(`${url} says:`));
            div.append(document.createElement('br'));
            div.append(wrapInHtml('b', message));
            div.style.height = '0px';
            div.style.width = '100%';
            div.style.opacity = '0';
            div.style.padding = '0px';
            div.style.margin = '0px';
            div.style.borderRadius = '8px';
            div.style.backgroundColor = '#621';
            div.style.color = '#eee';
            div.style.transition = "height 300ms, opacity 300ms, padding 300ms, margin 300ms";
            div.style.overflow = 'hidden';
            div.style.pointerEvents = 'auto';
            div.onclick = () => {
                div.style.opacity = '0';
                div.style.height = '0px';
                div.style.padding = '0px';
                div.style.margin = '0px';
                setTimeout(() => div.remove(), 500);
            };
            this.container.appendChild(div);
            setTimeout(() => {
                div.style.opacity = '1';
                div.style.height = 'auto';
                div.style.padding = '8px';
                div.style.margin = '8px';
            }, 100);
        }
    }

    class TemplateManager {
        constructor(canvasElement, startingUrl) {
            this.templatesToLoad = MAX_TEMPLATES;
            this.alreadyLoaded = new Array();
            this.websockets = new Array();
            this.notificationTypes = new Map();
            this.enabledNotifications = new Array();
            this.whitelist = new Array();
            this.blacklist = new Array();
            this.templates = new Array();
            this.responseDiffs = new Array();
            this.randomness = Math.random();
            this.percentage = 1;
            this.lastCacheBust = this.getCacheBustString();
            this.notificationManager = new NotificationManager();
            this.canvasElement = canvasElement;
            this.startingUrl = startingUrl;
            this.loadTemplatesFromJsonURL(startingUrl);
            window.addEventListener('keydown', (ev) => {
                if (ev.key.match(/^\d$/)) {
                    let number = parseInt(ev.key) || 1.1;
                    this.percentage = 1 / number;
                }
            });
            GM.getValue(`${window.location.host}_notificationsEnabled`, "[]").then((value) => {
                this.enabledNotifications = JSON.parse(value);
            });
        }
        getCacheBustString() {
            return Math.floor(Date.now() / CACHE_BUST_PERIOD).toString(36);
        }
        loadTemplatesFromJsonURL(url, minPriority = 0) {
            let _url = new URL(url);
            let uniqueString = `${_url.origin}${_url.pathname}`;
            // exit if already loaded
            // exit if blacklisted
            if (this.alreadyLoaded.includes(uniqueString) || this.blacklist.includes(uniqueString))
                return;
            this.alreadyLoaded.push(uniqueString);
            console.log(`loading template from ${_url}`);
            // do some cache busting
            this.lastCacheBust = this.getCacheBustString();
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
                    let json = JSON.parse(response.responseText);
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
                        this.connectToWebSocket(json.notifications);
                    }
                }
            });
        }
        connectToWebSocket(server) {
            console.log("trying to connect to websocket at ", server.url);
            let client = new WebSocket(server.url);
            this.notificationTypes.set(server.url, server.types);
            client.addEventListener('open', (_) => {
                console.log("successfully connected to ", server.url);
                this.websockets.push(client);
            });
            client.addEventListener('message', async (ev) => {
                console.log("received message from ", server, ev);
                console.log(await ev.data.text());
                let key = await ev.data.text();
                let notification = server.types.find((t) => t.key === key);
                if (notification && this.enabledNotifications.includes(`${server.url}??${key}`)) {
                    this.notificationManager.newNotification(server.url, notification.message);
                }
            });
            client.addEventListener('close', (_) => {
                removeItem(this.websockets, client);
                setTimeout(() => {
                    this.connectToWebSocket(server);
                }, 1000 * 60);
            });
            client.addEventListener('error', (_) => {
                client.close();
            });
        }
        canReload() {
            return this.lastCacheBust !== this.getCacheBustString();
        }
        reload() {
            var _a, _b;
            if (!this.canReload()) {
                // fake a reload
                for (let i = 0; i < this.templates.length; i++) {
                    this.templates[i].fakeReload(i * 50);
                }
                return;
            }
            // reload the templates
            // reloading only the json is not possible because it's user input and not uniquely identifiable
            // so everything is reloaded as if the template manager was just initialized
            while (this.templates.length) {
                (_a = this.templates.shift()) === null || _a === void 0 ? void 0 : _a.destroy();
            }
            while (this.websockets.length) {
                (_b = this.websockets.shift()) === null || _b === void 0 ? void 0 : _b.close();
            }
            this.templates = [];
            this.websockets = [];
            this.alreadyLoaded = [];
            this.whitelist = [];
            this.blacklist = [];
            this.loadTemplatesFromJsonURL(this.startingUrl);
        }
        currentSeconds() {
            let averageDiff = this.responseDiffs.reduce((a, b) => a + b, 0) / (this.responseDiffs.length);
            return (Date.now() + averageDiff) / 1000;
        }
        update() {
            let cs = this.currentSeconds();
            for (let i = 0; i < this.templates.length; i++)
                this.templates[i].update(this.percentage, this.randomness, cs);
            if (this.templates.length < this.templatesToLoad) {
                for (let i = 0; i < this.whitelist.length; i++) {
                    // yes this calls all whitelist all the time but the load will cancel if already loaded
                    this.loadTemplatesFromJsonURL(this.whitelist[i], i * this.templatesToLoad);
                }
            }
        }
    }

    function createButton(text, callback) {
        let button = document.createElement("button");
        button.innerText = text;
        button.onclick = () => callback();
        button.style.color = "#eee";
        button.style.backgroundColor = "#19d";
        button.style.padding = "5px";
        button.style.borderRadius = "5px";
        return button;
    }
    function createSlider(Text, value, callback) {
        let div = document.createElement("div");
        div.style.backgroundColor = "#057";
        div.style.padding = "5px";
        div.style.borderRadius = "5px";
        let slider = document.createElement("input");
        slider.type = "range";
        slider.min = '0';
        slider.max = '100';
        slider.step = '1';
        slider.value = value;
        slider.oninput = (ev) => {
            ev.preventDefault();
            callback(parseInt(slider.value));
        };
        slider.style.width = "100%";
        let label = document.createElement("label");
        label.innerText = Text;
        label.style.color = "#eee";
        div.append(label);
        div.appendChild(document.createElement("br"));
        div.append(slider);
        return div;
    }
    function createBoldCheckbox(boldText, regularText, checked, callback) {
        let div = document.createElement("div");
        div.style.backgroundColor = "#057";
        div.style.padding = "5px";
        div.style.borderRadius = "5px";
        let checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.checked = checked;
        checkbox.oninput = (ev) => {
            ev.preventDefault();
            callback(checkbox.checked);
        };
        let label = document.createElement("label");
        let b = document.createElement("b");
        b.innerText = boldText;
        label.append(b);
        label.append(document.createTextNode(regularText));
        label.style.color = "#eee";
        div.append(checkbox);
        div.append(label);
        return div;
    }
    class Settings {
        constructor(manager) {
            this.div = document.createElement("div");
            this.checkboxes = document.createElement("div");
            this.manager = manager;
            document.body.appendChild(this.div);
            this.div.style.transition = "opacity 300ms";
            this.div.style.width = "100vw";
            this.div.style.height = "100vh";
            this.div.style.position = "absolute";
            this.div.style.left = "-0.1px";
            this.div.style.top = "-0.1px";
            this.div.style.backgroundColor = "rgba(0, 0, 0, 0.2)";
            this.div.style.padding = "0";
            this.div.style.margin = "0";
            this.div.style.opacity = "0";
            this.div.style.pointerEvents = "none";
            this.div.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
            this.div.style.textAlign = "center";
            this.div.style.userSelect = "none";
            this.div.onclick = (ev) => {
                if (ev.target === ev.currentTarget)
                    this.close();
            };
            window.addEventListener("keydown", (ev) => {
                if (ev.key === "Escape") {
                    this.close();
                }
            });
            this.div.appendChild(document.createElement('br'));
            let label = document.createElement("label");
            label.textContent = ".json Template settings";
            label.style.textShadow = "-1px -1px 1px #111, 1px 1px 1px #111, -1px 1px 1px #111, 1px -1px 1px #111";
            label.style.color = "#eee";
            this.div.appendChild(label);
            this.div.appendChild(document.createElement('br'));
            this.div.appendChild(createButton("Reload the template", () => manager.reload()));
            this.div.appendChild(document.createElement('br'));
            this.div.appendChild(createSlider("Templates to load", "4", (n) => {
                manager.templatesToLoad = (n + 1) * MAX_TEMPLATES / 5;
            }));
            this.div.appendChild(document.createElement('br'));
            this.div.appendChild(createButton("Generate new randomness", () => {
                let currentRandomness = manager.randomness;
                while (true) {
                    manager.randomness = Math.random();
                    if (Math.abs(currentRandomness - manager.randomness) > 1 / 3)
                        break;
                }
            }));
            this.div.appendChild(document.createElement('br'));
            this.div.appendChild(createSlider("Dither amount", "1", (n) => {
                manager.percentage = 1 / (n / 10 + 1);
            }));
            this.div.appendChild(document.createElement('br'));
            this.div.appendChild(createBoldCheckbox('', "Show contact info besides templates", false, (a) => {
                document.querySelectorAll('.iHasContactInfo').forEach((i) => {
                    console.log(i);
                    i.style.opacity = a ? "1" : "0";
                });
            }));
            this.div.appendChild(document.createElement('br'));
            this.checkboxes.style.backgroundColor = "rgba(0,0,0,0.5)";
            this.checkboxes.style.padding = "8px";
            this.checkboxes.style.borderRadius = "8px";
            this.div.appendChild(this.checkboxes);
            for (let c = 0; c < this.div.children.length; c++) {
                let child = this.div.children[c];
                child.style.margin = "8px 40%";
            }
        }
        open() {
            this.div.style.opacity = "1";
            this.div.style.pointerEvents = "auto";
            this.populateNotifications();
        }
        close() {
            this.div.style.opacity = "0";
            this.div.style.pointerEvents = "none";
        }
        toggle() {
            if (this.div.style.pointerEvents === "none") {
                this.open();
            }
            else {
                this.close();
            }
        }
        populateNotifications() {
            while (this.checkboxes.children.length) {
                this.checkboxes.children[0].remove();
            }
            let keys = this.manager.notificationTypes.keys();
            let key;
            while (!(key = keys.next()).done) {
                let value = key.value;
                let label = document.createElement("label");
                label.textContent = value;
                label.style.textShadow = "-1px -1px 1px #111, 1px 1px 1px #111, -1px 1px 1px #111, 1px -1px 1px #111";
                label.style.color = "#eee";
                this.checkboxes.appendChild(label);
                let notifications = this.manager.notificationTypes.get(value);
                if (notifications === null || notifications === void 0 ? void 0 : notifications.length) {
                    for (let i = 0; i < notifications.length; i++) {
                        let notification = notifications[i];
                        let enabled = this.manager.enabledNotifications.includes(`${value}??${notification.key}`);
                        let checkbox = createBoldCheckbox(notification.key + " - ", notification.message, enabled, async (b) => {
                            removeItem(this.manager.enabledNotifications, `${value}??${notification.key}`);
                            if (b) {
                                this.manager.enabledNotifications.push(`${value}??${notification.key}`);
                            }
                            let enabledKey = `${window.location.host}_notificationsEnabled`;
                            await GM.setValue(enabledKey, JSON.stringify(this.manager.enabledNotifications));
                        });
                        this.checkboxes.append(document.createElement('br'));
                        this.checkboxes.append(checkbox);
                    }
                }
                this.checkboxes.append(document.createElement('br'));
            }
        }
    }

    let SLIDERS_SVG = '<button><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 416c0-17.7 14.3-32 32-32l54.7 0c12.3-28.3 40.5-48 73.3-48s61 19.7 73.3 48L480 384c17.7 0 32 14.3 32 32s-14.3 32-32 32l-246.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 448c-17.7 0-32-14.3-32-32zm192 0a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM384 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm-32-80c32.8 0 61 19.7 73.3 48l54.7 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-54.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l246.7 0c12.3-28.3 40.5-48 73.3-48zM192 64a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm73.3 0L480 64c17.7 0 32 14.3 32 32s-14.3 32-32 32l-214.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 128C14.3 128 0 113.7 0 96S14.3 64 32 64l86.7 0C131 35.7 159.2 16 192 16s61 19.7 73.3 48z"/></svg></button>';
    async function init(manager) {
        let settings = new Settings(manager);
        let xKey = `${window.location.host}_settingsX`;
        let yKey = `${window.location.host}_settingsY`;
        let GMx = await GM.getValue(xKey, null) || 10;
        let GMy = await GM.getValue(yKey, null) || 10;
        let iconElement = stringToHtml(SLIDERS_SVG);
        document.body.append(iconElement);
        let setPosition = async (mouseX, mouseY) => {
            let xMin = 16 / window.innerWidth * 100;
            let yMin = 16 / window.innerHeight * 100;
            let x = (mouseX) / window.innerWidth * 100;
            let y = (mouseY) / window.innerHeight * 100;
            await GM.setValue(xKey, x);
            await GM.setValue(yKey, y);
            if (x < 50) {
                x = Math.max(xMin, x - xMin);
                iconElement.style.left = `${x}vw`;
                iconElement.style.right = 'unset';
            }
            else {
                x = Math.max(xMin, 100 - x - xMin);
                iconElement.style.right = `${x}vw`;
                iconElement.style.left = 'unset';
            }
            if (y < 50) {
                y = Math.max(yMin, y - yMin);
                iconElement.style.top = `${y}vh`;
                iconElement.style.bottom = 'unset';
            }
            else {
                y = Math.max(yMin, 100 - y - yMin);
                iconElement.style.bottom = `${y}vh`;
                iconElement.style.top = 'unset';
            }
        };
        await setPosition(GMx / 100 * window.innerWidth, GMy / 100 * window.innerHeight);
        iconElement.style.position = 'absolute';
        iconElement.style.width = "32px";
        iconElement.style.height = "32px";
        iconElement.style.backgroundColor = '#fff';
        iconElement.style.padding = "5px";
        iconElement.style.borderRadius = "5px";
        iconElement.style.zIndex = `${Number.MAX_SAFE_INTEGER - 1}`;
        iconElement.style.cursor = "pointer";
        let clicked = false;
        let dragged = false;
        iconElement.addEventListener('mousedown', (ev) => {
            if (ev.button === 0) {
                clicked = true;
                ev.preventDefault(); // prevent text from getting selected
            }
        });
        iconElement.addEventListener('mouseleave', (ev) => {
            if (clicked) {
                dragged = true;
            }
        });
        window.addEventListener('mouseup', (ev) => {
            if (ev.button === 0) {
                if (clicked && !dragged) {
                    settings.toggle();
                }
                clicked = false;
                dragged = false;
            }
        });
        window.addEventListener('mousemove', (ev) => {
            if (dragged) {
                setPosition(ev.clientX, ev.clientY);
            }
        });
    }

    let jsontemplate;
    let canvasElement;
    function findCanvas(element) {
        if (element instanceof HTMLCanvasElement) {
            console.log('found canvas', element, window.location.href);
            if (!canvasElement) {
                canvasElement = element;
            }
            else if (element.width * element.height > canvasElement.width * canvasElement.height) {
                canvasElement = element;
            }
        }
        // find in Shadow DOM elements
        if (element instanceof HTMLElement && element.shadowRoot) {
            findCanvas(element.shadowRoot);
        }
        // find in children
        for (let c = 0; c < element.children.length; c++) {
            findCanvas(element.children[c]);
        }
    }
    function findParams(urlString) {
        const urlSearchParams = new URLSearchParams(urlString);
        const params = Object.fromEntries(urlSearchParams.entries());
        console.log(params);
        return params.jsontemplate ? params.jsontemplate : null;
    }
    function topWindow() {
        console.log("top window code for", window.location.href);
        GM.setValue('canvasFound', false);
        let params = findParams(window.location.hash.substring(1)) || findParams(window.location.search.substring(1));
        if (params) {
            jsontemplate = params;
            GM.setValue('jsontemplate', jsontemplate);
        }
    }
    async function canvasWindow() {
        console.log("canvas code for", window.location.href);
        let sleep$1 = 0;
        while (!canvasElement) {
            if (await GM.getValue('canvasFound', false) && !windowIsEmbedded()) {
                console.log('canvas found by iframe');
                return;
            }
            await sleep(1000 * sleep$1);
            sleep$1++;
            console.log("trying to find canvas");
            findCanvas(document.documentElement);
        }
        GM.setValue('canvasFound', true);
        sleep$1 = 0;
        while (true) {
            if (jsontemplate) {
                runCanvas(jsontemplate, canvasElement);
                break;
            }
            else if (windowIsEmbedded()) {
                jsontemplate = (await GM.getValue('jsontemplate', ''));
            }
            await sleep(1000 * sleep$1);
            sleep$1++;
        }
    }
    function runCanvas(jsontemplate, canvasElement) {
        let manager = new TemplateManager(canvasElement, jsontemplate);
        init(manager);
        window.setInterval(() => {
            manager.update();
        }, UPDATE_PERIOD_MILLIS);
        GM.setValue('jsontemplate', '');
    }
    console.log(`running templating script in ${window.location.href}`);
    if (!windowIsEmbedded()) {
        // we are the top window
        topWindow();
    }
    canvasWindow();
    let __url = new URL(window.location.href);
    if (__url.origin.endsWith('reddit.com')) {
        run();
    }

})();
