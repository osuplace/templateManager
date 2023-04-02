import { MAX_TEMPLATES } from "../constants";
import { TemplateManager } from "../templateManager";
import * as utils from "../utils";

function createLabel(text: string) {
    let label = document.createElement("label");
    label.innerText = text;
    return label;
}

function createButton(text: string, callback: () => void) {
    let button = document.createElement("button");
    button.innerText = text;
    button.onclick = () => callback();
    button.className = "settingsButton"
    return button;
}

function createTextInput(buttonText: string, placeholder: string, callback: (value: string) => void) {
    let div = document.createElement("div")
    let textInput = document.createElement("input")
    textInput.type = "text"
    textInput.placeholder = placeholder
    textInput.className = "settingsTextInput"
    let button = createButton(buttonText, () => {
        callback(textInput.value)
    })
    div.appendChild(textInput)
    div.appendChild(button)
    return div
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

function createBoldCheckbox(boldText: string, regularText: string, checked: boolean, callback: (a: boolean) => void, disabled: boolean = false) {
    let div = document.createElement("div");
    div.className = "settingsCheckbox"
    let checkbox = document.createElement('input')
    checkbox.type = "checkbox"
    checkbox.checked = checked;
    checkbox.disabled = disabled;
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
    templateLinksWrapper = document.createElement("div");
    notificationsWrapper = document.createElement("div");
    manager: TemplateManager;
    reloadTemplatesWhenClosed = false;
    constructor(manager: TemplateManager) {
        this.templateLinksWrapper.className = "settingsWrapper"
        this.templateLinksWrapper.id = "templateLinksWrapper"
        this.notificationsWrapper.className = "settingsWrapper"
        this.manager = manager;

        document.body.appendChild(this.overlay);

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

        div.appendChild(createLabel(".json Template settings"))
        div.appendChild(document.createElement('br'))
        div.appendChild(createButton("Reload the template", () => manager.initOrReloadTemplates()))
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


        this.overlay.appendChild(div)
        this.overlay.appendChild(this.templateLinksWrapper)
        this.overlay.appendChild(this.notificationsWrapper)
    }

    open() {
        this.overlay.style.opacity = "1"
        this.overlay.style.pointerEvents = "auto"
        this.populateAll()
    }

    close() {
        this.overlay.style.opacity = "0"
        this.overlay.style.pointerEvents = "none"
        if (this.reloadTemplatesWhenClosed) {
            this.manager.initOrReloadTemplates(true)
            this.reloadTemplatesWhenClosed = false
        }
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

    populateAll() {
        this.populateTemplateLinks()
        this.populateNotifications()
    }

    populateTemplateLinks() {
        while (this.templateLinksWrapper.children.length) {
            this.templateLinksWrapper.children[0].remove()
        }
        GM.getValue(`${window.location.host}_alwaysLoad`).then(value => {
            let templates: string[] = value ? JSON.parse(value as string) : []
            let templateAdder = createTextInput("Always load", "Template URL", async (tx) => {
                let url = new URL(tx)
                let template = utils.findJSONTemplateInURL(url) || url.toString()
                if (templates.includes(template)) return;
                templates.push(template)
                await GM.setValue(`${window.location.host}_alwaysLoad`, JSON.stringify(templates))
                this.populateTemplateLinks()
                this.manager.loadTemplatesFromJsonURL(template)
            })
            this.templateLinksWrapper.appendChild(templateAdder)
            if (templates.length > 0) {
                this.templateLinksWrapper.appendChild(createLabel("Click to remove template from always loading"))
            }
            for (let i = 0; i < templates.length; i++) {
                let button = createButton(templates[i], async () => {
                    button.remove()
                    templates.splice(i, 1)
                    await GM.setValue(`${window.location.host}_alwaysLoad`, JSON.stringify(templates))
                    this.populateTemplateLinks()
                    this.reloadTemplatesWhenClosed = true
                })
                button.className = `${button.className} templateLink`
                this.templateLinksWrapper.appendChild(button)
            }
        })
    }

    populateNotifications() {
        while (this.notificationsWrapper.children.length) {
            this.notificationsWrapper.children[0].remove()
        }
        let keys = this.manager.notificationTypes.keys()
        let key: IteratorResult<string, string>;
        while (!(key = keys.next()).done) {
            let value = key.value
            this.notificationsWrapper.appendChild(createLabel(value))
            let notifications = this.manager.notificationTypes.get(value)
            if (notifications?.length) {
                for (let i = 0; i < notifications.length; i++) {
                    let notification = notifications[i]
                    let enabled = this.manager.enabledNotifications.includes(`${value}??${notification.id}`)
                    if (notification.forced) enabled = true;
                    let checkbox = createBoldCheckbox(notification.id + " - ", notification.description, enabled, async (b) => {
                        utils.removeItem(this.manager.enabledNotifications, `${value}??${notification.id}`)
                        if (b) {
                            this.manager.enabledNotifications.push(`${value}??${notification.id}`)
                        }
                        let enabledKey = `${window.location.host}_notificationsEnabled`
                        await GM.setValue(enabledKey, JSON.stringify(this.manager.enabledNotifications))
                    }, notification.forced)
                    this.notificationsWrapper.append(document.createElement('br'))
                    this.notificationsWrapper.append(checkbox)
                }
            }
            this.notificationsWrapper.append(document.createElement('br'))
        }
    }
}