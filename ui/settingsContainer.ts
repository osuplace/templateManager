import { TemplateManager } from "../templateManager";

export class Settings {
    div = document.createElement("div");
    constructor(manager: TemplateManager | null) {
        // yeah this is all hardcoded xd
        document.body.appendChild(this.div);
        this.div.style.transition = "opacity 300ms";
        this.div.style.width = "100%"
        this.div.style.height = "100%"
        this.div.style.position = "absolute";
        this.div.style.left = "-0.1px";
        this.div.style.top = "-0.1px";
        this.div.style.backgroundColor = "rgba(0, 0, 0, 0.5)"
        this.div.style.padding = "0";
        this.div.style.margin = "0";
        this.div.style.opacity = "0";
        this.div.style.pointerEvents = "none"
        this.div.onclick = () => {
            this.close();
        }
    }

    open() {
        this.div.style.opacity = "1"
        this.div.style.pointerEvents = "auto"
    }

    close() {
        this.div.style.opacity = "0"
        this.div.style.pointerEvents = "none"
    }
}