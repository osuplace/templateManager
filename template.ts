import * as utils from './utils';
import * as cf from './canvasFunctions'
import { UPDATE_PERIOD_MILLIS, SECONDS_SPENT_BLINKING, AMOUNT_OF_BLINKING, ANIMATION_DEFAULT_PERCENTAGE } from './constants';

interface TemplateParams {
    name: string | null
    sources: string[];
    x: number
    y: number
    frameWidth: number | null
    frameHeight: number | null
    frameCount: number | null
    frameRate: number | null
    frameSpeed: number | null // alias for frameRate
    startTime: number | null
    looping: boolean | null
}

interface NamedUrl {
    name: string | null
    url: string
}

export interface NotificationTypes {
    key: string
    message: string
}

export interface NotificationServer {
    url: string
    types: NotificationTypes[]
}

export interface JsonParams {
    templates: TemplateParams[]
    notifications: NotificationServer
    whitelist: NamedUrl[]
    blacklist: NamedUrl[]
}

export class Template {
    name: string | null
    sources: string[];
    x: number
    y: number
    frameWidth: number | null
    frameHeight: number | null
    frameCount: number
    frameSpeed: number
    startTime: number
    looping: boolean
    priority: number

    globalCanvas: HTMLCanvasElement
    imageLoader = new Image()
    canvasElement = document.createElement('canvas')

    blinkingPeriodMillis: number
    animationDuration: number;

    constructor(params: TemplateParams, globalCanvas: HTMLCanvasElement, priority: number) {
        // assign params
        this.name = params.name
        this.sources = params.sources
        this.x = params.x
        this.y = params.y
        this.frameWidth = params.frameWidth
        this.frameHeight = params.frameHeight
        this.frameCount = params.frameCount || 1
        this.frameSpeed = params.frameRate || params.frameSpeed || Infinity
        this.startTime = params.startTime || 0
        this.looping = params.looping || this.frameCount > 1
        // assign from arguments
        this.globalCanvas = globalCanvas
        this.priority = priority

        //calulate from consts
        let period = SECONDS_SPENT_BLINKING * 1000 / AMOUNT_OF_BLINKING;
        this.blinkingPeriodMillis = Math.floor(period / UPDATE_PERIOD_MILLIS) * UPDATE_PERIOD_MILLIS
        this.animationDuration = (this.frameCount * this.frameSpeed)

        // initialize image loader
        // set image loader style
        this.imageLoader.style.position = 'absolute';
        this.imageLoader.style.top = '0';
        this.imageLoader.style.left = '0';
        this.imageLoader.style.width = '1px';
        this.imageLoader.style.height = '1px';
        this.imageLoader.style.opacity = `${Number.MIN_VALUE}`;
        this.imageLoader.style.pointerEvents = 'none';
        document.body.appendChild(this.imageLoader) // firefox doesn't seem to load images outside of DOM

        // set image loader event listeners
        this.imageLoader.addEventListener('load', () => {
            if (!this.frameWidth || !this.frameHeight) {
                this.frameWidth = this.imageLoader.naturalWidth
                this.frameHeight = this.imageLoader.naturalHeight
            }
            if (!this.name) {
                this.name = utils.getFileStemFromUrl(this.imageLoader.src)
            }
            this.initCanvas()
            this.loading = false
        })
        this.imageLoader.addEventListener('error', () => {
            this.loading = false
            // assume loading from this source fails
            this.sources.shift()
        })
    }

    loading = false
    tryLoadSource() {
        if (this.loading) return;
        if (this.sources.length === 0) return;
        this.loading = true
        let candidateSource = this.sources[0]
        let displayName = this.name ? this.name + ': ' : ''
        console.log(`${displayName}trying to load ${candidateSource}`)
        GM.xmlHttpRequest({
            method: 'GET',
            url: candidateSource,
            responseType: 'blob',
            onload: (response) => {
                this.imageLoader.src = URL.createObjectURL(response.response)
            }
        })
    }

    getCurrentFrameIndex(currentSeconds: number) {
        if (!this.looping && this.startTime + this.frameCount * this.frameSpeed < currentSeconds)
            return this.frameCount - 1

        return utils.negativeSafeModulo(Math.floor((currentSeconds - this.startTime) / this.frameSpeed), this.frameCount)
    }

