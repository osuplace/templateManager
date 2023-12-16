import * as utils from './utils'

const ALPHA_THRESHOLD = 2

export function extractFrame(image: HTMLImageElement, frameWidth: number, frameHeight: number, frameIndex: number): ImageData | null {
    if (!image.complete) return null;
    if (image.naturalWidth === 0 || image.naturalHeight === 0) return null;
    let canvas = document.createElement('canvas')
    canvas.width = frameWidth
    canvas.height = frameHeight
    let context = canvas.getContext('2d')
    if (!context) return null;

    let gridWidth = Math.round(image.naturalWidth / frameWidth)
    let gridX = frameIndex % gridWidth
    let gridY = Math.floor(frameIndex / gridWidth)
    context.drawImage(
        image,
        gridX * frameWidth, gridY * frameHeight,
        frameWidth, frameHeight,
        0, 0,
        frameWidth, frameHeight,
    );
    return context.getImageData(0, 0, frameWidth, frameHeight)
}

export interface ImageDataWithCoordinates {
    imagedata: ImageData
    x: number
    y: number
}

interface RGBA {
    r: number
    g: number
    b: number
    a: number
}

function getHighestRGBA(datas: ImageDataWithCoordinates[], x: number, y: number): RGBA {
    let lastData = datas[datas.length - 1];
    for (let i = 0; i < datas.length; i++) {
        let img = datas[i]
        let xx = x + img.x
        let yy = y + img.y
        if (xx < 0 || xx >= img.imagedata.width || yy < 0 || yy >= img.imagedata.height)
            continue
        let index = (yy * img.imagedata.width + xx) * 4
        let lastIndex = (y * lastData.imagedata.width + x) * 4
        if (img.imagedata.data[index + 3] > ALPHA_THRESHOLD && lastData.imagedata.data[lastIndex +3] > ALPHA_THRESHOLD) {
            return { r: img.imagedata.data[index], g: img.imagedata.data[index + 1], b: img.imagedata.data[index + 2], a: img.imagedata.data[index + 3] }
        }
    }
    return { r: 0, g: 0, b: 0, a: 0 }
}

export async function ditherData(imageDatas: ImageDataWithCoordinates[], priorityData: ImageData | undefined | null, randomness: number, percentage: number, x: number, y: number, frameWidth: number, frameHeight: number): Promise<ImageData> {
    let rv = new ImageData(frameWidth * 3, frameHeight * 3)
    let m = Math.round(1 / percentage) // which nth pixel should be displayed
    let r = Math.floor(randomness * m) // which nth pixel am I (everyone has different nth pixel)
    let sleepCounter = 0
    for (let i = 0; i < frameWidth; i++) {
        for (let j = 0; j < frameHeight; j++) {
            sleepCounter++
            if (sleepCounter%100===0){
                await utils.sleep(0.1)
            }
            let rgba = getHighestRGBA(imageDatas, i, j)
            if (rgba.a < ALPHA_THRESHOLD)
                continue
            let imageIndex = (j * frameWidth + i) * 4
            let middlePixelIndex = ((j * 3 + 1) * rv.width + i * 3 + 1) * 4;
            let alpha = priorityData ? priorityData.data[imageIndex] : rgba.a

            let p = percentage > 0.99 ? 1 : Math.ceil(m / (alpha / 200))
            if (utils.negativeSafeModulo(i + x + (j + y) * 2 + r, p) !== 0) {
                continue
            }

            rv.data[middlePixelIndex] = rgba.r;
            rv.data[middlePixelIndex + 1] = rgba.g;
            rv.data[middlePixelIndex + 2] = rgba.b;
            rv.data[middlePixelIndex + 3] = alpha > ALPHA_THRESHOLD ? 255 : 0;
        }
    }
    return rv
}