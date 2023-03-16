
// ==UserScript==
// @name			template-manager
// @version			0.1.0
// @description		Manages your templates on various canvas games
// @author			LittleEndu
// @license			MIT
// @grant			GM.xmlHttpRequest
// @grant			GM.setValue
// @grant			GM.getValue
//
// Created with love using Gorilla
// ==/UserScript==

(function () {
    'use strict';

    var MAX_TEMPLATES = 100;
    var CACHE_BUST_PERIOD = 1000 * 60 * 2;
    var UPDATE_PERIOD_MILLIS = 100;
    var SECONDS_SPENT_BLINKING = 5;
    var AMOUND_OF_BLINKING = 11;

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
        var m = Math.round(1 / percentage);
        var r = Math.floor(randomness * m);
        for (var i = 0; i < frameWidth; i++) {
            for (var j = 0; j < frameHeight; j++) {
                if (negativeSafeModulo(i + x + (j + y) * 2 + r, m) !== 0) {
                    // TODO: use priority mask here
                    continue;
                }
                var imageIndex = (j * frameWidth + i) * 4;
                var middlePixelIndex = ((j * 3 + 1) * rv.width + i * 3 + 1) * 4;
                rv.data[middlePixelIndex] = imageData.data[imageIndex];
                rv.data[middlePixelIndex + 1] = imageData.data[imageIndex + 1];
                rv.data[middlePixelIndex + 2] = imageData.data[imageIndex + 2];
                rv.data[middlePixelIndex + 3] = imageData.data[imageIndex + 3];
            }
        }
        return rv;
    }

    var Template = /** @class */ (function () {
        function Template(params, mountPoint, priority) {
            var _this = this;
            this.imageLoader = new Image();
            this.canvasElement = document.createElement('canvas');
            this.loading = false;
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
            this.startTime = params.startTime || 1;
            this.looping = params.looping || this.frameCount > 1;
            // assign from arguments
            this.mountPoint = mountPoint;
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
            if (this.loading)
                return;
            if (this.sources.length === 0)
                return;
            this.loading = true;
            var candidateSource = this.sources[0];
            console.log("trying to load ".concat(candidateSource));
            this.imageLoader.src = candidateSource;
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
            var templateElements = this.mountPoint.children;
            var templateElementsArray = Array.from(templateElements).filter(function (element) { return element.hasAttribute('priority'); });
            if (templateElementsArray.length === 0) {
                this.mountPoint.appendChild(this.canvasElement);
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
                    this.mountPoint.appendChild(this.canvasElement);
                }
                else {
                    this.mountPoint.insertBefore(this.canvasElement, templateElementsArray[index + 1]);
                }
            }
        };
        Template.prototype.frameStartTime = function (n) {
            if (n === void 0) { n = null; }
            return (this.startTime + (n || this.currentFrame) * this.frameSpeed) % this.animationDuration;
        };
        Template.prototype.update = function (percentage, randomness, currentSeconds) {
            var _a;
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
                    percentage *= 0.25;
                }
            }
            // update canvas if necessary
            if (this.currentFrame !== frameIndex || this.currentPercentage !== percentage) {
                console.log("updating ".concat(this.name));
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
        function TemplateManager(mountPoint, startingUrl) {
            this.alreadyLoaded = new Array();
            this.whitelist = new Array();
            this.blacklist = new Array();
            this.templates = new Array();
            this.responseDiffs = new Array();
            this.randomness = Math.random();
            this.mountPoint = mountPoint;
            this.startingUrl = startingUrl;
            this.loadTemplatesFromJsonURL(startingUrl);
        }
        TemplateManager.prototype.loadTemplatesFromJsonURL = function (url) {
            var _this = this;
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
                                _this.templates.push(new Template(json.templates[i], _this.mountPoint, _this.templates.length));
                            }
                        }
                    }
                }
            });
        };
        TemplateManager.prototype.currentSeconds = function () {
            var averageDiff = this.responseDiffs.reduce(function (a, b) { return a + b; }, 0) / (this.responseDiffs.length);
            return (Date.now() + averageDiff) / 1000;
        };
        TemplateManager.prototype.update = function () {
            for (var i = 0; i < this.templates.length; i++)
                this.templates[i].update(1, this.randomness, this.currentSeconds());
            if (this.templates.length < MAX_TEMPLATES) {
                while (this.whitelist.length > 0) {
                    this.loadTemplatesFromJsonURL(this.whitelist.shift());
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

    console.log('running Templating script');
    var urlSearchParams = new URLSearchParams(window.location.hash.substring(1));
    var params = Object.fromEntries(urlSearchParams.entries());
    console.log(params);
    if (params.jsontemplate) {
        console.log('loading template', params.jsontemplate);
        var manager_1 = new TemplateManager(document.querySelector('#board').parentElement, params.jsontemplate);
        console.log(manager_1);
        window.setInterval(function () {
            manager_1.update();
        }, UPDATE_PERIOD_MILLIS);
    }

})();
