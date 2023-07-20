
// ==UserScript==
// @namespace		littleendu.xyz
// @downloadURL		https://github.com/osuplace/templateManager/raw/main/dist/templateManager.user.js
// @updateURL		https://github.com/osuplace/templateManager/raw/main/dist/templateManager.user.js
// @match			https://pxls.space/
// @match			https://new.reddit.com/r/place/*
// @match			https://www.reddit.com/r/place/*
// @match			https://garlic-bread.reddit.com/embed*
// @match			https://hot-potato.reddit.com/embed*
// @match			https://www.twitch.tv/otknetwork/*
// @match			https://9jjigdr1wlul7fbginbq7h76jg9h3s.ext-twitch.tv/*
// @match			https://place.ludwig.gg/*
// @grant			GM.xmlHttpRequest
// @grant			GM.setValue
// @grant			GM.getValue
// @connect			*
// @name			template-manager
// @version			0.6.0
// @description		Manages your templates on various canvas games
// @author			LittleEndu, Mikarific, April
// @license			MIT
//
// Created with love using Gorilla
// ==/UserScript==

(function () {
    'use strict';

    const css = (x) => x;
    const MAX_TEMPLATES = 100;
    const CACHE_BUST_PERIOD = 1000 * 60 * 2;
    const UPDATE_PERIOD_MILLIS = 100;
    const TEMPLATE_RELOAD_INTERVAL = 1000 * 60 * 5;
    const SECONDS_SPENT_BLINKING = 5;
    const AMOUNT_OF_BLINKING = 11;
    const ANIMATION_DEFAULT_PERCENTAGE = 1 / 3;
    const NO_JSON_TEMPLATE_IN_PARAMS = "no_json_template";
    const CONTACT_INFO_CSS = css `
    div.iHasContactInfo {
        max-width: 30px; 
        padding: 1px;
        font-size: 1px; /* these 3 will be overwritten, but oh well */
        width: max-content; 
        white-space: nowrap;
        overflow: hidden;
        font-weight: bold;
        font-family: serif; /* this fixes firefox */
        color: #eee;
        background-color: #111;
        opacity: 0;
        transition: opacity 500ms, width 200ms, height 200ms, max-width 200ms;
        position: absolute;
        pointer-events: none;
        z-index: 9999999;
    }

    div.iHasContactInfo:hover {
        z-index: 99999999;
        max-width: 100%;
        width: auto;
    }
`;
    const GLOBAL_CSS = css `
    #osuplaceNotificationContainer {
        width: 200px;
        height: 66%;
        position: absolute;
        z-index: 9999;
        top: -0.1px;
        right: 10px;
        background-color: rgba(255, 255, 255, 0);
        pointer-events: none;
        user-select: none;
    }

    .osuplaceNotification {
        border-radius: 8px;
        background-color: #621;
        color: #eee;
        transition: height 300ms, opacity 300ms, padding 300ms, margin 300ms;
        overflow: hidden;
        pointer-events: auto;
        cursor: pointer;
        word-wrap: break-word;
        height: 0px;
        opacity: 0;
        padding: 0px;
        margin: 0px;
    }

    .osuplaceNotification.visible { 
        height: auto;
        opacity: 1;
        padding: 8px;
        margin: 8px;
    }

    #settingsOverlay {
        transition: opacity 300ms ease 0s;
        width: 100vw;
        height: 100vh;
        position: absolute;
        left: -0.1px;
        top: -0.1px;
        background-color: rgba(0, 0, 0, 0.25);
        padding: 0px;
        margin: 0px;
        opacity: 0;
        pointer-events: none;
        z-index: 2147483647;
        text-align: center;
        user-select: none;
        overflow-y: auto;
        font-size: 14px;
    }
`;
    const SETTINGS_CSS = css `
    label,
    button{
        height: auto;
        white-space: normal;
        word-break: break-word;
        text-shadow: -1px -1px 1px #111, 1px 1px 1px #111, -1px 1px 1px #111, 1px -1px 1px #111;
        color: #eee;
    }

    input {
        width: auto;
        max-width: 100%;
        height: auto;
        color: #eee;
        background-color: #111;
        -webkit-appearance: auto;
        border-radius: 5px;
        font-size: 14px;
    }

    .settingsWrapper {
        background-color: rgba(0, 0, 0, 0.5);
        padding: 8px;
        border-radius: 8px;
        border: 1px solid rgba(238, 238, 238, 0.5);
        margin: 0.5rem auto 0.5rem auto;
        min-width: 13rem;
        max-width: 20%;
    }

    #templateLinksWrapper button{
        word-break: break-all;
        cursor: pointer;
    }

    .settingsWrapper:empty {
        display: none;
    }

    .settingsButton {
        cursor: pointer;
        display: inline-block;
        color: rgb(238, 238, 238);
        background-color: rgba(0, 0, 0, 0.5);
        padding: 0.25rem 0.5rem;
        margin: 0.5rem;
        border-radius: 5px;
        line-height: 1.1em;
        border: 1px solid rgba(238, 238, 238, 0.5);
    }

    .settingsButton:hover {
        background-color: rgba(64, 64, 64, 0.5);
    }

    .settingsSliderBox, .settingsCheckbox {
        background-color: rgba(0, 0, 0, 0.5);
        padding: 0.25rem 0.5rem;
        border-radius: 5px;
        margin: 0.5rem;
    }

    .templateLink:hover {
        background-color: rgba(128, 0, 0, 0.5);
    }
`;

    function run() {
        let reticuleStyleSetter = setInterval(() => {
            var _a, _b;
            let embed = document.querySelector('garlic-bread-embed');
            let preview = (_a = embed === null || embed === void 0 ? void 0 : embed.shadowRoot) === null || _a === void 0 ? void 0 : _a.querySelector('garlic-bread-pixel-preview');
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
    function findJSONTemplateInParams(urlString) {
        const urlSearchParams = new URLSearchParams(urlString);
        const params = Object.fromEntries(urlSearchParams.entries());
        console.log(params);
        return params.jsontemplate ? params.jsontemplate : null;
    }
    function findJSONTemplateInURL(url) {
        return findJSONTemplateInParams(url.hash.substring(1)) || findJSONTemplateInParams(url.search.substring(1));
    }
    function findElementOfType(element, type) {
        let rv = [];
        if (element instanceof type) {
            console.log('found canvas', element, window.location.href);
            rv.push(element);
        }
        // find in Shadow DOM elements
        if (element instanceof HTMLElement && element.shadowRoot) {
            rv.push(...findElementOfType(element.shadowRoot, type));
        }
        // find in children
        for (let c = 0; c < element.children.length; c++) {
            rv.push(...findElementOfType(element.children[c], type));
        }
        return rv;
    }

    const ALPHA_THRESHOLD = 2;
    function extractFrame(image, frameWidth, frameHeight, frameIndex) {
        let canvas = document.createElement('canvas');
        canvas.width = frameWidth;
        canvas.height = frameHeight;
        let context = canvas.getContext('2d');
        if (!context)
            return null;
        let gridWidth = Math.round(image.naturalWidth / frameWidth);
        let gridX = frameIndex % gridWidth;
        let gridY = Math.floor(frameIndex / gridWidth);
        context.drawImage(image, gridX * frameWidth, gridY * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        return context.getImageData(0, 0, frameWidth, frameHeight);
    }
    function getHighestRGBA(datas, x, y) {
        let lastData = datas[datas.length - 1];
        for (let i = 0; i < datas.length; i++) {
            let img = datas[i];
            let xx = x + img.x;
            let yy = y + img.y;
            if (xx < 0 || xx >= img.imagedata.width || yy < 0 || yy >= img.imagedata.height)
                continue;
            let index = (yy * img.imagedata.width + xx) * 4;
            let lastIndex = (y * lastData.imagedata.width + x) * 4;
            if (img.imagedata.data[index + 3] > ALPHA_THRESHOLD && lastData.imagedata.data[lastIndex + 3] > ALPHA_THRESHOLD) {
                return { r: img.imagedata.data[index], g: img.imagedata.data[index + 1], b: img.imagedata.data[index + 2], a: img.imagedata.data[index + 3] };
            }
        }
        return { r: 0, g: 0, b: 0, a: 0 };
    }
    function ditherData(imageDatas, priorityData, randomness, percentage, x, y, frameWidth, frameHeight) {
        let rv = new ImageData(frameWidth * 3, frameHeight * 3);
        let m = Math.round(1 / percentage); // which nth pixel should be displayed
        let r = Math.floor(randomness * m); // which nth pixel am I (everyone has different nth pixel)
        for (let i = 0; i < frameWidth; i++) {
            for (let j = 0; j < frameHeight; j++) {
                let rgba = getHighestRGBA(imageDatas, i, j);
                if (rgba.a < ALPHA_THRESHOLD)
                    continue;
                let imageIndex = (j * frameWidth + i) * 4;
                let middlePixelIndex = ((j * 3 + 1) * rv.width + i * 3 + 1) * 4;
                let alpha = priorityData ? priorityData.data[imageIndex] : rgba.a;
                let p = percentage > 0.99 ? 1 : Math.ceil(m / (alpha / 200));
                if (negativeSafeModulo(i + x + (j + y) * 2 + r, p) !== 0) {
                    continue;
                }
                rv.data[middlePixelIndex] = rgba.r;
                rv.data[middlePixelIndex + 1] = rgba.g;
                rv.data[middlePixelIndex + 2] = rgba.b;
                rv.data[middlePixelIndex + 3] = alpha > ALPHA_THRESHOLD ? 255 : 0;
            }
        }
        return rv;
    }

    class ImageLoadHelper {
        constructor(name, sources) {
            this.imageLoader = new Image();
            this.imageBitmap = undefined;
            this.loading = false;
            this.name = name;
            this.sources = sources || [];
            if (this.sources.length === 0)
                return; // do not attach imageLoader to DOM
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
                if (!this.name) {
                    this.name = getFileStemFromUrl(this.imageLoader.src);
                }
                this.loading = false;
            });
            this.imageLoader.addEventListener('error', () => {
                this.loading = false;
                // assume loading from this source fails
                this.sources.shift();
            });
            this.tryLoadSource();
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
                    if (response.status === 200) {
                        let a = new FileReader();
                        a.onload = (e) => {
                            this.imageLoader.src = e.target.result.toString();
                        };
                        a.readAsDataURL(response.response);
                    }
                    else
                        this.sources.shift();
                }
            });
        }
        getImage() {
            if (!this.imageLoader.complete || !this.imageLoader.src) {
                this.tryLoadSource();
                return;
            }
            return this.imageLoader;
        }
        destroy() {
            var _a;
            (_a = this.imageLoader.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(this.imageLoader);
            this.imageLoader = new Image();
        }
    }

    class Template {
        constructor(params, contact, globalCanvas, priority) {
            var _a, _b;
            this.canvasElement = document.createElement('canvas');
            this.needsCanvasInitialization = true;
            // assign params
            this.name = params.name;
            this.sources = params.sources;
            this.priorityMaskSources = params.priorityMaskSources;
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
            //initialize image loaders
            this.imageLoader = new ImageLoadHelper(this.name, this.sources);
            this.priorityMaskLoader = new ImageLoadHelper(this.name, this.priorityMaskSources);
            // add contact info container
            this.contactX = Math.round(this.x / 5) * 5;
            this.contactY = Math.round(this.y / 5) * 5;
            if (contact) {
                let checkingCoords = true;
                while (checkingCoords) {
                    checkingCoords = false;
                    let contactInfos = this.globalCanvas.parentElement.querySelectorAll('.iHasContactInfo');
                    for (let i = 0; i < contactInfos.length; i++) {
                        let child = contactInfos[i];
                        let childX = parseInt((_a = child.getAttribute('contactX')) !== null && _a !== void 0 ? _a : '0');
                        let childY = parseInt((_b = child.getAttribute('contactY')) !== null && _b !== void 0 ? _b : '0');
                        let thisRight = this.contactX + 35;
                        let childRight = childX + 35;
                        let collision = this.contactX <= childRight && this.contactX >= childX || thisRight <= childRight && thisRight >= childX;
                        if (child
                            && collision
                            && Math.round(childY) === Math.round(this.contactY)) {
                            checkingCoords = true;
                            this.contactX += 5;
                            this.contactY += 5;
                            break;
                        }
                    }
                }
                this.contactElement = document.createElement('div');
                this.contactElement.setAttribute('contactX', this.contactX.toString());
                this.contactElement.setAttribute('contactY', this.contactY.toString());
                this.contactElement.style.left = `${this.contactX}px`;
                this.contactElement.style.top = `${this.contactY}px`;
                let contactPriority = Math.round(Number.MIN_SAFE_INTEGER / 100 + priority);
                this.contactElement.setAttribute('priority', contactPriority.toString());
                this.contactElement.className = 'iHasContactInfo';
                if (params.name) {
                    this.contactElement.appendChild(document.createTextNode(params.name));
                    this.contactElement.appendChild(document.createElement('br'));
                    this.contactElement.appendChild(document.createTextNode(`contact: `));
                }
                this.contactElement.appendChild(document.createTextNode(contact));
                this.insertPriorityElement(this.contactElement);
                this.initialContactCSS = getComputedStyle(this.contactElement);
            }
        }
        updateStyle(globalRatio, left, top, translate, transform, zIndex) {
            this.canvasElement.style.width = `${this.frameWidth * globalRatio}px`;
            this.canvasElement.style.height = `${this.frameHeight * globalRatio}px`;
            if (left !== "auto")
                this.canvasElement.style.left = `calc(${this.x * globalRatio}px + ${left})`;
            else
                this.canvasElement.style.left = `${this.x * globalRatio}px`;
            if (top !== "auto")
                this.canvasElement.style.top = `calc(${this.y * globalRatio}px + ${top})`;
            else
                this.canvasElement.style.top = `${this.y * globalRatio}px`;
            this.canvasElement.style.translate = translate;
            this.canvasElement.style.transform = transform;
            this.canvasElement.style.zIndex = zIndex;
            if (this.contactElement) {
                if (left !== "auto")
                    this.contactElement.style.left = `calc(${this.contactX * globalRatio}px + ${left})`;
                else
                    this.contactElement.style.left = `${this.contactX * globalRatio}px`;
                if (top !== "auto")
                    this.contactElement.style.top = `calc(${this.contactY * globalRatio}px + ${top})`;
                else
                    this.contactElement.style.top = `${this.contactY * globalRatio}px`;
                this.contactElement.style.maxWidth = `${30 * globalRatio}px`;
                this.contactElement.style.padding = `${globalRatio}px`;
                this.contactElement.style.fontSize = `${globalRatio}px`;
                this.contactElement.style.translate = translate;
                this.contactElement.style.transform = transform;
                this.contactElement.style.zIndex = zIndex;
            }
        }
        setContactInfoDisplay(enabled) {
            if (this.contactElement) {
                this.contactElement.style.opacity = enabled ? "1" : "0";
                this.contactElement.style.pointerEvents = enabled ? "auto" : "none";
            }
        }
        setPreviewMode(enabled) {
            var _a;
            let data = enabled ? this.fullImageData : this.ditheredData;
            this.canvasElement.width = data.width;
            this.canvasElement.height = data.height;
            (_a = this.canvasElement.getContext('2d')) === null || _a === void 0 ? void 0 : _a.putImageData(data, 0, 0);
        }
        hideTemplate(enabled) {
            this.canvasElement.style.opacity = enabled ? "0" : "1";
        }
        getCurrentFrameIndex(currentSeconds) {
            if (!this.looping && this.startTime + this.frameCount * this.frameSpeed < currentSeconds)
                return this.frameCount - 1;
            return negativeSafeModulo(Math.floor((currentSeconds - this.startTime) / this.frameSpeed), this.frameCount);
        }
        insertPriorityElement(element) {
            let container = this.globalCanvas.parentElement;
            let priorityElements = container.children;
            let priorityElementsArray = Array.from(priorityElements).filter(el => el.hasAttribute('priority'));
            if (priorityElementsArray.length === 0) {
                container.appendChild(element);
            }
            else {
                priorityElementsArray.push(element);
                priorityElementsArray.sort((a, b) => parseInt(b.getAttribute('priority')) - parseInt(a.getAttribute('priority')));
                let index = priorityElementsArray.findIndex(el => el === element);
                if (index === priorityElementsArray.length - 1) {
                    container.appendChild(element);
                }
                else {
                    container.insertBefore(element, priorityElementsArray[index + 1]);
                }
            }
        }
        initCanvasIfNeeded(image) {
            if (this.needsCanvasInitialization) {
                if (!this.frameWidth || !this.frameHeight) {
                    this.frameWidth = image.naturalWidth;
                    this.frameHeight = image.naturalHeight;
                }
                this.canvasElement.style.position = 'absolute';
                this.canvasElement.style.top = `${this.y}px`;
                this.canvasElement.style.left = `${this.x}px`;
                this.canvasElement.style.width = `${this.frameWidth}px`;
                this.canvasElement.style.height = `${this.frameHeight}px`;
                this.canvasElement.style.pointerEvents = 'none';
                this.canvasElement.style.imageRendering = 'pixelated';
                this.canvasElement.setAttribute('priority', this.priority.toString());
                this.insertPriorityElement(this.canvasElement);
                this.needsCanvasInitialization = false;
            }
        }
        frameStartTime(n = null) {
            return (this.startTime + (n || this.currentFrame || 0) * this.frameSpeed) % this.animationDuration;
        }
        update(higherTemplates, percentage, randomness, currentSeconds) {
            var _a;
            // return if the animation is finished
            if (!this.looping && currentSeconds > this.startTime + this.frameSpeed * this.frameCount) {
                return;
            }
            let image = this.imageLoader.getImage();
            let priorityMask = this.priorityMaskLoader.getImage();
            // return if image isn't loaded yet
            if (!image)
                return;
            // else initialize canvas
            this.initCanvasIfNeeded(image);
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
                if (!this.frameData || this.frameCount > 1)
                    this.frameData = extractFrame(image, this.frameWidth, this.frameHeight, frameIndex);
                if (!this.frameData)
                    return;
                if (priorityMask) {
                    if (!this.priorityData || this.frameCount > 1) {
                        this.priorityData = extractFrame(priorityMask, this.frameWidth, this.frameHeight, frameIndex);
                    }
                }
                let frameDatas = [];
                for (let i = 0; i < higherTemplates.length; i++) {
                    let other = higherTemplates[i];
                    if (this.checkCollision(other) && other.frameData)
                        frameDatas.push({ imagedata: other.frameData, x: this.x - other.x, y: this.y - other.y });
                    // the x, y over here are our coords in relation to the other template
                }
                frameDatas.push({ imagedata: this.frameData, x: 0, y: 0 });
                this.fullImageData = frameDatas[frameDatas.length - 1].imagedata;
                this.ditheredData = ditherData(frameDatas, this.priorityData, randomness, percentage, this.x, this.y, this.frameWidth, this.frameHeight);
                this.canvasElement.width = this.ditheredData.width;
                this.canvasElement.height = this.ditheredData.height;
                (_a = this.canvasElement.getContext('2d')) === null || _a === void 0 ? void 0 : _a.putImageData(this.ditheredData, 0, 0);
            }
            // update done
            this.currentPercentage = percentage;
            this.currentFrame = frameIndex;
            this.currentRandomness = randomness;
            this.blinking(currentSeconds);
        }
        checkCollision(other) {
            if (!this.frameWidth || !this.frameHeight || !other.frameWidth || !other.frameHeight)
                return false;
            let thisRight = this.x + this.frameWidth;
            let thisBottom = this.y + this.frameHeight;
            let otherRight = other.x + other.frameWidth;
            let otherBottom = other.y + other.frameHeight;
            if (this.x > otherRight || // this template is to the right of the other template
                thisRight < other.x || // this template is to the left of the other template
                this.y > otherBottom || // this template is below the other template
                thisBottom < other.y // this template is above the other template
            ) {
                return false;
            }
            return true;
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
            var _a, _b, _c;
            this.imageLoader.destroy();
            this.priorityMaskLoader.destroy();
            (_a = this.canvasElement.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(this.canvasElement);
            this.canvasElement = document.createElement('canvas');
            (_c = (_b = this.contactElement) === null || _b === void 0 ? void 0 : _b.parentElement) === null || _c === void 0 ? void 0 : _c.removeChild(this.contactElement);
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
            this.container.id = 'osuplaceNotificationContainer';
            document.body.appendChild(this.container);
        }
        newNotification(url, message) {
            let div = document.createElement('div');
            div.appendChild(wrapInHtml('i', `${url} says:`));
            div.append(document.createElement('br'));
            div.append(wrapInHtml('b', message));
            div.className = 'osuplaceNotification';
            div.onclick = () => {
                div.classList.remove('visible');
                setTimeout(() => div.remove(), 500);
            };
            this.container.appendChild(div);
            setTimeout(() => {
                div.classList.add('visible');
            }, 100);
        }
    }

    class TemplateManager {
        constructor(canvasElements, startingUrl) {
            this.templatesToLoad = MAX_TEMPLATES;
            this.alreadyLoaded = new Array();
            this.websockets = new Array();
            this.intervals = new Array();
            this.seenNotifications = new Array();
            this.notificationTypes = new Map();
            this.enabledNotifications = new Array();
            this.whitelist = new Array();
            this.blacklist = new Array();
            this.templateConstructors = new Array();
            this.templates = new Array();
            this.responseDiffs = new Array();
            this.canvasElements = [];
            this.randomness = Math.random();
            this.percentage = 1;
            this.lastCacheBust = this.getCacheBustString();
            this.notificationManager = new NotificationManager();
            this.notificationSent = false;
            this.contactInfoEnabled = false;
            this.showTopLevelNotification = true;
            console.log('TemplateManager constructor ', canvasElements, window.location);
            this.canvasElements = canvasElements;
            this.selectedCanvas = canvasElements[0];
            this.selectBestCanvas();
            this.startingUrl = startingUrl;
            this.initOrReloadTemplates(true);
            GM.getValue(`${window.location.host}_notificationsEnabled`, "[]").then((value) => {
                this.enabledNotifications = JSON.parse(value);
            });
            let style = document.createElement('style');
            style.id = 'osuplace-contactinfo-style';
            style.innerHTML = CONTACT_INFO_CSS;
            this.selectedCanvas.parentElement.appendChild(style);
            let globalStyle = document.createElement("style");
            globalStyle.innerHTML = GLOBAL_CSS;
            document.body.appendChild(globalStyle);
            this.canvasObserver = new MutationObserver(() => {
                let css = getComputedStyle(this.selectedCanvas);
                let left = css.left;
                let top = css.top;
                let translate = css.translate;
                let transform = css.transform;
                let zIndex = css.zIndex;
                let globalRatio = parseFloat(this.selectedCanvas.style.width) / this.selectedCanvas.width;
                for (let i = 0; i < this.templates.length; i++) {
                    this.templates[i].updateStyle(globalRatio, left, top, translate, transform, zIndex);
                }
            });
            this.canvasObserver.observe(this.selectedCanvas, { attributes: true });
            setInterval(() => {
                const now = Math.floor(+new Date() / 1000);
                this.seenNotifications = this.seenNotifications.filter((d) => d && ((d.seenAt - now) < 10));
            }, 60 * 1000);
        }
        selectBestCanvas() {
            var _a, _b, _c;
            let selectionChanged = false;
            let selectedBounds = this.selectedCanvas.getBoundingClientRect();
            for (let i = 0; i < this.canvasElements.length; i++) {
                let canvas = this.canvasElements[i];
                let canvasBounds = canvas.getBoundingClientRect();
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
                    (_a = this.templates.shift()) === null || _a === void 0 ? void 0 : _a.destroy();
                }
                for (let i = 0; i < this.templateConstructors.length; i++) {
                    this.templates.push(this.templateConstructors[i](this.selectedCanvas));
                    this.sortTemplates();
                }
                (_b = this.canvasObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
                (_c = this.canvasObserver) === null || _c === void 0 ? void 0 : _c.observe(this.selectedCanvas, { attributes: true });
            }
        }
        getCacheBustString() {
            return Math.floor(Date.now() / CACHE_BUST_PERIOD).toString(36);
        }
        loadTemplatesFromJsonURL(url, minPriority = 0, lastContact = '') {
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
                            let entry = json.whitelist[i];
                            let contactInfo = json.contact || json.contactInfo || lastContact;
                            entry.name = entry.name ? `${entry.name}, from: ${contactInfo}` : contactInfo;
                            this.whitelist.push(json.whitelist[i]);
                        }
                    }
                    // read templates
                    if (json.templates) {
                        for (let i = 0; i < json.templates.length; i++) {
                            if (this.templates.length < this.templatesToLoad) {
                                let constructor = (a) => new Template(json.templates[i], json.contact || json.contactInfo || lastContact, a, minPriority + this.templates.length);
                                this.templateConstructors.push(constructor);
                                let newTemplate = constructor(this.selectedCanvas);
                                this.templates.push(newTemplate);
                                newTemplate.setContactInfoDisplay(this.contactInfoEnabled);
                                this.sortTemplates();
                            }
                        }
                    }
                    // connect to websocket
                    if (json.notifications) {
                        this.setupNotifications(json.notifications, url == this.startingUrl);
                    }
                },
                onerror: console.error
            });
        }
        sortTemplates() {
            this.templates.sort((a, b) => a.priority - b.priority);
        }
        setupNotifications(serverUrl, isTopLevelTemplate, doPoll = false) {
            console.log('attempting to set up notification server ' + serverUrl, doPoll ? "polling" : "websocket");
            // check if we're not already connected
            let wsUrl = new URL('/listen', serverUrl);
            wsUrl.protocol = wsUrl.protocol == 'https:' ? 'wss:' : 'ws:';
            for (const socket of this.websockets) {
                if (socket.url == wsUrl.toString()) {
                    if (socket.readyState != socket.CLOSING && socket.readyState != socket.CLOSED) {
                        console.log(`we are already connected to ${wsUrl}, skipping!`);
                        return;
                    }
                }
            }
            // get topics
            let domain = new URL(serverUrl).hostname.replace(/[\.\-_]?broadcaster/, '');
            if (domain[0] === '.')
                domain = domain.substring(1);
            // do some cache busting
            let _url = new URL(serverUrl + "/topics");
            this.lastCacheBust = this.getCacheBustString();
            _url.searchParams.append("date", this.lastCacheBust);
            GM.xmlHttpRequest({
                method: 'GET',
                url: _url.href,
                responseType: 'text',
                onload: async (response) => {
                    if (response.status !== 200) {
                        console.error(`error getting ${serverUrl}/topics, trying again in 10s...`);
                        setTimeout(() => { this.setupNotifications(serverUrl, isTopLevelTemplate); }, 10000);
                        return false;
                    }
                    let data = response.response;
                    try {
                        data = JSON.parse(data);
                    }
                    catch (ex) {
                        console.error(`error parsing ${serverUrl} topics: ${ex}, trying again in 10s...`);
                        setTimeout(() => { this.setupNotifications(serverUrl, isTopLevelTemplate); }, 10000);
                        return false;
                    }
                    if (data == false)
                        return;
                    let topics = [];
                    data.forEach((topicFromApi) => {
                        if (!topicFromApi.id || !topicFromApi.description) {
                            console.error('Invalid topic: ' + topicFromApi);
                            return;
                        }
                        let topic = topicFromApi;
                        if (isTopLevelTemplate) {
                            topic.forced = true;
                            removeItem(this.enabledNotifications, `${domain}??${topic.id}`);
                            this.enabledNotifications.push(`${domain}??${topic.id}`);
                        }
                        topics.push(topic);
                    });
                    this.notificationTypes.set(domain, topics);
                    if (isTopLevelTemplate) {
                        let enabledKey = `${window.location.host}_notificationsEnabled`;
                        await GM.setValue(enabledKey, JSON.stringify(this.enabledNotifications));
                        if (this.showTopLevelNotification) {
                            this.notificationManager.newNotification("template manager", `You were automatically set to recieve notifications from ${domain} as it's from your address-bar template`);
                            this.showTopLevelNotification = false;
                        }
                    }
                    const handleNotificationEvent = (data) => {
                        // https://github.com/osuplace/broadcaster/blob/main/API.md
                        if (data.e == 1) {
                            if (!data.t || !data.c) {
                                console.error(`Malformed event from ${serverUrl}: ${data}`);
                            }
                            let topic = topics.find(t => t.id == data.t); // FIXME: if we add dynamically updating topics, this will use the old topic list instead of the up to date one
                            if (!topic)
                                return;
                            if (data.i) {
                                const id = `${domain}:${data.i}`;
                                if (this.seenNotifications.some((v) => v.id == id))
                                    return;
                                this.seenNotifications.push({
                                    id,
                                    seenAt: Math.floor(+new Date() / 1000)
                                });
                            }
                            if (this.enabledNotifications.includes(`${domain}??${data.t}`) || topic.forced) {
                                this.notificationManager.newNotification(domain, data.c);
                            }
                        }
                        else {
                            console.log(`Received unknown event from ${serverUrl}: ${data}`);
                        }
                    };
                    if (doPoll) {
                        let timer = setInterval(() => {
                            let pollUrl = new URL(serverUrl + "/listen-poll");
                            pollUrl.searchParams.append("date", (+new Date()).toString());
                            GM.xmlHttpRequest({
                                method: 'GET',
                                url: pollUrl.href,
                                responseType: 'text',
                                onload: async (response) => {
                                    if (response.status === 404) {
                                        console.error(`${serverUrl} does not have polling support, trying again with websocket in 30s...`);
                                        setTimeout(() => { this.setupNotifications(serverUrl, isTopLevelTemplate); }, 30000);
                                        clearInterval(timer);
                                        return false;
                                    }
                                    if (response.status !== 200) {
                                        console.error(`error getting ${serverUrl}/listen-poll, trying again in 10s...`);
                                        setTimeout(() => { this.setupNotifications(serverUrl, isTopLevelTemplate); }, 10000);
                                        clearInterval(timer);
                                        return false;
                                    }
                                    let data = response.response;
                                    try {
                                        data = JSON.parse(data);
                                        if (!Array.isArray(data))
                                            throw new Error();
                                    }
                                    catch (ex) {
                                        console.error(`error parsing ${serverUrl} listen (poll): ${ex}, trying again in 10s...`);
                                        setTimeout(() => { this.setupNotifications(serverUrl, isTopLevelTemplate); }, 10000);
                                        clearInterval(timer);
                                        return false;
                                    }
                                    for (const event of data)
                                        handleNotificationEvent(event);
                                },
                                onerror: (err) => {
                                    console.error(`error getting ${serverUrl}/listen-poll, trying again in 10s...`, err);
                                    setTimeout(() => { this.setupNotifications(serverUrl, isTopLevelTemplate); }, 10000);
                                    clearInterval(timer);
                                }
                            });
                        }, 1 * 1000);
                        this.intervals.push(timer);
                    }
                    else {
                        // actually connecting to the websocket now
                        let ws = new WebSocket(wsUrl);
                        ws.addEventListener('open', (_) => {
                            console.log(`successfully connected to websocket for ${serverUrl}`);
                            this.websockets.push(ws);
                        });
                        ws.addEventListener('message', async (event) => {
                            let data = JSON.parse(await event.data);
                            handleNotificationEvent(data);
                        });
                        ws.addEventListener('close', (_) => {
                            console.log(`websocket on ${ws.url} closing!`);
                            removeItem(this.websockets, ws);
                            setTimeout(() => {
                                this.setupNotifications(serverUrl, isTopLevelTemplate);
                            }, 1000 * 30);
                        });
                        ws.addEventListener('error', (_) => {
                            console.log(`websocket error on ${ws.url}, closing!`);
                            ws.close();
                            console.error(`failed to create a websocket connection to ${serverUrl}, trying polling...`);
                            setTimeout(() => {
                                this.setupNotifications(serverUrl, isTopLevelTemplate, true);
                            }, 1000 * 1);
                        });
                    }
                },
                onerror: (error) => {
                    console.error(`Couldn\'t get topics from ${serverUrl}: ${error}`);
                }
            });
        }
        canReload() {
            return this.lastCacheBust !== this.getCacheBustString();
        }
        initOrReloadTemplates(forced = false, contactInfo = null) {
            var _a, _b;
            if (contactInfo !== null)
                this.contactInfoEnabled = contactInfo;
            this.setContactInfoDisplay(this.contactInfoEnabled);
            if (!this.canReload() && !forced) {
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
                console.log('initOrReloadTemplates is closing connection ' + this.websockets[0].url);
                (_b = this.websockets.shift()) === null || _b === void 0 ? void 0 : _b.close();
            }
            while (this.intervals.length) {
                clearInterval(this.intervals.shift());
            }
            this.templates = [];
            this.websockets = [];
            this.intervals = [];
            this.alreadyLoaded = [];
            this.whitelist = [];
            this.blacklist = [];
            if (this.startingUrl !== NO_JSON_TEMPLATE_IN_PARAMS)
                this.loadTemplatesFromJsonURL(this.startingUrl);
            GM.getValue(`${window.location.host}_alwaysLoad`).then(value => {
                if (value && value !== "[]") {
                    let templates = JSON.parse(value);
                    for (let i = 0; i < templates.length; i++) {
                        this.loadTemplatesFromJsonURL(templates[i]);
                    }
                }
                else if (!this.notificationSent) {
                    this.notificationManager.newNotification("template manager", "No default template set. Consider adding one via settings.");
                    this.notificationSent = true;
                }
            });
        }
        currentSeconds() {
            let averageDiff = this.responseDiffs.reduce((a, b) => a + b, 0) / (this.responseDiffs.length);
            return (Date.now() + averageDiff) / 1000;
        }
        update() {
            this.selectBestCanvas();
            let cs = this.currentSeconds();
            for (let i = 0; i < this.templates.length; i++) {
                try {
                    this.templates[i].update(this.templates.slice(0, i), this.percentage, this.randomness, cs);
                }
                catch (e) {
                    console.log(`failed to update template ${this.templates[i].name}`);
                }
            }
            if (this.templates.length < this.templatesToLoad) {
                for (let i = 0; i < this.whitelist.length; i++) {
                    // yes this calls all whitelist all the time but the load will cancel if already loaded
                    let entry = this.whitelist[i];
                    this.loadTemplatesFromJsonURL(entry.url, i * this.templatesToLoad, entry.name);
                }
            }
        }
        setContactInfoDisplay(enabled) {
            for (let i = 0; i < this.templates.length; i++) {
                this.templates[i].setContactInfoDisplay(enabled);
            }
        }
        setPreviewMode(enabled) {
            for (let i = 0; i < this.templates.length; i++) {
                this.templates[i].setPreviewMode(enabled);
            }
        }
        hideTemplate(enabled) {
            for (let i = 0; i < this.templates.length; i++) {
                this.templates[i].hideTemplate(enabled);
            }
        }
    }

    function createLabel(text) {
        let label = document.createElement("label");
        label.innerText = text;
        return label;
    }
    function createButton(text, callback) {
        let button = document.createElement("button");
        button.innerText = text;
        button.onclick = () => callback();
        button.className = "settingsButton";
        return button;
    }
    function createTextInput(buttonText, placeholder, callback) {
        let div = document.createElement("div");
        let textInput = document.createElement("input");
        textInput.type = "text";
        textInput.placeholder = placeholder;
        textInput.className = "settingsTextInput";
        let button = createButton(buttonText, () => {
            callback(textInput.value);
        });
        div.appendChild(textInput);
        div.appendChild(button);
        return div;
    }
    function createSlider(Text, value, callback) {
        let div = document.createElement("div");
        div.className = "settingsSliderBox";
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
    function createBoldCheckbox(boldText, regularText, checked, callback, disabled = false) {
        let div = document.createElement("div");
        div.className = "settingsCheckbox";
        let checkbox = document.createElement('input');
        checkbox.type = "checkbox";
        checkbox.checked = checked;
        checkbox.disabled = disabled;
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
            this.overlay = document.createElement("div");
            this.templateLinksWrapper = document.createElement("div");
            this.notificationsWrapper = document.createElement("div");
            this.reloadTemplatesWhenClosed = false;
            this.contactInfoEnabled = false;
            this.previewModeEnabled = false;
            this.hideTemplate = false;
            this.templateLinksWrapper.className = "settingsWrapper";
            this.templateLinksWrapper.id = "templateLinksWrapper";
            this.notificationsWrapper.className = "settingsWrapper";
            this.manager = manager;
            document.body.appendChild(this.overlay);
            this.overlay.id = "settingsOverlay";
            this.overlay.style.opacity = "0";
            let div = document.createElement('div');
            div.className = "settingsWrapper";
            div.appendChild(createLabel(".json Template settings - v" + GM.info.script.version));
            div.appendChild(document.createElement('br'));
            div.appendChild(createButton("Reload the template", () => manager.initOrReloadTemplates(false, this.contactInfoEnabled)));
            div.appendChild(document.createElement('br'));
            div.appendChild(createSlider("Templates to load", "4", (n) => {
                manager.templatesToLoad = (n + 1) * MAX_TEMPLATES / 5;
            }));
            div.appendChild(document.createElement('br'));
            div.appendChild(createButton("Generate new randomness", () => {
                let currentRandomness = manager.randomness;
                while (true) {
                    manager.randomness = Math.random();
                    if (Math.abs(currentRandomness - manager.randomness) > 1 / 3)
                        break;
                }
            }));
            div.appendChild(document.createElement('br'));
            div.appendChild(createSlider("Dither amount", "1", (n) => {
                manager.percentage = 1 / (n / 10 + 1);
            }));
            div.appendChild(document.createElement('br'));
            div.appendChild(createBoldCheckbox('', "Show contact info besides templates", this.contactInfoEnabled, (a) => {
                manager.setContactInfoDisplay(a);
                this.contactInfoEnabled = a;
            }));
            div.appendChild(createBoldCheckbox('', "Preview template in full", this.previewModeEnabled, (a) => {
                manager.setPreviewMode(a);
                this.previewModeEnabled = a;
            }));
            div.appendChild(createBoldCheckbox('', "Hide template", this.hideTemplate, (a) => {
                manager.hideTemplate(a);
                this.hideTemplate = a;
            }));
            div.appendChild(document.createElement('br'));
            let clickHandler = document.createElement('div');
            clickHandler.style.width = '100vw';
            clickHandler.style.height = '100vh';
            clickHandler.style.position = 'absolute';
            clickHandler.style.left = '-0.1px';
            clickHandler.style.right = '-0.1px';
            clickHandler.style.overflowY = 'auto';
            clickHandler.addEventListener("wheel", (ev) => {
                ev.preventDefault();
                var direction = (ev.deltaY > 0) ? 1 : -1;
                clickHandler.scrollTop += direction * 100;
            });
            clickHandler.onclick = (ev) => {
                if (ev.target === ev.currentTarget)
                    this.close();
            };
            window.addEventListener("keydown", (ev) => {
                if (ev.key === "Escape") {
                    this.close();
                }
            });
            this.overlay.attachShadow({ mode: 'open' });
            let globalStyle = document.createElement("style");
            globalStyle.innerHTML = SETTINGS_CSS;
            this.overlay.shadowRoot.appendChild(globalStyle);
            this.overlay.shadowRoot.appendChild(clickHandler);
            clickHandler.appendChild(div);
            clickHandler.appendChild(this.templateLinksWrapper);
            clickHandler.appendChild(this.notificationsWrapper);
        }
        open() {
            this.overlay.style.opacity = "1";
            this.overlay.style.pointerEvents = "auto";
            this.populateAll();
        }
        close() {
            this.overlay.style.opacity = "0";
            this.overlay.style.pointerEvents = "none";
            if (this.reloadTemplatesWhenClosed) {
                this.manager.initOrReloadTemplates(true, this.contactInfoEnabled);
                this.reloadTemplatesWhenClosed = false;
            }
        }
        toggle() {
            if (this.overlay.style.opacity === "0") {
                this.open();
            }
            else {
                this.close();
            }
        }
        changeMouseEvents(enabled) {
            if (this.overlay.style.opacity === "0")
                this.overlay.style.pointerEvents = enabled ? "auto" : "none";
        }
        populateAll() {
            this.populateTemplateLinks();
            this.populateNotifications();
        }
        populateTemplateLinks() {
            while (this.templateLinksWrapper.children.length) {
                this.templateLinksWrapper.children[0].remove();
            }
            GM.getValue(`${window.location.host}_alwaysLoad`).then(value => {
                let templates = value ? JSON.parse(value) : [];
                let templateAdder = createTextInput("Always load", "Template URL", async (tx) => {
                    let url = new URL(tx);
                    let template = findJSONTemplateInURL(url) || url.toString();
                    if (templates.includes(template))
                        return;
                    templates.push(template);
                    await GM.setValue(`${window.location.host}_alwaysLoad`, JSON.stringify(templates));
                    this.populateTemplateLinks();
                    this.manager.loadTemplatesFromJsonURL(template);
                });
                this.templateLinksWrapper.appendChild(templateAdder);
                if (templates.length > 0) {
                    this.templateLinksWrapper.appendChild(createLabel("Click to remove template from always loading"));
                    this.templateLinksWrapper.appendChild(document.createElement('br'));
                }
                for (let i = 0; i < templates.length; i++) {
                    let button = createButton(templates[i], async () => {
                        button.remove();
                        templates.splice(i, 1);
                        await GM.setValue(`${window.location.host}_alwaysLoad`, JSON.stringify(templates));
                        this.populateTemplateLinks();
                        this.reloadTemplatesWhenClosed = true;
                    });
                    button.className = `${button.className} templateLink`;
                    this.templateLinksWrapper.appendChild(button);
                }
            });
        }
        populateNotifications() {
            while (this.notificationsWrapper.children.length) {
                this.notificationsWrapper.children[0].remove();
            }
            let keys = this.manager.notificationTypes.keys();
            let key;
            while (!(key = keys.next()).done) {
                let value = key.value;
                this.notificationsWrapper.appendChild(createLabel(value));
                let notifications = this.manager.notificationTypes.get(value);
                if (notifications === null || notifications === void 0 ? void 0 : notifications.length) {
                    for (let i = 0; i < notifications.length; i++) {
                        let notification = notifications[i];
                        let enabled = this.manager.enabledNotifications.includes(`${value}??${notification.id}`);
                        if (notification.forced)
                            enabled = true;
                        let checkbox = createBoldCheckbox(notification.id + " - ", notification.description, enabled, async (b) => {
                            removeItem(this.manager.enabledNotifications, `${value}??${notification.id}`);
                            if (b) {
                                this.manager.enabledNotifications.push(`${value}??${notification.id}`);
                            }
                            let enabledKey = `${window.location.host}_notificationsEnabled`;
                            await GM.setValue(enabledKey, JSON.stringify(this.manager.enabledNotifications));
                        }, notification.forced);
                        this.notificationsWrapper.append(document.createElement('br'));
                        this.notificationsWrapper.append(checkbox);
                    }
                }
                this.notificationsWrapper.append(document.createElement('br'));
            }
        }
    }

    let SLIDERS_SVG = '<button><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.3.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M0 416c0-17.7 14.3-32 32-32l54.7 0c12.3-28.3 40.5-48 73.3-48s61 19.7 73.3 48L480 384c17.7 0 32 14.3 32 32s-14.3 32-32 32l-246.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 448c-17.7 0-32-14.3-32-32zm192 0a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM384 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm-32-80c32.8 0 61 19.7 73.3 48l54.7 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-54.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l246.7 0c12.3-28.3 40.5-48 73.3-48zM192 64a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm73.3 0L480 64c17.7 0 32 14.3 32 32s-14.3 32-32 32l-214.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 128C14.3 128 0 113.7 0 96S14.3 64 32 64l86.7 0C131 35.7 159.2 16 192 16s61 19.7 73.3 48z"/></svg></button>';
    async function init(manager) {
        let settings = new Settings(manager);
        while (window.innerWidth === 0 || window.innerHeight === 0) {
            await sleep(1000);
        }
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
                settings.changeMouseEvents(true);
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
                settings.changeMouseEvents(false);
            }
        });
        window.addEventListener('mousemove', (ev) => {
            if (dragged) {
                setPosition(ev.clientX, ev.clientY);
            }
        });
        iconElement.addEventListener('touchstart', (ev) => {
            clicked = true;
        });
        window.addEventListener('touchend', (ev) => {
            clicked = false;
            dragged = false;
        });
        window.addEventListener('touchmove', (ev) => {
            if (ev.touches.length === 1) {
                if (iconElement !== document.elementFromPoint(ev.touches[0].pageX, ev.touches[0].pageY) && clicked)
                    dragged = true;
                if (dragged)
                    setPosition(ev.touches[0].clientX, ev.touches[0].clientY);
            }
        });
    }

    let jsontemplate;
    let canvasElements; // FIXME: This should probably be a list and the user can just select the correct one manually
    function topWindow() {
        console.log("top window code for", window.location.href);
        GM.setValue('canvasFound', false);
        let params = findJSONTemplateInURL(window.location) || NO_JSON_TEMPLATE_IN_PARAMS;
        jsontemplate = params;
        GM.setValue('jsontemplate', jsontemplate);
    }
    async function canvasWindow() {
        while (document.readyState !== 'complete') {
            console.log("Template manager sleeping for 1 second because document isn't ready yet.");
            await sleep(1000);
        }
        console.log("canvas code for", window.location.href);
        let sleep$1 = 0;
        while (canvasElements === undefined || canvasElements.length === 0) {
            if (await GM.getValue('canvasFound', false) && !windowIsEmbedded()) {
                console.log('canvas found by iframe');
                return;
            }
            await sleep(1000 * sleep$1);
            sleep$1++;
            console.log("trying to find canvas");
            canvasElements = findElementOfType(document.documentElement, HTMLCanvasElement);
        }
        GM.setValue('canvasFound', true);
        sleep$1 = 0;
        while (true) {
            if (jsontemplate) {
                runCanvas(jsontemplate, canvasElements);
                break;
            }
            else if (windowIsEmbedded()) {
                jsontemplate = (await GM.getValue('jsontemplate', ''));
            }
            await sleep(1000 * sleep$1);
            sleep$1++;
        }
    }
    async function runCanvas(jsontemplate, canvasElements) {
        let manager = new TemplateManager(canvasElements, jsontemplate);
        init(manager);
        window.setInterval(() => {
            manager.update();
        }, UPDATE_PERIOD_MILLIS);
        window.setInterval(() => {
            console.log("Reloading template...");
            manager.initOrReloadTemplates(false, null);
        }, TEMPLATE_RELOAD_INTERVAL);
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
