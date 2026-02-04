import { _decorator, Component, Node, CCInteger, Vec3, tween, Tween, Sprite, Color } from 'cc';
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
        // Only play animation if this is the active spawner and hasn't been used
        if (!this.isUsed && this.gameManager && this.gameManager.currentStepIndex === this.prefabIndex) {
            if (!this.breathingTween) {
                this.playBreathingAnimation();
            }
        } else {
            this.stopBreathing();
        }
    }

    private playBreathingAnimation() {
        this.breathingTween = tween(this.node as Node)
            .to(0.8, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'sineInOut' })
            .to(0.8, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    private stopBreathing() {
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween = null;
            if (this.node.isValid) this.node.setScale(new Vec3(1, 1, 1));
        }
    }

    onSpawnerClicked() {
        // Restriction: Trigger spawn only once
        if (!this.isUsed && this.gameManager && this.gameManager.currentStepIndex === this.prefabIndex) {
            this.isUsed = true; 
            this.stopBreathing();
            this.gameManager.spawnFromSpawner(this.prefabIndex);
            
            // Visual feedback: Dim the spawner
            const sprite = this.node.getComponent(Sprite);
            if (sprite) {
                // Corrected: Using Color class instead of 'any'
                tween(sprite).to(0.3, { color: new Color(150, 150, 150, 255) }).start();
            }
        }
    }

    public selfDestruct() {
        this.stopBreathing();
        tween(this.node as Node)
            .to(0.3, { scale: Vec3.ZERO }, { easing: 'backIn' })
            .call(() => {
                this.node.destroy();
            })
            .start();
    }
}