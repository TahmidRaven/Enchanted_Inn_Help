import { _decorator, Component, Node, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

@ccclass('TapHandAnimation')
@requireComponent(UIOpacity)
export class TapHandAnimation extends Component {

    @property({ type: Node, tooltip: "The node you want the hand to tap on" })
    targetNode: Node = null!;

    private _uiOpacity: UIOpacity | null = null;
    private _initialScale: Vec3 = new Vec3();
    private _initialAngle: number = 0;

    onLoad() {
        this._uiOpacity = this.getComponent(UIOpacity);
        
        // Capture the exact values from your Inspector
        this._initialScale = this.node.scale.clone();
        this._initialAngle = this.node.angle;
    }

    onEnable() {
        this.play();
    }

    play() {
        if (!this.targetNode) return;

        this.stopAllAnimations();

        // --- POSITIONING ---
        const parentTrans = this.node.parent?.getComponent(UITransform);
        if (parentTrans) {
            const targetWorldPos = this.targetNode.getWorldPosition();
            const localPos = parentTrans.convertToNodeSpaceAR(targetWorldPos);
            this.node.setPosition(localPos);
        }

        if (this._uiOpacity) this._uiOpacity.opacity = 255;

        // --- CONTINUOUS JUICY ANIMATION ---
        const squeezeScale = new Vec3(this._initialScale.x * 1.1, this._initialScale.y * 0.9, 1);
        const tapScale = new Vec3(this._initialScale.x * 0.8, this._initialScale.y * 0.8, 1);
        const tapAngle = this._initialAngle - 12; // Tilt relative to 15.9

        tween(this.node)
            .repeatForever(
                tween()
                    // 1. Anticipation: Slight squeeze
                    .to(0.3, { scale: squeezeScale }, { easing: 'sineOut' })
                    
                    // 2. Action: Quick snappy tap
                    .to(0.1, { scale: tapScale, angle: tapAngle }, { easing: 'quadIn' })
                    
                    // 3. Recovery: Bounce back to base state
                    .to(0.25, { scale: this._initialScale, angle: this._initialAngle }, { easing: 'backOut' })
                    
                    // 4. Brief pause before repeating the tap
                    .delay(0.4)
            )
            .start();
    }

    private stopAllAnimations() {
        Tween.stopAllByTarget(this.node);
        if (this._uiOpacity) Tween.stopAllByTarget(this._uiOpacity);
    }

    onDisable() {
        this.stopAllAnimations();
    }
}