import { UPDATE_PERIOD_MILLIS } from "./constants";

export function run() {
    let reticuleStyleSetter = setInterval(() => {
        let embed = document.querySelector('garlic-bread-embed')
        let preview = embed?.shadowRoot?.querySelector('garlic-bread-pixel-preview')
        if (preview) {
            clearInterval(reticuleStyleSetter)
            let style = document.createElement('style')
            style.innerHTML = '.pixel { clip-path: polygon(-20% -20%, 120% -20%, 120% 20%, 63% 20%, 63% 37%, 37% 37%, 37% 20%, 20% 20%, 20% 37%, 37% 37%, 37% 63%, 20% 63%, 20% 80%, 37% 80%, 37% 63%, 63% 63%, 63% 80%, 80% 80%, 80% 63%, 63% 63%, 63% 37%, 80% 37%, 80% 20%, 120% 20%, 120% 120%, -20% 120%);}';
            console.log(preview)
            preview?.shadowRoot?.appendChild(style);
        }
    }, UPDATE_PERIOD_MILLIS)
}