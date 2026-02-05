import { _decorator, Component, Node, tween, Tween, UIOpacity, UITransform, Vec3, Sprite, SpriteFrame } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('TapHandAnimation')
@requireComponent(UIOpacity)
@requireComponent(Sprite)
export class TapHandAnimation extends Component {

    @property({ type: Node, tooltip: "The node you want the hand to tap on" })
    targetNode: Node = null!;

    @property({ type: Node, tooltip: "Clicking this node will dismiss the tap animation" })
    dismissButton: Node = null!;

    @property({ type: SpriteFrame, tooltip: "The sprite for the hand in its normal/idle state" })
    idleSprite: SpriteFrame = null!;

    @property({ type: SpriteFrame, tooltip: "The sprite for the hand when it is pressing down" })
    pressedSprite: SpriteFrame = null!;

    private _uiOpacity: UIOpacity | null = null;
    private _sprite: Sprite = null!;
    private _originalScale: Vec3 = new Vec3(1, 1, 1);

    onLoad() {
        if (this.dismissButton) {
            this.dismissButton.on(Node.EventType.TOUCH_END, this.dismiss, this);
        }
    }

    onEnable() {
        this.play();
    }

    onDisable() {
        Tween.stopAllByTarget(this.node);
        if (this._uiOpacity) Tween.stopAllByTarget(this._uiOpacity);
        
        if (this.dismissButton) {
            this.dismissButton.off(Node.EventType.TOUCH_END, this.dismiss, this);
        }
    }

    play() {
        if (!this.targetNode) {
            console.error("[TapHand] MISSING TARGET: Please assign a TargetNode in the Inspector.");
            return;
        }

        this._uiOpacity = this.getComponent(UIOpacity);
        this._sprite = this.getComponent(Sprite)!;
        
        if (this._uiOpacity) this._uiOpacity.opacity = 255;
        if (this.idleSprite) this._sprite.spriteFrame = this.idleSprite;

        this._originalScale = this.node.scale.clone();

        // --- POSITIONING ---
        const parentTrans = this.node.parent?.getComponent(UITransform);
        if (!parentTrans) return;

        const targetWorldPos = this.targetNode.getWorldPosition();
        const localPos = parentTrans.convertToNodeSpaceAR(targetWorldPos);
        this.node.setPosition(localPos);

        // --- TAP ANIMATION ---
        Tween.stopAllByTarget(this.node);

        const tapScale = new Vec3(
            this._originalScale.x * 1.2, 
            this._originalScale.y * 1.2, 
            this._originalScale.z
        );

        tween(this.node as Node)
            .to(0.3, { scale: tapScale }, { 
                easing: 'sineOut',
                onStart: () => {
                    if (this.pressedSprite) this._sprite.spriteFrame = this.pressedSprite;
                }
            })
            .to(0.2, { scale: this._originalScale }, { 
                easing: 'sineIn',
                onComplete: () => {
                    if (this.idleSprite) this._sprite.spriteFrame = this.idleSprite;
                }
            })
            .delay(0.6)
            .union()
            .repeatForever()
            .start();
    }

    public dismiss() {
        if (!this._uiOpacity) this._uiOpacity = this.getComponent(UIOpacity);
        
        Tween.stopAllByTarget(this.node); // Stop the tapping 
        
        if (this._uiOpacity) {
            tween(this._uiOpacity)
                .to(0.4, { opacity: 0 }, { easing: 'sineOut' })
                .call(() => {
                    this.node.destroy(); 
                })
                .start();
        } else {
            this.node.destroy();
        }
    }
}