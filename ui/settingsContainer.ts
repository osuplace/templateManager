import { MAX_TEMPLATES, SETTINGS_CSS } from "../constants";
import { TemplateManager } from "../templateManager";
import * as utils from "../utils";

function createButton(text: string, callback: () => void) {
    let button = document.createElement("button");
    button.innerText = text;
    button.onclick = () => callback();
    button.className = "settingsButton"
    return button;
}

function createSlider(Text: string, value: string, callback: (n: number) => void) {
    let div = document.createElement("div");
    div.className = "settingsSliderBox"
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
    div.className = "settingsCheckbox"
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
    overlay = document.createElement("div");
    checkboxes = document.createElement("div");
    manager: TemplateManager;
    constructor(manager: TemplateManager) {
        this.manager = manager;

        document.body.appendChild(this.overlay);
        let style = document.createElement("style")
        style.innerHTML = SETTINGS_CSS;
        document.body.appendChild(style);

        this.overlay.id = "settingsOverlay"
        this.overlay.style.opacity = "0"
        this.overlay.onclick = (ev) => {
            if (ev.target === ev.currentTarget)
                this.close();
        }
        window.addEventListener("keydown", (ev) => {
            if (ev.key === "Escape") {
                this.close();
            }
        })

        let div = document.createElement('div')
        div.className = "settingsWrapper"
        

        div.appendChild(document.createElement('br'))
        let label = document.createElement("label")
        label.textContent = ".json Template settings"
        label.style.textShadow = "-1px -1px 1px #111, 1px 1px 1px #111, -1px 1px 1px #111, 1px -1px 1px #111"
        label.style.color = "#eee"
        div.appendChild(label)
        div.appendChild(document.createElement('br'))
        div.appendChild(createButton("Reload the template", () => manager.reload()))
        div.appendChild(document.createElement('br'))
        div.appendChild(createSlider("Templates to load", "4", (n) => {
            manager.templatesToLoad = (n + 1) * MAX_TEMPLATES / 5
        }))
        div.appendChild(document.createElement('br'))
        div.appendChild(createButton("Generate new randomness", () => {
            let currentRandomness = manager.randomness;
            while (true) {
                manager.randomness = Math.random()
                if (Math.abs(currentRandomness - manager.randomness) > 1 / 3) break;
            }

        }))
        div.appendChild(document.createElement('br'))
        div.appendChild(createSlider("Dither amount", "1", (n) => {
            manager.percentage = 1 / (n / 10 + 1)
        }))
        div.appendChild(document.createElement('br'))
        div.appendChild(createBoldCheckbox('', "Show contact info besides templates", false, (a) => {
            manager.setContactInfoDisplay(a)
        }))
        div.appendChild(document.createElement('br'))

        this.checkboxes.className = "settingsWrapper"

        this.overlay.appendChild(div)
        this.overlay.appendChild(this.checkboxes)
    }

    open() {
        this.overlay.style.opacity = "1"
        this.overlay.style.pointerEvents = "auto"
        this.populateNotifications()
    }

    close() {
        this.overlay.style.opacity = "0"
        this.overlay.style.pointerEvents = "none"
    }

    toggle() {
        if (this.overlay.style.opacity === "0") {
            this.open()
        } else {
            this.close()
        }
    }

    changeMouseEvents(enabled: boolean) {
        if (this.overlay.style.opacity === "0")
            this.overlay.style.pointerEvents = enabled ? "auto" : "none"
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