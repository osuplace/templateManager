export function negativeSafeModulo(a: number, b: number): number {
    return (a % b + b) % b;
}

export function getFileStemFromUrl(url: string) {
    const lastSlashIndex = url.lastIndexOf('/');
    const fileName = url.slice(lastSlashIndex + 1);
    const lastDotIndex = fileName.lastIndexOf('.');
    const fileStem = (lastDotIndex === -1) ? fileName : fileName.slice(0, lastDotIndex);
    return fileStem;
}

export function windowIsEmbedded() {
    return window.top !== window.self
}

export async function sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

export function stringToHtml(str: string): HTMLElement {
    let div = document.createElement('div');
    div.innerHTML = str
    return div.firstChild as HTMLElement
}

export function wrapInHtml(html: string, str: string): HTMLElement {
    let tag = document.createElement(html);
    tag.innerText = str;
    return tag
}

export function removeItem<T>(array: Array<T>, item: T): void {
    let index = array.indexOf(item);
    if (index !== -1) {
        array.splice(index, 1);
    }
}

function findJSONTemplateInParams(urlString: string): string | null {
    const urlSearchParams = new URLSearchParams(urlString);
    const params = Object.fromEntries(urlSearchParams.entries());
    console.log(params)
    return params.jsontemplate ? params.jsontemplate : null;
}

export function findJSONTemplateInURL(url: URL | Location): string | null {
    return findJSONTemplateInParams(url.hash.substring(1)) || findJSONTemplateInParams(url.search.substring(1))
}

export function findElementOfType<T>(element: Element | ShadowRoot, type: new () => T): T[] {
    let rv = []
    if (element instanceof type) {
        console.log('found canvas', element, window.location.href);
        rv.push(element);
    }

    // find in Shadow DOM elements
    if (element instanceof HTMLElement && element.shadowRoot) {
        rv.push(...findElementOfType(element.shadowRoot, type))
    }
    // find in children
    for (let c = 0; c < element.children.length; c++) {
        rv.push(...findElementOfType(element.children[c], type))
    }
    return rv
}

