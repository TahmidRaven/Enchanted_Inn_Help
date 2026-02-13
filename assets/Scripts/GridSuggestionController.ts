import { _decorator, Component, Sprite, SpriteFrame, UIOpacity, tween, Vec3 } from 'cc';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

@ccclass('GridSuggestionController')
export class GridSuggestionController extends Component {
    @property(GameManager)
    gameManager: GameManager = null!;

    @property([SpriteFrame])
    suggestionFrames: SpriteFrame[] = [];

    private _sprite: Sprite = null!;
    private _uiOpacity: UIOpacity = null!;
    private _initialScale: Vec3 = new Vec3();

    onLoad() {
        this._sprite = this.getComponent(Sprite)!;
        this._uiOpacity = this.getComponent(UIOpacity) || this.addComponent(UIOpacity);
        this._initialScale = this.node.scale.clone();
    }

    onEnable() {
        this.playShowAnimation();
    }

    private playShowAnimation() {
        if (!this.gameManager || !this._sprite) return;

        const currentStep = this.gameManager.currentStepIndex;

        if (this.suggestionFrames[currentStep]) {
            this._sprite.spriteFrame = this.suggestionFrames[currentStep];

            tween(this.node).stop();
            tween(this._uiOpacity).stop();

            this._uiOpacity.opacity = 0;
            this.node.setScale(new Vec3(this._initialScale.x * 1.0, this._initialScale.y * 1.0, 1));

            tween(this._uiOpacity)
                .to(0.3, { opacity: 255 })
                .start();

            tween(this.node)
                .to(0.5, { scale: this._initialScale }, { easing: 'backOut' })
                .call(() => {
                    this.startBreathing();
                })
                .start();
        }
    }

    private startBreathing() {
        const pulseScale = new Vec3(this._initialScale.x * 1.05, this._initialScale.y * 1.05, 1);

        tween(this.node)
            .to(1.5, { scale: pulseScale }, { easing: 'sineInOut' })
            .to(1.5, { scale: this._initialScale }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    onDisable() {
        tween(this.node).stop();
        tween(this._uiOpacity).stop();
    }
}