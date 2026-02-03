import { _decorator, Component, Node, CCInteger, Vec3, tween, Tween } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('Spawner')
export class Spawner extends Component {
    @property(GameManager)
    gameManager: GameManager = null!;

    @property({ type: CCInteger }) 
    prefabIndex: number = 0; 

    private breathingTween: Tween<Node> | null = null;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onSpawnerClicked, this);
    }

    update() {
        // Only breathe if this is the current active step in the GameManager
        if (this.gameManager && this.gameManager.currentStepIndex === this.prefabIndex) {
            if (!this.breathingTween) {
                this.playBreathingAnimation();
            }
        } else {
            this.stopBreathing();
        }
    }

    private playBreathingAnimation() {
        this.breathingTween = tween(this.node)
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
            this.node.setScale(new Vec3(1, 1, 1));
        }
    }

    onSpawnerClicked() {
        if (this.gameManager && this.gameManager.currentStepIndex === this.prefabIndex) {
            this.gameManager.spawnFromSpawner(this.prefabIndex);
        }
    }

    public selfDestruct() {
        this.stopBreathing();
        tween(this.node)
            .to(0.3, { scale: Vec3.ZERO }, { easing: 'backIn' })
            .call(() => {
                this.node.destroy();
            })
            .start();
    }
}