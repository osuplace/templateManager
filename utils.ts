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