import { _decorator, Component, Node, CCInteger, Vec3, tween, Tween, Sprite, Color, UIOpacity } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Spawner')
export class Spawner extends Component {
    @property(Node)
    gameManagerNode: Node = null!;

    private gameManager: GameManager = null!;

    @property({ type: CCInteger }) 
    prefabIndex: number = 0; 

    private breathingTween: Tween<Node> | null = null;
    private isUsed: boolean = false; 

    onLoad() {
        if (this.gameManagerNode) {
            this.gameManager = this.gameManagerNode.getComponent(GameManager)!;
        }
        this.node.on(Node.EventType.TOUCH_END, this.onSpawnerClicked, this);
    }

    update() {
        const canAnimate = !this.isUsed && 
                          this.gameManager && 
                          this.gameManager.gameStarted && 
                          this.gameManager.currentStepIndex === this.prefabIndex;

        if (canAnimate) {
            if (!this.breathingTween) {
                this.playBreathingAnimation();
            }
        } else {
            this.stopBreathing();
        }
    }

    private playBreathingAnimation() {
        this.breathingTween = tween(this.node as Node)
            .to(0.8, { scale: new Vec3(1.25, 1.25, 1.25) }, { easing: 'sineInOut' })
            .to(0.8, { scale: new Vec3(1.5, 1.5, 1.5) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private stopBreathing() {
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
            if (this.node.isValid) this.node.setScale(new Vec3(2, 2, 2));
        }
    }

    onSpawnerClicked() {
        if (!this.gameManager || !this.gameManager.gameStarted) return;

        if (!this.isUsed && this.gameManager.currentStepIndex === this.prefabIndex) {
            this.isUsed = true; 
            this.stopBreathing();
            this.gameManager.spawnFromSpawner(this.prefabIndex);
            
            this.fadeOutAndDestroy();
        }
    }


    private fadeOutAndDestroy() {
        let opacityComp = this.getComponent(UIOpacity);
        if (!opacityComp) {
            opacityComp = this.addComponent(UIOpacity);
        }

        tween(opacityComp)
            .to(0.6, { opacity: 0 }, { easing: 'sineOut' })
            .call(() => {
                if (this.node && this.node.isValid) {
                    this.node.destroy(); // des
                }
            })
            .start();
    }


    public selfDestruct() {
        this.fadeOutAndDestroy();
    }
}