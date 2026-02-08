import { _decorator, Component, Sprite, SpriteFrame, Vec3, tween, Tween, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MergeItem')
export class MergeItem extends Component {
    @property([SpriteFrame]) levelSprites: SpriteFrame[] = []; 
    
    public level: number = 0;
    public prefabIndex: number = -1; 
    public currentSlotIndex: number = -1;
    
    private hintTween: Tween<Node> | null = null;

    updateVisual() {
        const sprite = this.getComponent(Sprite);
        if (sprite && this.levelSprites[this.level]) {
            sprite.spriteFrame = this.levelSprites[this.level];
        }
    }

    /**
     * Upgrades the item level and plays a spin + pop animation.
     * @returns boolean - true if the item reached the max level (3)
     */
    upgrade(): boolean {
        this.level++;
        this.updateVisual();

        // --- MERGE ANIMATION: 360 Spin + 10% Pop ---
        // We reset the scale and rotation first to ensure the tween starts clean
        this.node.setScale(Vec3.ONE);
        this.node.setRotationFromEuler(0, 0, 0);

        tween(this.node as Node)
            .parallel(
                // 360 Degree Spin
                tween().to(0.3, { angle: 360 }, { easing: 'quartOut' }),
                
                // 10% Pop (Scale up to 1.1 and back to 1.0)
                tween()
                    .to(0.15, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineOut' })
                    .to(0.15, { scale: Vec3.ONE }, { easing: 'sineIn' })
            )
            .call(() => {
                // Reset angle to 0 after spin for logic consistency
                this.node.setRotationFromEuler(0, 0, 0);
            })
            .start();

        return this.level >= 3;
    }

    public playHint(midpoint: Vec3) {
        this.stopHint();
        
        const dir = midpoint.clone().subtract(this.node.worldPosition).normalize();
        const hintPos = new Vec3(dir.x * 20, dir.y * 20, 0);

        this.hintTween = tween(this.node as Node)
            .to(0.6, { position: hintPos, scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'sineInOut' })
            .to(0.6, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    public stopHint() {
        if (this.hintTween) {
            this.hintTween.stop();
            this.hintTween = null;
        }
        this.node.setPosition(Vec3.ZERO);
        this.node.setScale(Vec3.ONE);
    }
}