import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MergeItem')
export class MergeItem extends Component {
    @property([SpriteFrame]) levelSprites: SpriteFrame[] = []; 

    public level: number = 0; // 0, 1, 2, or 3
    public currentSlotIndex: number = -1;

    updateVisual() {
        const sprite = this.getComponent(Sprite);
        if (sprite && this.levelSprites[this.level]) {
            sprite.spriteFrame = this.levelSprites[this.level];
        }
    }

    upgrade(): boolean {
        this.level++;
        this.updateVisual();

        // i'ts the final merge that is the "Last item" 
        if (this.level >= 3) return true; 
        
        return false;
    }
}