const css = (x: any) => x
export const MAX_TEMPLATES = 100;
export const CACHE_BUST_PERIOD = 1000 * 60 * 2
export const UPDATE_PERIOD_MILLIS = 100
export const TEMPLATE_RELOAD_INTERVAL = 1000 * 60 * 5
export const SECONDS_SPENT_BLINKING = 5;
export const AMOUNT_OF_BLINKING = 11
export const ANIMATION_DEFAULT_PERCENTAGE = 1 / 3
export const NO_JSON_TEMPLATE_IN_PARAMS = "no_json_template"
export const NOTIFICATION_SOUND_SETTINGS_KEY = 'notificationSound';
export const DEFAULT_NOTIFICATION_SOUND_URL = 'https://files.catbox.moe/c9nwlu.mp3';
export const CONTACT_INFO_CSS = css`
    div.iHasContactInfo {
        max-width: 30px; 
        padding: 1px;
        font-size: 1px; /* these 3 will be overwritten, but oh well */
        width: max-content; 
        white-space: nowrap;
        overflow: hidden;
        font-weight: bold;
        font-family: serif; /* this fixes firefox */
        color: #eee;
        background-color: #111;
        opacity: 0;
        transition: opacity 500ms, width 200ms, height 200ms, max-width 200ms;
        position: absolute;
        pointer-events: none;
        z-index: 9999999;
    }

    div.iHasContactInfo:hover {
        z-index: 99999999;
        max-width: 100%;
        width: auto;
    }
`
export const GLOBAL_CSS = css`
    #osuplaceNotificationContainer {
        width: 200px;
        height: 66%;
        position: absolute;
        z-index: 9999;
        top: -0.1px;
        right: 10px;
        background-color: rgba(255, 255, 255, 0);
        pointer-events: none;
        user-select: none;
    }

    .osuplaceNotification {
        border-radius: 8px;
        background-color: #621;
        color: #eee;
        transition: height 300ms, opacity 300ms, padding 300ms, margin 300ms;
        overflow: hidden;
        pointer-events: auto;
        cursor: pointer;
        word-wrap: break-word;
        height: 0px;
        opacity: 0;
        padding: 0px;
        margin: 0px;
    }

    .osuplaceNotification.visible { 
        height: auto;
        opacity: 1;
        padding: 8px;
        margin: 8px;
    }

    #settingsOverlay {
        transition: opacity 300ms ease 0s;
        width: 100vw;
        height: 100vh;
        position: absolute;
        left: -0.1px;
        top: -0.1px;
        background-color: rgba(0, 0, 0, 0.25);
        padding: 0px;
        margin: 0px;
        opacity: 0;
        pointer-events: none;
        z-index: 2147483647;
        text-align: center;
        user-select: none;
        overflow-y: auto;
        font-size: 14px;
    }
`

export const SETTINGS_CSS = css`
    label,
    button{
        height: auto;
        white-space: normal;
        word-break: break-word;
        text-shadow: -1px -1px 1px #111, 1px 1px 1px #111, -1px 1px 1px #111, 1px -1px 1px #111;
        color: #eee;
    }

    input {
        width: auto;
        max-width: 100%;
        height: auto;
        color: #eee;
        background-color: #111;
        -webkit-appearance: auto;
        border-radius: 5px;
        font-size: 14px;
    }

    .settingsWrapper {
        background-color: rgba(0, 0, 0, 0.5);
        padding: 8px;
        border-radius: 8px;
        border: 1px solid rgba(238, 238, 238, 0.5);
        margin: 0.5rem auto 0.5rem auto;
        min-width: 13rem;
        max-width: 20%;
    }

    #templateLinksWrapper button{
        word-break: break-all;
        cursor: pointer;
    }

    .settingsWrapper:empty {
        display: none;
    }

    .settingsButton {
        cursor: pointer;
        display: inline-block;
        color: rgb(238, 238, 238);
        background-color: rgba(0, 0, 0, 0.5);
        padding: 0.25rem 0.5rem;
        margin: 0.5rem;
        border-radius: 5px;
        line-height: 1.1em;
        border: 1px solid rgba(238, 238, 238, 0.5);
    }

    .settingsButton:hover {
        background-color: rgba(64, 64, 64, 0.5);
    }

    .settingsSliderBox, .settingsCheckbox {
        background-color: rgba(0, 0, 0, 0.5);
        padding: 0.25rem 0.5rem;
        border-radius: 5px;
        margin: 0.5rem;
    }

    .templateLink:hover {
        background-color: rgba(128, 0, 0, 0.5);
    }
`

