import { _decorator, Component, Node, CCInteger, Vec3, tween, Tween, Sprite, UIOpacity } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Spawner')
export class Spawner extends Component {
    @property(Node)
    gameManagerNode: Node = null!;

    private gameManager: GameManager = null!;
    private sprite: Sprite = null!;

    @property({ type: CCInteger }) 
    prefabIndex: number = 0; 

    private breathingTween: Tween<Node> | null = null;
    private isUsed: boolean = false; 
    private isRevealing: boolean = false; 
    
    // Store the Inspector value here
    private initialScale: Vec3 = new Vec3(1, 1, 1);

    onLoad() {
        if (this.gameManagerNode) {
            this.gameManager = this.gameManagerNode.getComponent(GameManager)!;
            
            if (this.gameManager.decisionUINode) {
                this.gameManager.decisionUINode.on('DECISION_HELP', this.onGameStartDetected, this);
            }
        }
        
        this.sprite = this.getComponent(Sprite) || this.getComponentInChildren(Sprite)!;
        this.node.on(Node.EventType.TOUCH_END, this.onSpawnerClicked, this);

        // Capture the scale you set in the Inspector
        this.initialScale = this.node.scale.clone();

        // Start hidden and at zero scale for the reveal
        this.node.active = false;
        this.node.setScale(Vec3.ZERO);
    }

    private onGameStartDetected() {
        if (this.isUsed || this.isRevealing) return;
        
        this.isRevealing = true;
        this.node.active = true;
        
        // Staggered reveal based on index
        const staggerDelay = this.prefabIndex * 0.15;

        tween(this.node)
            .delay(staggerDelay)
            .to(0.5, { scale: this.initialScale }, { 
                easing: 'backOut',
                onComplete: () => {
                    this.isRevealing = false;
                }
            })
            .start();
    }

    update() {
        if (!this.gameManager || !this.gameManager.gameStarted || this.isUsed || this.isRevealing) return;

        const isCurrentActiveStep = this.gameManager.currentStepIndex === this.prefabIndex;

        if (this.sprite) {
            this.sprite.grayscale = !isCurrentActiveStep;
        }

        if (isCurrentActiveStep) {
            if (!this.breathingTween) {
                this.playBreathingAnimation();
            }
        } else {
            this.stopBreathing();
        }
    }

    private playBreathingAnimation() {
        // Pulse to 15% larger than whatever the inspector scale is
        const pulseScale = new Vec3(
            this.initialScale.x * 1.15, 
            this.initialScale.y * 1.15, 
            this.initialScale.z
        );

        this.breathingTween = tween(this.node as Node)
            .to(0.8, { scale: pulseScale }, { easing: 'sineInOut' })
            .to(0.8, { scale: this.initialScale }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private stopBreathing() {
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
            if (this.node.isValid) {
                this.node.setScale(this.initialScale);
            }
        }
    }

    onSpawnerClicked() {
        if (!this.gameManager || !this.gameManager.gameStarted || this.isRevealing) return;

        if (!this.isUsed && this.gameManager.currentStepIndex === this.prefabIndex) {
            this.isUsed = true; 
            this.stopBreathing();
            this.gameManager.spawnFromSpawner(this.prefabIndex);
            this.fadeOutAndDestroy();
        }
    }

    private fadeOutAndDestroy() {
        let opacityComp = this.getComponent(UIOpacity);
        if (!opacityComp) opacityComp = this.addComponent(UIOpacity);

        tween(opacityComp)
            .to(0.6, { opacity: 0 }, { easing: 'sineOut' })
            .call(() => {
                if (this.node && this.node.isValid) this.node.destroy();
            })
            .start();
    }

    onDestroy() {
        if (this.gameManager && this.gameManager.decisionUINode) {
            this.gameManager.decisionUINode.off('DECISION_HELP', this.onGameStartDetected, this);
        }
    }
}