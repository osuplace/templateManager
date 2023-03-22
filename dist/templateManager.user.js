
// ==UserScript==
// @name			template-manager
// @version			0.3.1
// @description		Manages your templates on various canvas games
// @author			LittleEndu
// @license			MIT
// @grant			GM.xmlHttpRequest
// @grant			GM.setValue
// @grant			GM.getValue
// @match			https://pxls.space/
// @match			https://new.reddit.com/r/place/?*
// @match			https://www.reddit.com/r/place/?*
// @match			https://garlic-bread.reddit.com/embed*
// @match			https://hot-potato.reddit.com/embed*
// @namespace		littleendu.xyz
//
// Created with love using Gorilla
// ==/UserScript==

(function () {
    'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */

    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }

    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (g && (g = 0, op[0] && (_ = 0)), _) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    }

    var MAX_TEMPLATES = 100;
    var CACHE_BUST_PERIOD = 1000 * 60 * 2;
    var UPDATE_PERIOD_MILLIS = 100;
    var SECONDS_SPENT_BLINKING = 5;
    var AMOUND_OF_BLINKING = 11;
    var ANIMATION_DEFAULT_PERCENTAGE = 1 / 6;

    function negativeSafeModulo(a, b) {
        return (a % b + b) % b;
    }
    function getFileStemFromUrl(url) {
        var lastSlashIndex = url.lastIndexOf('/');
        var fileName = url.slice(lastSlashIndex + 1);
        var lastDotIndex = fileName.lastIndexOf('.');
        var fileStem = (lastDotIndex === -1) ? fileName : fileName.slice(0, lastDotIndex);
        return fileStem;
    }
    function windowIsEmbedded() {
        return window.top !== window.self;
    }
    function sleep(ms) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    }

    function extractFrame(image, frameWidth, frameHeight, frameIndex) {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        if (!context)
            return null;
        var gridWidth = Math.round(image.naturalWidth / frameWidth);
        var gridX = frameIndex % gridWidth;
        var gridY = Math.floor(frameIndex / gridWidth);
        context.drawImage(image, gridX * frameWidth, gridY * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        return context.getImageData(0, 0, frameWidth, frameHeight);
    }
    function ditherData(imageData, randomness, percentage, x, y, frameWidth, frameHeight) {
        var rv = new ImageData(frameWidth * 3, frameHeight * 3);
        var m = Math.round(1 / percentage); // which nth pixel should be displayed
        var r = Math.floor(randomness * m); // which nth pixel am I (everyone has different nth pixel)
        for (var i = 0; i < frameWidth; i++) {
            for (var j = 0; j < frameHeight; j++) {
                var imageIndex = (j * frameWidth + i) * 4;
                var middlePixelIndex = ((j * 3 + 1) * rv.width + i * 3 + 1) * 4;
                var alpha = imageData.data[imageIndex + 3];
                var p = percentage > 0.99 ? 1 : Math.ceil(m / (alpha / 200));
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

    var Template = /** @class */ (function () {
        function Template(params, globalCanvas, priority) {
            var _this = this;
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
            var period = SECONDS_SPENT_BLINKING * 1000 / AMOUND_OF_BLINKING;
            this.blinkingPeriodMillis = Math.floor(period / UPDATE_PERIOD_MILLIS) * UPDATE_PERIOD_MILLIS;
            this.animationDuration = (this.frameCount * this.frameSpeed);
            // initialize image loader
            // set image loader style
            this.imageLoader.style.position = 'absolute';
            this.imageLoader.style.top = '0';
            this.imageLoader.style.left = '0';
            this.imageLoader.style.width = '1px';
            this.imageLoader.style.height = '1px';
            this.imageLoader.style.opacity = "".concat(Number.MIN_VALUE);
            this.imageLoader.style.pointerEvents = 'none';
            this.imageLoader.crossOrigin = 'Anonymous';
            document.body.appendChild(this.imageLoader); // firefox doesn't seem to load images outside of DOM
            // set image loader event listeners
            this.imageLoader.addEventListener('load', function () {
                if (!_this.frameWidth || !_this.frameHeight) {
                    _this.frameWidth = _this.imageLoader.naturalWidth;
                    _this.frameHeight = _this.imageLoader.naturalHeight;
                }
                if (!_this.name) {
                    _this.name = getFileStemFromUrl(_this.imageLoader.src);
                }
                _this.initCanvas();
                _this.loading = false;
            });
            this.imageLoader.addEventListener('error', function () {
                _this.loading = false;
                // assume loading from this source fails
                _this.sources.shift();
            });
        }
        Template.prototype.tryLoadSource = function () {
            var _this = this;
            if (this.loading)
                return;
            if (this.sources.length === 0)
                return;
            this.loading = true;
            var candidateSource = this.sources[0];
            var displayName = this.name ? this.name + ': ' : '';
            console.log("".concat(displayName, "trying to load ").concat(candidateSource));
            GM.xmlHttpRequest({
                method: 'GET',
                url: candidateSource,
                responseType: 'blob',
                onload: function (response) {
                    _this.imageLoader.src = URL.createObjectURL(response.response);
                }
            });
        };
        Template.prototype.getCurrentFrameIndex = function (currentSeconds) {
            if (!this.looping && this.startTime + this.frameCount * this.frameSpeed < currentSeconds)
                return this.frameCount - 1;
            return negativeSafeModulo(Math.floor((currentSeconds - this.startTime) / this.frameSpeed), this.frameCount);
        };
        Template.prototype.initCanvas = function () {
            var _this = this;
            this.canvasElement.style.position = 'absolute';
            this.canvasElement.style.top = "".concat(this.y, "px");
            this.canvasElement.style.left = "".concat(this.x, "px");
            this.canvasElement.style.width = "".concat(this.frameWidth, "px");
            this.canvasElement.style.height = "".concat(this.frameHeight, "px");
            this.canvasElement.style.pointerEvents = 'none';
            this.canvasElement.style.imageRendering = 'pixelated';
            this.canvasElement.setAttribute('priority', this.priority.toString());
            // find others and append to correct position
            var templateElements = this.globalCanvas.parentElement.children;
            var templateElementsArray = Array.from(templateElements).filter(function (element) { return element.hasAttribute('priority'); });
            if (templateElementsArray.length === 0) {
                this.globalCanvas.parentElement.appendChild(this.canvasElement);
            }
            else {
                // add the new template element to the array
                templateElementsArray.push(this.canvasElement);
                // sort the array by priority
                templateElementsArray.sort(function (a, b) { return parseInt(b.getAttribute('priority')) - parseInt(a.getAttribute('priority')); });
                // find the index of the new template element in the sorted array
                var index = templateElementsArray.findIndex(function (element) { return element === _this.canvasElement; });
                // insert the new template element at the index
                if (index === templateElementsArray.length - 1) {
                    this.globalCanvas.parentElement.appendChild(this.canvasElement);
                }
                else {
                    this.globalCanvas.parentElement.insertBefore(this.canvasElement, templateElementsArray[index + 1]);
                }
            }
        };
        Template.prototype.frameStartTime = function (n) {
            if (n === void 0) { n = null; }
            return (this.startTime + (n || this.currentFrame) * this.frameSpeed) % this.animationDuration;
        };
        Template.prototype.updateStyle = function () {
            // for canvas games where the canvas itself has css applied
            var globalRatio = parseFloat(this.globalCanvas.style.width) / this.globalCanvas.width;
            this.canvasElement.style.width = "".concat(this.frameWidth * globalRatio, "px");
            this.canvasElement.style.height = "".concat(this.frameHeight * globalRatio, "px");
            this.canvasElement.style.left = "".concat(this.x * globalRatio, "px");
            this.canvasElement.style.top = "".concat(this.y * globalRatio, "px");
        };
        Template.prototype.update = function (percentage, randomness, currentSeconds) {
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
            var frameIndex = this.getCurrentFrameIndex(currentSeconds);
            if (this.frameCount > 1 && this.frameSpeed > 30) {
                var framePast = currentSeconds % this.animationDuration - this.frameStartTime(frameIndex);
                var framePercentage = framePast / this.frameSpeed;
                if (framePercentage < 0.5) {
                    percentage *= ANIMATION_DEFAULT_PERCENTAGE;
                }
            }
            // update canvas if necessary
            if (this.currentFrame !== frameIndex || this.currentPercentage !== percentage || this.currentRandomness !== randomness) {
                var frameData = extractFrame(this.imageLoader, this.frameWidth, this.frameHeight, frameIndex);
                if (!frameData)
                    return;
                var ditheredData = ditherData(frameData, randomness, percentage, this.x, this.y, this.frameWidth, this.frameHeight);
                this.canvasElement.width = ditheredData.width;
                this.canvasElement.height = ditheredData.height;
                (_a = this.canvasElement.getContext('2d')) === null || _a === void 0 ? void 0 : _a.putImageData(ditheredData, 0, 0);
            }
            // update done
            this.currentPercentage = percentage;
            this.currentFrame = frameIndex;
            this.currentRandomness = randomness;
            this.blinking(currentSeconds);
        };
        Template.prototype.blinking = function (currentSeconds) {
            // return if no blinking needed
            if (this.frameSpeed === Infinity || this.frameSpeed < 30 || this.frameCount === 1)
                return;
            var frameEndTime = this.frameStartTime() + this.frameSpeed;
            var blinkTime = (currentSeconds % this.animationDuration) + (AMOUND_OF_BLINKING * this.blinkingPeriodMillis / 1000);
            if (blinkTime > frameEndTime) {
                var blinkDiff = blinkTime - frameEndTime;
                this.canvasElement.style.opacity = Math.floor(blinkDiff / (this.blinkingPeriodMillis / 1000)) % 2 === 0 ? '0' : '1';
            }
            else {
                this.canvasElement.style.opacity = '1';
            }
        };
        Template.prototype.destroy = function () {
            var _a, _b;
            (_a = this.imageLoader.parentElement) === null || _a === void 0 ? void 0 : _a.removeChild(this.imageLoader);
            this.imageLoader = new Image();
            (_b = this.canvasElement.parentElement) === null || _b === void 0 ? void 0 : _b.removeChild(this.canvasElement);
            this.canvasElement = document.createElement('canvas');
        };
        return Template;
    }());

    var TemplateManager = /** @class */ (function () {
        function TemplateManager(canvasElement, startingUrl) {
            var _this = this;
            this.alreadyLoaded = new Array();
            this.whitelist = new Array();
            this.blacklist = new Array();
            this.templates = new Array();
            this.responseDiffs = new Array();
            this.randomness = Math.random();
            this.percentage = 1;
            this.canvasElement = canvasElement;
            this.startingUrl = startingUrl;
            this.loadTemplatesFromJsonURL(startingUrl);
            window.addEventListener('keydown', function (ev) {
                if (ev.key.match(/^\d$/)) {
                    var number = parseInt(ev.key) || 1.1;
                    _this.percentage = 1 / number;
                }
                else if (ev.key === 'd') {
                    _this.randomness = (_this.randomness + ANIMATION_DEFAULT_PERCENTAGE + _this.percentage * 1.5) % 1;
                }
            });
        }
        TemplateManager.prototype.loadTemplatesFromJsonURL = function (url, minPriority) {
            var _this = this;
            if (minPriority === void 0) { minPriority = 0; }
            var _url = new URL(url);
            var uniqueString = "".concat(_url.origin).concat(_url.pathname);
            // exit if already loaded
            // exit if blacklisted
            if (this.alreadyLoaded.includes(uniqueString) || this.blacklist.includes(uniqueString))
                return;
            this.alreadyLoaded.push(uniqueString);
            console.log("loading template from ".concat(_url));
            // do some cache busting
            _url.searchParams.append("date", Math.floor(Date.now() / CACHE_BUST_PERIOD).toString(36));
            GM.xmlHttpRequest({
                method: 'GET',
                url: _url.href,
                onload: function (response) {
                    // use this request to callibrate the latency to general internet requests
                    var responseMatch = response.responseHeaders.match(/date:(.*)\r/i);
                    if (responseMatch) {
                        var responseTime = Date.parse(responseMatch[1]);
                        _this.responseDiffs.push(responseTime - Date.now());
                    }
                    // parse the response
                    var json = JSON.parse(response.responseText);
                    // read blacklist. These will never be loaded
                    if (json.blacklist) {
                        for (var i = 0; i < json.blacklist.length; i++) {
                            _this.blacklist.push(json.blacklist[i].url);
                        }
                    }
                    // read whitelist. These will be loaded later
                    if (json.whitelist) {
                        for (var i = 0; i < json.whitelist.length; i++) {
                            _this.whitelist.push(json.whitelist[i].url);
                        }
                    }
                    // read templates
                    if (json.templates) {
                        for (var i = 0; i < json.templates.length; i++) {
                            if (_this.templates.length < MAX_TEMPLATES) {
                                _this.templates.push(new Template(json.templates[i], _this.canvasElement, minPriority + _this.templates.length));
                            }
                        }
                    }
                }
            });
        };
        TemplateManager.prototype.reload = function () {
            var _a;
            // reload the templates
            // reloading only the json is not possible because it's user input and not uniquely identifiable
            // so everything is reloaded as if the template manager was just initialized
            while (this.templates.length) {
                (_a = this.templates.shift()) === null || _a === void 0 ? void 0 : _a.destroy();
            }
            this.loadTemplatesFromJsonURL(this.startingUrl);
        };
        TemplateManager.prototype.currentSeconds = function () {
            var averageDiff = this.responseDiffs.reduce(function (a, b) { return a + b; }, 0) / (this.responseDiffs.length);
            return (Date.now() + averageDiff) / 1000;
        };
        TemplateManager.prototype.update = function () {
            var cs = this.currentSeconds();
            for (var i = 0; i < this.templates.length; i++)
                this.templates[i].update(this.percentage, this.randomness, cs);
            if (this.templates.length < MAX_TEMPLATES) {
                for (var i = 0; i < this.whitelist.length; i++) {
                    // yes this calls all whitelist all the time but the load will cancel if already loaded
                    this.loadTemplatesFromJsonURL(this.whitelist[i], i * MAX_TEMPLATES);
                }
            }
        };
        TemplateManager.prototype.restart = function () {
            while (this.templates.length > 0) {
                var template = this.templates.shift();
                template === null || template === void 0 ? void 0 : template.destroy();
            }
            this.alreadyLoaded = new Array();
            this.loadTemplatesFromJsonURL(this.startingUrl);
        };
        return TemplateManager;
    }());

    var jsontemplate;
    var canvasElement;
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
        for (var _i = 0, _a = element.children; _i < _a.length; _i++) {
            var child = _a[_i];
            findCanvas(child);
        }
    }
    function findParams(urlString) {
        var urlSearchParams = new URLSearchParams(urlString);
        var params = Object.fromEntries(urlSearchParams.entries());
        console.log(params);
        return params.jsontemplate ? params.jsontemplate : null;
    }
    function topWindow() {
        GM.setValue('canvasFound', false);
        var params = findParams(window.location.hash.substring(1)) || findParams(window.location.search.substring(1));
        if (params) {
            jsontemplate = params;
            GM.setValue('jsontemplate', jsontemplate);
        }
    }
    function canvasWindow() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var sleep$1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sleep$1 = 0;
                        _c.label = 1;
                    case 1:
                        if (!!canvasElement) return [3 /*break*/, 4];
                        return [4 /*yield*/, GM.getValue('canvasFound')];
                    case 2:
                        if ((_c.sent()) && !windowIsEmbedded()) {
                            console.log('canvas found by iframe');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, sleep(1000 * sleep$1)];
                    case 3:
                        _c.sent();
                        sleep$1++;
                        console.log("trying to find canvas");
                        findCanvas(document.documentElement);
                        return [3 /*break*/, 1];
                    case 4:
                        GM.setValue('canvasFound', true);
                        sleep$1 = 0;
                        _c.label = 5;
                    case 5:
                        if (!jsontemplate) return [3 /*break*/, 6];
                        runCanvas(jsontemplate, canvasElement);
                        return [3 /*break*/, 10];
                    case 6:
                        if (!windowIsEmbedded()) return [3 /*break*/, 8];
                        return [4 /*yield*/, GM.getValue('jsontemplate')];
                    case 7:
                        jsontemplate = (_b = (_a = (_c.sent())) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : '';
                        _c.label = 8;
                    case 8: return [4 /*yield*/, sleep(1000 * sleep$1)];
                    case 9:
                        _c.sent();
                        sleep$1++;
                        return [3 /*break*/, 5];
                    case 10: return [2 /*return*/];
                }
            });
        });
    }
    function runCanvas(jsontemplate, canvasElement) {
        var manager = new TemplateManager(canvasElement, jsontemplate);
        window.setInterval(function () {
            manager.update();
        }, UPDATE_PERIOD_MILLIS);
    }
    console.log("running templating script in ".concat(window.location.href));
    if (!windowIsEmbedded()) {
        // we are the top window
        topWindow();
    }
    canvasWindow();

})();
