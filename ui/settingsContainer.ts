import { MAX_TEMPLATES } from "../constants";
import { TemplateManager } from "../templateManager";
import * as utils from "../utils";

function createButton(text: string, callback: () => void) {
    let button = document.createElement("button");
    button.innerText = text;
    button.onclick = () => callback();
    button.style.color = "#eee"
    button.style.backgroundColor = "#19d"
    button.style.padding = "5px"
    button.style.borderRadius = "5px";
    return button;
}

function createSlider(Text: string, value: string, callback: (n: number) => void) {
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
    label.innerText = Text;
    label.style.color = "#eee"
    div.append(label);
    div.appendChild(document.createElement("br"));
    div.append(slider);
    return div;
}

function createBoldCheckbox(boldText: string, regularText: string, checked: boolean, callback: (a: boolean) => void) {
    let div = document.createElement("div");
    div.style.backgroundColor = "#057"
    div.style.padding = "5px"
    div.style.borderRadius = "5px";
    let checkbox = document.createElement('input')
    checkbox.type = "checkbox"
    checkbox.checked = checked;
    checkbox.oninput = (ev) => {
        ev.preventDefault()
        callback(checkbox.checked)
    }
    let label = document.createElement("label")
    let b = document.createElement("b")
    b.innerText = boldText
    label.append(b)
    label.append(document.createTextNode(regularText))
    label.style.color = "#eee"
    div.append(checkbox);
    div.append(label);
    return div
}


export class Settings {
    div = document.createElement("div");
    checkboxes = document.createElement("div");
    manager: TemplateManager;
    constructor(manager: TemplateManager) {
        this.manager = manager;

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
        this.div.style.userSelect = "none"
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
        label.style.color = "#eee"
        this.div.appendChild(label)
        this.div.appendChild(document.createElement('br'))
        this.div.appendChild(createButton("Reload the template", () => manager.reload()))
        this.div.appendChild(document.createElement('br'))
        this.div.appendChild(createSlider("Templates to load", "4", (n) => {
            manager.templatesToLoad = (n + 1) * MAX_TEMPLATES / 5
        }))
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
        this.div.appendChild(document.createElement('br'))
        this.div.appendChild(createBoldCheckbox('', "Show contact info besides templates", false, (a) => {
            document.querySelectorAll('.iHasContactInfo').forEach((i) => {
                console.log(i as HTMLElement);
                (i as HTMLElement).style.opacity = a ? "1" : "0";
            })
        }))
        this.div.appendChild(document.createElement('br'))

        this.checkboxes.style.backgroundColor = "rgba(0,0,0,0.5)"
        this.checkboxes.style.padding = "8px"
        this.checkboxes.style.borderRadius = "8px"
        this.div.appendChild(this.checkboxes)

        for (let c = 0; c < this.div.children.length; c++) {
            let child = this.div.children[c] as HTMLElement
            child.style.margin = "8px 40%"
        }
    }

    open() {
        this.div.style.opacity = "1"
        this.div.style.pointerEvents = "auto"
        this.populateNotifications()
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

    populateNotifications() {
        while (this.checkboxes.children.length) {
            this.checkboxes.children[0].remove()
        }
        let keys = this.manager.notificationTypes.keys()
        let key: IteratorResult<string, string>;
        while (!(key = keys.next()).done) {
            let value = key.value
            let label = document.createElement("label")
            label.textContent = value
            label.style.textShadow = "-1px -1px 1px #111, 1px 1px 1px #111, -1px 1px 1px #111, 1px -1px 1px #111"
            label.style.color = "#eee"
            this.checkboxes.appendChild(label)
            let notifications = this.manager.notificationTypes.get(value)
            if (notifications?.length) {
                for (let i = 0; i < notifications.length; i++) {
                    let notification = notifications[i]
                    let enabled = this.manager.enabledNotifications.includes(`${value}??${notification.key}`)
                    let checkbox = createBoldCheckbox(notification.key + " - ", notification.message, enabled, async (b) => {
                        utils.removeItem(this.manager.enabledNotifications, `${value}??${notification.key}`)
                        if (b) {
                            this.manager.enabledNotifications.push(`${value}??${notification.key}`)
                        }
                        let enabledKey = `${window.location.host}_notificationsEnabled`
                        await GM.setValue(enabledKey, JSON.stringify(this.manager.enabledNotifications))
                    })
                    this.checkboxes.append(document.createElement('br'))
                    this.checkboxes.append(checkbox)
                }
            }
            this.checkboxes.append(document.createElement('br'))
        }
    }
}