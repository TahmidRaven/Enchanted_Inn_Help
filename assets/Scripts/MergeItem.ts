import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MergeItem')
export class MergeItem extends Component {
    @property([SpriteFrame])
    levelSprites: SpriteFrame[] = []; // Assign 4 sprites here (e.g., Small Trash -> Large Trash)

    public level: number = 0;
    public currentSlotIndex: number = -1;

    updateVisual() {
        const sprite = this.getComponent(Sprite);
        if (sprite && this.levelSprites[this.level]) {
            sprite.spriteFrame = this.levelSprites[this.level];
        }
    }

    upgrade(): boolean {
        this.level++;
        // Returns true if the item has evolved past the 4th stage (index 3)
        if (this.level > 3) return true; 
        
        this.updateVisual();
        return false;
    }
}
