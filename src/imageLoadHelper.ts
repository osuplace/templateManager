import * as utils from "./utils";

export class ImageLoadHelper {
    name: string | undefined;
    sources: string[];
    imageLoader = new Image()
    imageBitmap: any = undefined
    loading = false;
    constructor(name: string | undefined, sources: string[] | undefined) {
        this.name = name;
        this.sources = sources || [];

        if (this.sources.length === 0) return // do not attach imageLoader to DOM

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
            if (!this.name) {
                this.name = utils.getFileStemFromUrl(this.imageLoader.src)
            }
            this.loading = false
        })
        this.imageLoader.addEventListener('error', () => {
            this.loading = false
            // assume loading from this source fails
            this.sources.shift()
        })

        this.tryLoadSource()
    }

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
                if (response.status === 200) {
                    let a = new FileReader()
                    a.onload = (e) => {
                        this.imageLoader.src = e.target!.result!.toString()
                    }
                    a.readAsDataURL(response.response)
                    
                }
                else
                    this.sources.shift()
            }
        })
    }

    getImage() : HTMLImageElement | undefined{
        if (!this.imageLoader.complete || !this.imageLoader.src) {
            this.tryLoadSource()
            return;
        }
        return this.imageLoader
    }

    destroy() {
        this.imageLoader.parentElement?.removeChild(this.imageLoader)
        this.imageLoader = new Image();
    }
}