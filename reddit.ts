import { UPDATE_PERIOD_MILLIS } from "./constants";

export function run() {
    let reticuleStyleSetter = setInterval(() => {
        let embed = document.querySelector("mona-lisa-embed")
        let camera = embed?.shadowRoot?.querySelector("mona-lisa-camera")
        let preview = camera?.querySelector("mona-lisa-pixel-preview")
        if (preview) {
            clearInterval(reticuleStyleSetter)
            let style = document.createElement('style')
            style.innerHTML = '.pixel { clip-path: polygon(-20% -20%, 120% -20%, 100% 0%, 63% 0%, 63% 37%, 37% 37%, 37% 0%, 0% 0%, 0% 37%, 37% 37%, 37% 63%, 0% 63%, 0% 100%, 37% 100%, 37% 63%, 63% 63%, 63% 100%, 100% 100%, 100% 63%, 63% 63%, 63% 37%, 100% 37%, 100% 0%, 120% 0%, 120% 120%, -20% 120%);}'
            console.log(preview)
            preview?.shadowRoot?.appendChild(style);
        }
    }, UPDATE_PERIOD_MILLIS)
}