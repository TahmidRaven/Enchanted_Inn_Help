import { _decorator, Component, Sprite, SpriteFrame, Vec3, tween, Tween, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MergeItem')
export class MergeItem extends Component {
    @property([SpriteFrame]) levelSprites: SpriteFrame[] = []; 
    
    public level: number = 0;
    public prefabIndex: number = -1; 
    public currentSlotIndex: number = -1;
    
    // Explicitly typed for Cocos Node
    private hintTween: Tween<Node> | null = null;

    updateVisual() {
        const sprite = this.getComponent(Sprite);
        if (sprite && this.levelSprites[this.level]) {
            sprite.spriteFrame = this.levelSprites[this.level];
        }
    }

    upgrade(): boolean {
        this.level++;
        this.updateVisual();
        return this.level >= 3;
    }

    public playHint(midpoint: Vec3) {
        this.stopHint();
        
        // Calculate direction and move 20 units toward midpoint
        
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