import * as utils from './utils';
import * as cf from './canvasFunctions'
import { UPDATE_PERIOD_MILLIS, SECONDS_SPENT_BLINKING, AMOUNT_OF_BLINKING, ANIMATION_DEFAULT_PERCENTAGE } from './constants';
import { ImageLoadHelper } from './imageLoadHelper';
import { ImageDataWithCoordinates } from './canvasFunctions';

interface TemplateParams {
    name: string | undefined
    sources: string[];
    priorityMaskSources: string[];
    x: number
    y: number
    frameWidth: number | undefined
    frameHeight: number | undefined
    frameCount: number | undefined
    frameRate: number | undefined
    frameSpeed: number | undefined // alias for frameRate
    startTime: number | undefined
    looping: boolean | undefined
}

export interface NamedURL {
    name: string | undefined
    url: string
}

export interface JsonParams {
    contact: string | undefined
    contactInfo: string | undefined // alias for contact
    templates: TemplateParams[]
    notifications: string | undefined // url to broadcaster
    whitelist: NamedURL[]
    blacklist: NamedURL[]
}

export class Template {
    name: string | undefined
    sources: string[];
    priorityMaskSources: string[] | undefined;
    x: number
    y: number
    frameWidth: number | undefined
    frameHeight: number | undefined
    frameCount: number
    frameSpeed: number
    startTime: number
    looping: boolean
    priority: number

    globalCanvas: HTMLCanvasElement
    imageLoader: ImageLoadHelper;
    priorityMaskLoader: ImageLoadHelper;
    canvasElement = document.createElement('canvas')
    fullImageData: ImageData | undefined;
    ditheredData: ImageData | undefined;
    frameData: ImageData | null | undefined;
    priorityData: ImageData | null | undefined;
    contactElement: HTMLDivElement | undefined
    initialContactCSS: CSSStyleDeclaration | undefined

    blinkingPeriodMillis: number
    animationDuration: number;

    constructor(params: TemplateParams, contact: string | undefined, globalCanvas: HTMLCanvasElement, priority: number) {
        // assign params
        this.name = params.name
        this.sources = params.sources
        this.priorityMaskSources = params.priorityMaskSources
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

        //initialize image loaders
        this.imageLoader = new ImageLoadHelper(this.name, this.sources)
        this.priorityMaskLoader = new ImageLoadHelper(this.name, this.priorityMaskSources)

        // add contact info container
        this.contactX = Math.round(this.x / 5) * 5
        this.contactY = Math.round(this.y / 5) * 5
        if (contact) {
            let checkingCoords = true
            while (checkingCoords) {
                checkingCoords = false
                let contactInfos = this.globalCanvas.parentElement!.querySelectorAll('.iHasContactInfo')
                for (let i = 0; i < contactInfos.length; i++) {
                    let child = contactInfos[i] as HTMLElement
                    let childX = parseInt(child.getAttribute('contactX') ?? '0')
                    let childY = parseInt(child.getAttribute('contactY') ?? '0')
                    let thisRight = this.contactX + 35
                    let childRight = childX + 35
                    let collision = this.contactX <= childRight && this.contactX >= childX || thisRight <= childRight && thisRight >= childX
                    if (
                        child
                        && collision
                        && Math.round(childY) === Math.round(this.contactY)
                    ) {
                        checkingCoords = true
                        this.contactX += 5
                        this.contactY += 5
                        break
                    }
                }
            }
            this.contactElement = document.createElement('div')
            this.contactElement.setAttribute('contactX', this.contactX.toString())
            this.contactElement.setAttribute('contactY', this.contactY.toString())
            this.contactElement.style.left = `${this.contactX}px`;
            this.contactElement.style.top = `${this.contactY}px`;

            let contactPriority = Math.round(Number.MIN_SAFE_INTEGER / 100 + priority)
            this.contactElement.setAttribute('priority', contactPriority.toString())
            this.contactElement.className = 'iHasContactInfo'
            if (params.name) {
                this.contactElement.appendChild(document.createTextNode(params.name))
                this.contactElement.appendChild(document.createElement('br'))
                this.contactElement.appendChild(document.createTextNode(`contact: `))
            }
            this.contactElement.appendChild(document.createTextNode(contact))
            this.insertPriorityElement(this.contactElement)
            this.initialContactCSS = getComputedStyle(this.contactElement)
        }
    }