    initCanvas() {
        this.canvasElement.style.position = 'absolute'
        this.canvasElement.style.top = `${this.y}px`;
        this.canvasElement.style.left = `${this.x}px`;
        this.canvasElement.style.width = `${this.frameWidth}px`;
        this.canvasElement.style.height = `${this.frameHeight}px`;
        this.canvasElement.style.pointerEvents = 'none'
        this.canvasElement.style.imageRendering = 'pixelated'
        this.canvasElement.setAttribute('priority', this.priority.toString())

        // find others and append to correct position
        let templateElements = this.globalCanvas.parentElement!.children;
        let templateElementsArray: Array<Element> = Array.from(templateElements).filter(element => element.hasAttribute('priority'));

        if (templateElementsArray.length === 0) {
            this.globalCanvas.parentElement!.appendChild(this.canvasElement);
        } else {
            // add the new template element to the array
            templateElementsArray.push(this.canvasElement);
            // sort the array by priority
            templateElementsArray.sort((a, b) => parseInt(b.getAttribute('priority')!) - parseInt(a.getAttribute('priority')!));
            // find the index of the new template element in the sorted array
            let index = templateElementsArray.findIndex(element => element === this.canvasElement);
            // insert the new template element at the index
            if (index === templateElementsArray.length - 1) {
                this.globalCanvas.parentElement!.appendChild(this.canvasElement);
            } else {
                this.globalCanvas.parentElement!.insertBefore(this.canvasElement, templateElementsArray[index + 1]);
            }
        }
    }

    currentFrame: number | undefined
    currentPercentage: number | undefined
    currentRandomness: number | undefined

    frameStartTime(n: number | null = null) {
        return (this.startTime + (n || this.currentFrame || 0) * this.frameSpeed) % this.animationDuration
    }

    updateStyle() {
        // for canvas games where the canvas itself has css applied
        let globalRatio = parseFloat(this.globalCanvas.style.width) / this.globalCanvas.width
        this.canvasElement.style.width = `${this.frameWidth! * globalRatio}px`
        this.canvasElement.style.height = `${this.frameHeight! * globalRatio}px`
        this.canvasElement.style.left = `${this.x * globalRatio}px`
        this.canvasElement.style.top = `${this.y * globalRatio}px`
    }

    update(percentage: number, randomness: number, currentSeconds: number) {
        this.updateStyle()

        // return if the animation is finished
        if (!this.looping && currentSeconds > this.startTime + this.frameSpeed * this.frameCount) {
            return;
        }

        // return if image isn't loaded yet
        if (!this.imageLoader.complete || !this.imageLoader.src) {
            this.tryLoadSource()
            return;
        }

        // return if canvas not initialized (works because last step of canvas initialization is inserting it to DOM)
        if (!this.canvasElement.isConnected) {
            return;
        }

        // set percentage for animated
        let frameIndex = this.getCurrentFrameIndex(currentSeconds)
        if (this.frameCount > 1 && this.frameSpeed > 30) {
            let framePast = currentSeconds % this.animationDuration - this.frameStartTime(frameIndex)
            let framePercentage = framePast / this.frameSpeed
            if (framePercentage < 0.5) {
                percentage *= ANIMATION_DEFAULT_PERCENTAGE
            }
        }
        // update canvas if necessary
        if (this.currentFrame !== frameIndex || this.currentPercentage !== percentage || this.currentRandomness !== randomness) {
            let frameData = cf.extractFrame(this.imageLoader, this.frameWidth!, this.frameHeight!, frameIndex)
            if (!frameData) return;
            let ditheredData = cf.ditherData(frameData, randomness, percentage, this.x, this.y, this.frameWidth!, this.frameHeight!)

            this.canvasElement.width = ditheredData.width
            this.canvasElement.height = ditheredData.height
            this.canvasElement.getContext('2d')?.putImageData(ditheredData, 0, 0)
        }

        // update done
        this.currentPercentage = percentage
        this.currentFrame = frameIndex
        this.currentRandomness = randomness
        this.blinking(currentSeconds)
    }

    blinking(currentSeconds: number) {
        // return if no blinking needed
        if (this.frameSpeed === Infinity || this.frameSpeed < 30 || this.frameCount === 1) return;

        let frameEndTime = this.frameStartTime() + this.frameSpeed
        let blinkTime = (currentSeconds % this.animationDuration) + (AMOUNT_OF_BLINKING * this.blinkingPeriodMillis / 1000)
        if (blinkTime > frameEndTime) {
            let blinkDiff = blinkTime - frameEndTime
            this.canvasElement.style.opacity = Math.floor(blinkDiff / (this.blinkingPeriodMillis / 1000)) % 2 === 0 ? '0' : '1'
        } else {
            this.canvasElement.style.opacity = '1'
        }
    }

    destroy() {
        this.imageLoader.parentElement?.removeChild(this.imageLoader)
        this.imageLoader = new Image();
        this.canvasElement.parentElement?.removeChild(this.canvasElement)
        this.canvasElement = document.createElement('canvas')
    }

    async fakeReload(time:number) {
        this.canvasElement.style.opacity = '0'
        await utils.sleep(300 + time)
        this.canvasElement.style.opacity = '1'
    }
}

