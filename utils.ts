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