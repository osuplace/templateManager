import * as utils from "../utils";

export class NotificationManager {
    container = document.createElement('div');

    constructor() {
        this.container.id = 'osuplaceNotificationContainer'
        document.body.appendChild(this.container)
    }

    newNotification(url: string, message: string) {
        let div = document.createElement('div');
        div.appendChild(utils.wrapInHtml('i', `${url} says:`));
        div.append(document.createElement('br'));
        div.append(utils.wrapInHtml('b', message));
        div.className = 'osuplaceNotification'
        div.onclick = () => {
            div.classList.remove('visible');
            setTimeout(() => div.remove(), 500)
        }

        this.container.appendChild(div)
        setTimeout(() => {
            div.classList.add('visible');
        }, 100)
    }
}