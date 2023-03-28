const css = (x: any) => x 
export const MAX_TEMPLATES = 100;
export const CACHE_BUST_PERIOD = 1000 * 60 * 2
export const UPDATE_PERIOD_MILLIS = 100
export const SECONDS_SPENT_BLINKING = 5;
export const AMOUNT_OF_BLINKING = 11
export const ANIMATION_DEFAULT_PERCENTAGE = 1 / 3
export const CONTACT_INFO_CSS = css`
    div.iHasContactInfo {
        font-weight: bold;
        font-size: 1px;
        font-family: serif; /* this fixes firefox */
        color: #eee;
        background-color: #111;
        padding: 1px;
        border-radius: 1px;
        opacity: 0;
        transition: opacity 500ms, width 200ms, height 200ms;
        position: absolute;
        pointer-events: none;
    }
`