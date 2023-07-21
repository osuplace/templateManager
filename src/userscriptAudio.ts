const context = new AudioContext();
export class UserscriptAudio {
    src?: string;
    _sound?: AudioBufferSourceNode;
    _buffer?: AudioBuffer;
    ready = false;

    constructor(_src?: string) {
        if (_src) this.src = _src;
    }

    load(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.src)
                return reject(new Error('Source is not set.'));

            const error = (errText: string) => {
                return (err: any) => {
                    console.error(`failed to load the sound from source`, this.src, ':', err);
                    reject(new Error(errText));
                }
            }

            GM.xmlHttpRequest({
                method: 'GET',
                url: this.src,
                responseType: 'arraybuffer',
                onload: (response) => {
                    const errText = 'Failed to decode audio';
                    try {
                        context.decodeAudioData(response.response, (buffer) => {
                            this._buffer = buffer;
                            this.ready = true;
                            resolve();
                        }, error(errText));
                    } catch (e) {
                        error(errText)(e);
                    }
                },
                onerror: error('Failed to fetch audio from URL')
            });
        });
    }

    play() {
        if (!this.ready || !this._buffer) {
            throw new Error('Audio not ready. Please load the audio with .load()');
        }

        if (this._sound) {
            try {
                this._sound.disconnect(context.destination);
            } catch {}
        }

        this._sound = context.createBufferSource();
        this._sound.buffer = this._buffer;
        this._sound.connect(context.destination);
        this._sound.start(0);
    }
}