    contactX: number | undefined
    contactY: number | undefined

    updateStyle(globalRatio: number, left: string, top: string, translate: string, transform: string, zIndex: string) {
        this.canvasElement.style.width = `${this.frameWidth! * globalRatio}px`
        this.canvasElement.style.height = `${this.frameHeight! * globalRatio}px`
        if (left !== "auto")
            this.canvasElement.style.left = `calc(${this.x * globalRatio}px + ${left})`
        else
            this.canvasElement.style.left = `${this.x * globalRatio}px`
        if (top !== "auto")
            this.canvasElement.style.top = `calc(${this.y * globalRatio}px + ${top})`
        else
            this.canvasElement.style.top = `${this.y * globalRatio}px`
        this.canvasElement.style.translate = translate
        this.canvasElement.style.transform = transform
        this.canvasElement.style.zIndex = zIndex

        if (this.contactElement) {
            if (left !== "auto")
                this.contactElement.style.left = `calc(${this.contactX! * globalRatio}px + ${left})`
            else
                this.contactElement.style.left = `${this.contactX! * globalRatio}px`
            if (top !== "auto")
                this.contactElement.style.top = `calc(${this.contactY! * globalRatio}px + ${top})`
            else
                this.contactElement.style.top = `${this.contactY! * globalRatio}px`
            this.contactElement.style.maxWidth = `${30 * globalRatio}px`
            this.contactElement.style.padding = `${globalRatio}px`
            this.contactElement.style.fontSize = `${globalRatio}px`
            this.contactElement.style.translate = translate
            this.contactElement.style.transform = transform
            this.contactElement.style.zIndex = zIndex
        }
    }

    setContactInfoDisplay(enabled: boolean) {
        if (this.contactElement) {
            this.contactElement.style.opacity = enabled ? "1" : "0";
            this.contactElement.style.pointerEvents = enabled ? "auto" : "none";
        }
    }

    setPreviewMode(enabled: boolean) {
        let data = enabled ? this.fullImageData! : this.ditheredData!
        this.canvasElement.width = data.width
        this.canvasElement.height = data.height
        this.canvasElement.getContext('2d')?.putImageData(data, 0, 0)
    }

    hideTemplate(enabled: boolean) {
        this.canvasElement.style.opacity = enabled ? "0" : "1";
    }

    getCurrentFrameIndex(currentSeconds: number) {
        if (!this.looping && this.startTime + this.frameCount * this.frameSpeed < currentSeconds)
            return this.frameCount - 1

        return utils.negativeSafeModulo(Math.floor((currentSeconds - this.startTime) / this.frameSpeed), this.frameCount)
    }

    insertPriorityElement(element: HTMLElement) {
        let container = this.globalCanvas.parentElement!
        let priorityElements = container.children;
        let priorityElementsArray: Array<Element> = Array.from(priorityElements).filter(el => el.hasAttribute('priority'));
        if (priorityElementsArray.length === 0) {
            container.appendChild(element)
        } else {
            priorityElementsArray.push(element)
            priorityElementsArray.sort((a, b) => parseInt(b.getAttribute('priority')!) - parseInt(a.getAttribute('priority')!));
            let index = priorityElementsArray.findIndex(el => el === element);
            if (index === priorityElementsArray.length - 1) {
                container.appendChild(element);
            } else {
                container.insertBefore(element, priorityElementsArray[index + 1]);
            }
        }
    }

    needsCanvasInitialization = true;

