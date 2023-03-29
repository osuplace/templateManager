import * as utils from "../utils";

export class NotificationManager {
    container = document.createElement('div');

    constructor() {
        this.container.style.width = '150px'
        this.container.style.height = '66%'
        this.container.style.position = 'absolute';
        this.container.style.zIndex = '9999'
        this.container.style.top = '-0.1px'
        this.container.style.right = '10px'
        this.container.style.backgroundColor = 'rgba(255, 255, 255, 0)'
        this.container.style.pointerEvents = 'none'
        this.container.style.userSelect = 'none'
        document.body.appendChild(this.container)
    }

    newNotification(url: string, message: string) {
        let div = document.createElement('div');
        div.appendChild(utils.wrapInHtml('i', `${url} says:`));
        div.append(document.createElement('br'));
        div.append(utils.wrapInHtml('b', message));

        div.style.height = '0px'
        div.style.opacity = '0';
        div.style.padding = '0px'
        div.style.margin = '0px'
        div.style.borderRadius = '8px'
        div.style.backgroundColor = '#621';
        div.style.color = '#eee'
        div.style.transition = "height 300ms, opacity 300ms, padding 300ms, margin 300ms"
        div.style.overflow = 'hidden'
        div.style.pointerEvents = 'auto'

        div.onclick = () => {
            div.style.opacity = '0'
            div.style.height = '0px'
            div.style.padding = '0px'
            div.style.margin = '0px'
            setTimeout(() => div.remove(), 500)
        }

        this.container.appendChild(div)
        setTimeout(() => {
            div.style.opacity = '1'
            div.style.height = 'auto'
            div.style.padding = '8px'
            div.style.margin = '8px'
        }, 100)
    }
}