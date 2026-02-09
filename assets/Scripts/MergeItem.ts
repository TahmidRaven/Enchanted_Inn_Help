import { _decorator, Component, Sprite, SpriteFrame, Vec3, tween, Tween, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MergeItem')
export class MergeItem extends Component {
    @property([SpriteFrame]) levelSprites: SpriteFrame[] = []; 
    
    public level: number = 0;
    public prefabIndex: number = -1; 
    public currentSlotIndex: number = -1;
    
    private hintTween: Tween<Node> | null = null;
    public isHinting: boolean = false;  

    updateVisual() {
        const sprite = this.getComponent(Sprite);
        if (sprite && this.levelSprites[this.level]) {
            sprite.spriteFrame = this.levelSprites[this.level];
        }
    }

    upgrade(): boolean {
        this.level++;
        this.updateVisual();

        this.node.setScale(Vec3.ONE);
        this.node.setRotationFromEuler(0, 0, 0);

        tween(this.node as Node)
            .parallel(
                tween().to(0.3, { angle: 360 }, { easing: 'quartOut' }),
                tween()
                    .to(0.15, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineOut' })
                    .to(0.15, { scale: Vec3.ONE }, { easing: 'sineIn' })
            )
            .call(() => {
                this.node.setRotationFromEuler(0, 0, 0);
            })
            .start();

        return this.level >= 3;
    }

    public playHint(midpoint: Vec3) {
        if (this.isHinting) return;
        this.stopHint();
        this.isHinting = true;
        
        const worldPos = this.node.worldPosition;
        const dir = midpoint.clone().subtract(worldPos).normalize();
        const moveOffset = new Vec3(dir.x * 25, dir.y * 25, 0); // Pull 25 units toward center

        this.hintTween = tween(this.node as Node)
            .to(0.7, { position: moveOffset, scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'sineInOut' })
            .to(0.7, { position: Vec3.ZERO, scale: Vec3.ONE }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    public stopHint() {
        if (this.hintTween) {
            this.hintTween.stop();
            this.hintTween = null;
        }
        this.isHinting = false;
        this.node.setPosition(Vec3.ZERO);
        this.node.setScale(Vec3.ONE);
    }
}