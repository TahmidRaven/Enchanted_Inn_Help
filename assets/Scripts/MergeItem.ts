import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MergeItem')
export class MergeItem extends Component {
    @property([SpriteFrame])
    levelSprites: SpriteFrame[] = []; 

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
        if (this.level > 3) return true; 
        
        this.updateVisual();
        return false;
    }
}