    initCanvasIfNeeded(image: HTMLImageElement) {
        if (this.needsCanvasInitialization) {
            if (!this.frameWidth || !this.frameHeight) {
                this.frameWidth = image.naturalWidth
                this.frameHeight = image.naturalHeight
            }

            this.canvasElement.style.position = 'absolute'
            this.canvasElement.style.top = `${this.y}px`;
            this.canvasElement.style.left = `${this.x}px`;
            this.canvasElement.style.width = `${this.frameWidth}px`;
            this.canvasElement.style.height = `${this.frameHeight}px`;
            this.canvasElement.style.pointerEvents = 'none'
            this.canvasElement.style.imageRendering = 'pixelated'
            this.canvasElement.setAttribute('priority', this.priority.toString())

            this.insertPriorityElement(this.canvasElement)
            this.needsCanvasInitialization = false
        }
    }

    currentFrame: number | undefined
    currentPercentage: number | undefined
    currentRandomness: number | undefined

    frameStartTime(n: number | null = null) {
        return (this.startTime + (n || this.currentFrame || 0) * this.frameSpeed) % this.animationDuration
    }

    async update(higherTemplates: Template[], percentage: number, randomness: number, currentSeconds: number) {
        // return if the animation is finished
        if (!this.looping && currentSeconds > this.startTime + this.frameSpeed * this.frameCount) {
            return;
        }

        let image = this.imageLoader.getImage()
        let priorityMask = this.priorityMaskLoader.getImage()
        // return if image isn't loaded yet
        if (!image) return;
        // else initialize canvas
        this.initCanvasIfNeeded(image)

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
            if (!this.frameData || this.frameCount > 1)
                this.frameData = cf.extractFrame(image, this.frameWidth!, this.frameHeight!, frameIndex)
            if (!this.frameData) return;

            if (priorityMask) {
                if (!this.priorityData || this.frameCount > 1) {
                    this.priorityData = cf.extractFrame(priorityMask, this.frameWidth!, this.frameHeight!, frameIndex)
                }
            }

            let frameDatas: ImageDataWithCoordinates[] = [];
            for (let i = 0; i < higherTemplates.length; i++) {
                let other = higherTemplates[i]
                if (this.checkCollision(other) && other.frameData)
                    frameDatas.push({ imagedata: other.frameData, x: this.x - other.x, y: this.y - other.y }) 
                    // the x, y over here are our coords in relation to the other template
            }
            frameDatas.push({ imagedata: this.frameData, x: 0, y: 0 })

            this.fullImageData = frameDatas[frameDatas.length - 1].imagedata
            this.ditheredData = await cf.ditherData(frameDatas, this.priorityData, randomness, percentage, this.x, this.y, this.frameWidth!, this.frameHeight!)

            this.canvasElement.width = this.ditheredData.width
            this.canvasElement.height = this.ditheredData.height
            this.canvasElement.getContext('2d')?.putImageData(this.ditheredData, 0, 0)
        }

        // update done
        this.currentPercentage = percentage
        this.currentFrame = frameIndex
        this.currentRandomness = randomness
        this.blinking(currentSeconds)
    }

    checkCollision(other: Template) {
        if (!this.frameWidth || !this.frameHeight || !other.frameWidth || !other.frameHeight)
            return false
        let thisRight = this.x + this.frameWidth
        let thisBottom = this.y + this.frameHeight
        let otherRight = other.x + other.frameWidth
        let otherBottom = other.y + other.frameHeight
        if (
            this.x > otherRight ||   // this template is to the right of the other template
            thisRight < other.x ||   // this template is to the left of the other template
            this.y > otherBottom ||  // this template is below the other template
            thisBottom < other.y     // this template is above the other template
        ) {
            return false
        }
        return true
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
        this.imageLoader.destroy()
        this.priorityMaskLoader.destroy()
        this.canvasElement.parentElement?.removeChild(this.canvasElement)
        this.canvasElement = document.createElement('canvas')
        this.contactElement?.parentElement?.removeChild(this.contactElement)
        this.contactElement = undefined
    }

    async fakeReload(time: number) {
        this.canvasElement.style.opacity = '0'
        await utils.sleep(300 + time)
        this.canvasElement.style.opacity = '1'
    }
}

