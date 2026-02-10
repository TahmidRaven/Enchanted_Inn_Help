import { _decorator, Component, Node, Vec3, tween, UIOpacity, UITransform, Tween } from 'cc';
import { GameManager } from './GameManager';
import { Spawner } from './Spawner';

const { ccclass, property, requireComponent } = _decorator;

@ccclass('SuggestHand')
@requireComponent(UIOpacity)
export class SuggestHand extends Component {
    @property(GameManager)
    gameManager: GameManager = null!;

    @property([Spawner])
    spawners: Spawner[] = [];

    private _uiOpacity: UIOpacity = null!;
    private _isMoving: boolean = false;
    private _lastStepIndex: number = -1;
    
    private _initialScale: Vec3 = new Vec3();
    private _initialAngle: number = 0; 
    private _isGameStarted: boolean = false;
    private _activeTween: Tween<Node> | null = null;

    onLoad() {
        this._uiOpacity = this.getComponent(UIOpacity)!;
        this._initialScale = this.node.scale.clone();
        this._initialAngle = this.node.angle;

        this._uiOpacity.opacity = 0;
        this.node.active = false;

        if (this.gameManager && this.gameManager.decisionUINode) {
            this.gameManager.decisionUINode.on('DECISION_HELP', this.onGameStartDetected, this);
        }

        // Parent listener
        this.node.parent?.on(Node.EventType.TOUCH_START, this.onGlobalTouch, this);
    }

    private onGameStartDetected() {
        this._isGameStarted = true;
        this.node.active = true;
        
        const revealDelay = 0.65; 
        this.scheduleOnce(() => {
            this.moveToCorrectSpawner();
        }, revealDelay);
    }

    update() {
        if (!this._isGameStarted || !this.gameManager) return;

        const currentIdx = this.gameManager.currentStepIndex;

        // Auto-detect step changes
        if (currentIdx !== this._lastStepIndex) {
            this.moveToCorrectSpawner();
            return;
        }

        // Auto-hide if the current spawner is clicked/destroyed
        const targetSpawner = this.spawners.find(s => s.prefabIndex === currentIdx);
        if (!targetSpawner || !targetSpawner.node || !targetSpawner.node.isValid) {
            if (this._uiOpacity.opacity > 0 && !this._isMoving) {
                this.hide();
            }
        }
    }

    private onGlobalTouch() {
        if (!this._isGameStarted || this._isMoving) return;

        // ONLY reset if the hand is currently invisible (during the 4.5s wait)
        // This prevents the "double-reset" feel when clicking while the hand is already tapping.
        if (this._uiOpacity.opacity < 50) {
            this.moveToCorrectSpawner();
        }
    }

    private moveToCorrectSpawner() {
        const currentIdx = this.gameManager.currentStepIndex;
        const targetSpawner = this.spawners.find(s => s.prefabIndex === currentIdx);

        if (targetSpawner && targetSpawner.node && targetSpawner.node.isValid) {
            this._lastStepIndex = currentIdx;
            this.showAtNode(targetSpawner.node);
        } else {
            this.hide();
        }
    }

    private showAtNode(targetNode: Node) {
        this.stopAllAnimations();

        this._isMoving = true;
        const parentTrans = this.node.parent?.getComponent(UITransform);
        if (!parentTrans) return;

        const targetWorldPos = targetNode.getWorldPosition();
        const localPos = parentTrans.convertToNodeSpaceAR(targetWorldPos);
        
        // Snap position if we were totally hidden
        if (this._uiOpacity.opacity < 10) {
            this.node.setPosition(localPos);
        }

        tween(this._uiOpacity)
            .to(0.2, { opacity: 255 })
            .start();

        tween(this.node)
            .to(0.4, { position: localPos }, { easing: 'backOut' })
            .call(() => {
                this._isMoving = false;
                this.playTapAnimation();
            })
            .start();
    }

    private playTapAnimation() {
        const squeezeScale = new Vec3(this._initialScale.x * 1.1, this._initialScale.y * 0.9, 1);
        const tapScale = new Vec3(this._initialScale.x * 0.8, this._initialScale.y * 0.8, 1);
        const tapAngle = this._initialAngle - 12;

        this.stopAllAnimations();
        
        this._activeTween = tween(this.node)
            .repeatForever(
                tween()
                    // 1. Squeeze & Show
                    .call(() => { tween(this._uiOpacity).to(0.2, { opacity: 255 }).start(); })
                    .to(0.3, { scale: squeezeScale }, { easing: 'sineOut' })
                    
                    // 2. The Tap
                    .to(0.15, { scale: tapScale, angle: tapAngle }, { easing: 'quadIn' })
                    
                    // 3. Bounce Back
                    .to(0.3, { scale: this._initialScale, angle: this._initialAngle }, { easing: 'backOut' })
                    
                    // 4. Stay visible for a brief moment before fading
                    .delay(0.5) 
                    .call(() => { tween(this._uiOpacity).to(0.3, { opacity: 0 }).start(); })
                    
                    // wait for hand to show 
                    .delay(0.5)
            )
            .start();
    }

    private stopAllAnimations() {
        if (this._activeTween) {
            this._activeTween.stop();
            this._activeTween = null;
        }
        tween(this.node).stop();
        tween(this._uiOpacity).stop();
    }

    private hide() {
        this._lastStepIndex = -1;
        this.stopAllAnimations();
        tween(this._uiOpacity)
            .to(0.2, { opacity: 0 })
            .start();
    }

    onDestroy() {
        if (this.gameManager && this.gameManager.decisionUINode) {
            this.gameManager.decisionUINode.off('DECISION_HELP', this.onGameStartDetected, this);
        }
        if (this.node.parent) {
            this.node.parent.off(Node.EventType.TOUCH_START, this.onGlobalTouch, this);
        }
    }
}