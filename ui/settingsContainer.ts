import { TemplateManager } from "../templateManager";

function createButton(text: string, callback: () => void) {
    let button = document.createElement("button");
    button.textContent = text;
    button.onclick = () => callback();
    button.style.color = "#eee"
    button.style.backgroundColor = "#19d"
    button.style.padding = "5px"
    button.style.borderRadius = "5px";
    return button;
}

function createSlider(text: string, value: string, callback: (n: number) => void) {
    let div = document.createElement("div");
    div.style.backgroundColor = "#057"
    div.style.padding = "5px"
    div.style.borderRadius = "5px";
    let slider = document.createElement("input");
    slider.type = "range";
    slider.min = '0';
    slider.max = '100';
    slider.step = '1';
    slider.value = value;
    slider.oninput = (ev) => {
        ev.preventDefault()
        callback(parseInt(slider.value))
    };
    slider.style.width = "100%";
    let label = document.createElement("label");
    label.textContent = text;
    label.style.color = "#eee"
    div.append(label);
    div.appendChild(document.createElement("br"));
    div.append(slider);
    return div;
}


export class Settings {
    div = document.createElement("div");
    constructor(manager: TemplateManager) {
        // yeah this is all hardcoded xd
        document.body.appendChild(this.div);
        this.div.style.transition = "opacity 300ms";
        this.div.style.width = "100vw"
        this.div.style.height = "100vh"
        this.div.style.position = "absolute";
        this.div.style.left = "-0.1px";
        this.div.style.top = "-0.1px";
        this.div.style.backgroundColor = "rgba(0, 0, 0, 0.2)"
        this.div.style.padding = "0";
        this.div.style.margin = "0";
        this.div.style.opacity = "0";
        this.div.style.pointerEvents = "none"
        this.div.style.zIndex = `${Number.MAX_SAFE_INTEGER}`
        this.div.style.textAlign = "center"
        this.div.onclick = (ev) => {
            if (ev.target === ev.currentTarget)
                this.close();
        }
        window.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") {
                this.close();
            }
        })

        this.div.appendChild(document.createElement('br'))
        let label = document.createElement("label")
        label.textContent = ".json Template settings"
        label.style.textShadow = "-1px -1px 1px #111, 1px 1px 1px #111, -1px 1px 1px #111, 1px -1px 1px #111"
        this.div.appendChild(label)
        this.div.appendChild(document.createElement('br'))
        this.div.appendChild(createButton("Reload the template", () => manager.reload()))
        this.div.appendChild(document.createElement('br'))
        this.div.appendChild(createButton("Generate new randomness", () => {
            let currentRandomness = manager.randomness;
            while (true) {
                manager.randomness = Math.random()
                if (Math.abs(currentRandomness - manager.randomness) > 1 / 3) break;
            }

        }))
        this.div.appendChild(document.createElement('br'))
        this.div.appendChild(createSlider("Dither amount", "1", (n) => {
            manager.percentage = 1 / (n / 10 + 1)
        }))

        for (let c = 0; c < this.div.children.length; c++) {
            let child = this.div.children[c] as HTMLElement
            child.style.margin = "1% 40%"
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

    toggle() {
        if (this.div.style.pointerEvents === "none") {
            this.open()
        } else {
            this.close()
        }
    }
}