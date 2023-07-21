import { UserscriptAudio } from "../userscriptAudio";
import * as utils from "../utils";

const NOTIFICATION_SOUND_SETTINGS_KEY = 'notificationSound';
const DEFAULT_NOTIFICATION_SOUND_URL = 'https://files.catbox.moe/c9nwlu.mp3';

export class NotificationManager {
    container = document.createElement('div');
    notificationSound?: UserscriptAudio;

    constructor() {
        this.container.id = 'osuplaceNotificationContainer'
        document.body.appendChild(this.container)

        this.getNotificationSound()
        .then((src) => {
            this.initNotificationSound(src)
            .catch((ex) => {
                console.error('failed to init notification sound:', ex);
                this.newNotification('notifications manager', 'Failed to load the notifications sound. It will not play.');
            });
        });
    }

    async getNotificationSound() {
        return await GM.getValue(NOTIFICATION_SOUND_SETTINGS_KEY, DEFAULT_NOTIFICATION_SOUND_URL);
    }
    async setNotificationSound(sound: string) {
        await this.initNotificationSound(sound);
        await GM.setValue(NOTIFICATION_SOUND_SETTINGS_KEY, sound);
    }

    async initNotificationSound(src: string) {
        const newAudio = new UserscriptAudio(src);
        await newAudio.load();
        this.notificationSound = newAudio;
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
                this.notificationSound.play();
            } catch (err) {
                console.error('failed to play notification audio', err);
            }
        }
    }
}
