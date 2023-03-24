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