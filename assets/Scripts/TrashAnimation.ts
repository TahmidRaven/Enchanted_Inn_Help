import { _decorator, Component, Node, Vec3, tween, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TrashAnimation')
export class TrashAnimation extends Component {
    @property(SpriteFrame) emptyBinSprite: SpriteFrame = null!;
    @property(SpriteFrame) fullBinSprite: SpriteFrame = null!;

    private sprite: Sprite = null!;
    private originalScale: Vec3 = new Vec3(1, 1, 1);

    onLoad() {
        this.sprite = this.getComponent(Sprite)!;
        
        // This fixes your scale issue. It saves the 0.7 (or whatever you set)
        // so that when the bin "pops in", it returns to this exact size.
        this.originalScale = this.node.scale.clone();
        
        this.node.active = false;
        this.node.setScale(Vec3.ZERO);
    }

    public playCleanup(items: Node[], onComplete: Function) {
        this.node.active = true;
        
        // Ensure we start with the empty state
        if (this.emptyBinSprite) {
            this.sprite.spriteFrame = this.emptyBinSprite;
        }
        
        // Pop up to the original editor scale
        tween(this.node)
            .to(0.5, { scale: this.originalScale }, { easing: 'backOut' })
            .call(() => {
                this.startSequentialDrop(items, onComplete);
            })
            .start();
    }

    private startSequentialDrop(items: Node[], onComplete: Function) {
        let finishedCount = 0;
        const targetPos = this.node.worldPosition;

        items.forEach((item, idx) => {
            if (!item || !item.isValid) return;

            const startPos = item.worldPosition.clone();
            const controlPoint = new Vec3(
                (startPos.x + targetPos.x) / 2, 
                Math.max(startPos.y, targetPos.y) + 400, // Arc height
                0
            );

            let obj = { t: 0 };
            tween(obj)
                .delay(idx * 0.15) // Sequential timing
                .to(0.6, { t: 1 }, {
                    easing: 'quadIn',
                    onUpdate: () => {
                        if (!item.isValid) return;
                        item.setWorldPosition(this.getBezierPoint(startPos, controlPoint, targetPos, obj.t));
                        const s = 1 - obj.t;
                        item.setScale(new Vec3(s, s, s));
                    }
                })
                .call(() => {
                    item.active = false;
                    this.shakeBin(5); // Small shake per item hit
                    finishedCount++;

                    // ONLY when the very last item is finished
                    if (finishedCount === items.length) {
                        this.finalize(onComplete);
                    }
                })
                .start();
        });
    }

    private finalize(onComplete: Function) {
        // 1. Change to full sprite
        if (this.fullBinSprite) {
            this.sprite.spriteFrame = this.fullBinSprite;
        }

        // 2. Shake and wait a moment so the player sees the "Full" bin
        tween(this.node)
            .call(() => this.shakeBin(15)) // Bigger shake for "Full"
            .delay(0.8) 
            .to(0.5, { scale: Vec3.ZERO }, { easing: 'backIn' })
            .call(() => {
                this.node.active = false;
                // 3. Now trigger the callback to let GameManager proceed
                onComplete(); 
            })
            .start();
    }

    private shakeBin(intensity: number) {
        tween(this.node)
            .by(0.05, { position: new Vec3(intensity, 0, 0) })
            .by(0.05, { position: new Vec3(-intensity * 2, 0, 0) })
            .by(0.05, { position: new Vec3(intensity, 0, 0) })
            .start();
    }

    private getBezierPoint(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
        const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
        const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
        return new Vec3(x, y, 0);
    }
}