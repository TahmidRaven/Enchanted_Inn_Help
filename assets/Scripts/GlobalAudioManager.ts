import { _decorator, Component, AudioSource, Node, AudioClip } from 'cc';
import { AudioContent } from './AudioContent';
const { ccclass } = _decorator;

interface PooledAudio {
    source: AudioSource;
    reserved: boolean; 
}

@ccclass('GlobalAudioManager')
export class GlobalAudioManager extends Component {
    private static _instance: GlobalAudioManager;
    private _audioPool: PooledAudio[] = [];
    private _poolSize: number = 10;

    public static get instance(): GlobalAudioManager {
        return this._instance;
    }

    onLoad() {
        if (GlobalAudioManager._instance) {
            this.destroy();
            return;
        }

        GlobalAudioManager._instance = this;

        for (let i = 0; i < this._poolSize; i++) {
            const audioSource = this.node.addComponent(AudioSource);
            audioSource.playOnAwake = false;

            audioSource.node.on(AudioSource.EventType.ENDED, () => {
                const slot = this._audioPool.find(p => p.source === audioSource);
                if (slot && slot.reserved && !audioSource.loop) {
                    slot.reserved = false;
                }
            });

            this._audioPool.push({ source: audioSource, reserved: false });
        }
    }

    public playOneShot(audioContent: AudioContent) {
        const slot = this._audioPool.find(p => !p.source.playing && !p.reserved);
        if (slot) {
            slot.source.playOneShot(audioContent.AudioClip, audioContent.Volume * slot.source.volume);
        } else {
            console.warn('No free AudioSource available for one-shot!');
        }
    }

    public play(audioContent: AudioContent) {

        const existing = this._audioPool.find(
            p => p.reserved && p.source.clip && p.source.clip.uuid === audioContent.AudioClip.uuid
        );
        if (existing) {
            if (!existing.source.playing) existing.source.play();
            return;
        }

        // Find a free non-reserved slot
        let slot = this._audioPool.find(p => !p.reserved && !p.source.playing);

        // As fallback, find any non-reserved slot
        if (!slot) {
            slot = this._audioPool.find(p => !p.reserved);
        }

        if (slot) {
            const src = slot.source;
            slot.reserved = true;

            src.stop();
            src.clip = audioContent.AudioClip;
            src.volume = Math.min(audioContent.Volume, 1.0);
            src.loop = audioContent.Loop;
            src.play();
        } else {
            console.warn('All AudioSources are reserved; cannot play new sound.');
        }
    }

    public playBGM(audioContent: AudioContent) {
        const bgmSlot = this._audioPool[this._poolSize - 1];
        const bgm = bgmSlot.source;

        bgmSlot.reserved = true;
        bgm.clip = audioContent.AudioClip;
        bgm.volume = Math.min(audioContent.Volume, 1.0);
        bgm.loop = audioContent.Loop;

        if (!bgm.playing) {
            bgm.play();
        }
    }

    public stop(audioContent: AudioContent): void {
        if (!audioContent || !audioContent.AudioClip) return;

        const slot = this._audioPool.find(p => p.source.clip && p.source.clip.uuid === audioContent.AudioClip.uuid);
        if (slot) {
            slot.source.stop();
            slot.reserved = false;
        }
    }

    public stopBGM() {
        const bgmSlot = this._audioPool[this._poolSize - 1];
        if (bgmSlot.source.playing) bgmSlot.source.stop();
        bgmSlot.reserved = false;
    }

    public getBGMPlayer(): AudioSource {
        return this._audioPool[this._poolSize - 1].source;
    }

    public setVolume(volume: number) {
        this._audioPool.forEach(({ source }) => {
            source.volume = volume;
        });
    }
}
