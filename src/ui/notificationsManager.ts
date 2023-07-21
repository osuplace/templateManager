import * as utils from "../utils";

const NOTIFICATION_SOUND_URL = 'https://files.catbox.moe/c9nwlu.mp3';

const context = new AudioContext();

export class NotificationManager {
    container = document.createElement('div');
    notificationSound?: AudioBufferSourceNode;

    constructor() {
        this.container.id = 'osuplaceNotificationContainer'
        document.body.appendChild(this.container)

        const error = (err: any) => {
            console.error(`failed to load the notification sound`, err);
            this.newNotification('notifications manager', 'Failed to load the notifications sound. It will not play.');
        };

        GM.xmlHttpRequest({
            method: 'GET',
            url: NOTIFICATION_SOUND_URL,
            responseType: 'arraybuffer',
            onload: (response) => {
                try {
                    context.decodeAudioData(response.response, (buffer) => {
                        this.notificationSound = context.createBufferSource();
                        this.notificationSound.buffer = buffer;
                        this.notificationSound.connect(context.destination);
                    }, error);
                } catch (e) {
                    error(e);
                }
            },
            onerror: error
        });
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

        if (this.notificationSound) {
            try {
                this.notificationSound.start(0);
            } catch (err) {
                console.error('failed to play notification audio', err);
            }
        }
    }
}
