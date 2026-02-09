import { _decorator, Component, Node, Vec3, tween, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TrashAnimation')
export class TrashAnimation extends Component {
    @property(SpriteFrame) emptyBinSprite: SpriteFrame = null!;
    @property(SpriteFrame) fullBinSprite: SpriteFrame = null!;

    private sprite: Sprite = null!;
    private originalScale: Vec3 = new Vec3(1, 1, 1);
    private inspectorPos: Vec3 = new Vec3(); 

    onLoad() {
        this.sprite = this.getComponent(Sprite)!;
        this.originalScale = this.node.scale.clone();
        this.inspectorPos = this.node.position.clone(); 

        this.node.active = false;
        this.node.setScale(Vec3.ZERO);
    }

    public playCleanup(items: Node[], onComplete: Function) {
        this.node.active = true;
        
        this.node.setScale(Vec3.ZERO);
        this.node.setPosition(Vec3.ZERO); 
        
        if (this.emptyBinSprite) {
            this.sprite.spriteFrame = this.emptyBinSprite;
        }

        // --- BEZIER ENTRANCE + OVERSIZE SCALE-UP ---
        const startPos = Vec3.ZERO;
        const targetPos = this.inspectorPos;
        const overshootScale = this.originalScale.x * 1.2; // +20% target

        // Control point for the arc heightx 
        const controlPoint = new Vec3(
            (startPos.x + targetPos.x) / 2 - 100, 
            Math.max(startPos.y, targetPos.y) + 400, 
            0
        );

        let pathObj = { t: 0 };

        tween(pathObj)
            .to(0.7, { t: 1 }, {
                easing: 'sineOut', 
                onUpdate: () => {
                    const currentPos = this.getBezierPoint(startPos, controlPoint, targetPos, pathObj.t);
                    this.node.setPosition(currentPos);

                    const currentScale = pathObj.t * overshootScale;
                    this.node.setScale(new Vec3(currentScale, currentScale, 1));
                }
            })
            .call(() => {
                tween(this.node)
                    .to(0.5, { scale: this.originalScale }, { easing: 'elasticOut' })
                    .call(() => {
                        this.startSequentialDrop(items, onComplete);
                    })
                    .start();
            })
            .start();
    }

private startSequentialDrop(items: Node[], onComplete: Function) {
    let finishedCount = 0;
   
    const baseTargetPos = this.node.worldPosition;
    
    
    const spread = 60; 

    items.forEach((item, idx) => {
        if (!item || !item.isValid) {
            finishedCount++;
            if (finishedCount === items.length) this.finalize(onComplete);
            return;
        }

        const startPos = item.worldPosition.clone();
        
        // --- POSITIONAL SCATTERING ---
        const offsetX = (Math.random() - 0.5) * spread;
        const offsetY = (Math.random() - 0.5) * (spread / 2);
        const individualTargetPos = new Vec3(baseTargetPos.x + offsetX, baseTargetPos.y + offsetY, 0);

        const controlPoint = new Vec3(
            (startPos.x + individualTargetPos.x) / 2, 
            Math.max(startPos.y, individualTargetPos.y) + 450, // High arc like the video
            0
        );

        let obj = { t: 0 };
        tween(obj)
            .delay(idx * 0.1) // Quick sequential timing
            .to(0.5, { t: 1 }, {
                easing: 'quadIn',
                onUpdate: () => {
                    if (!item.isValid) return;
                    
                    item.setWorldPosition(this.getBezierPoint(startPos, controlPoint, individualTargetPos, obj.t));
                    
                    const s = 1 - obj.t;
                    item.setScale(new Vec3(s, s, s));
                    
                
                }
            })
            .call(() => {
                item.active = false;
                this.shakeBin(5); 
                finishedCount++;
                if (finishedCount === items.length) this.finalize(onComplete);
            })
            .start();
    });
}

    private finalize(onComplete: Function) {
        if (this.fullBinSprite) {
            this.sprite.spriteFrame = this.fullBinSprite;
        }

        tween(this.node)
            .call(() => this.shakeBin(15))
            .delay(0.6) 
            .to(0.4, { scale: Vec3.ZERO }, { easing: 'backIn' })
            .call(() => {
                this.node.active = false;
                if (onComplete) onComplete(); 
            })
            .start();
    }

    private shakeBin(intensity: number) {
        tween(this.node)
            .by(0.04, { position: new Vec3(intensity, 0, 0) })
            .by(0.04, { position: new Vec3(-intensity * 2, 0, 0) })
            .by(0.04, { position: new Vec3(intensity, 0, 0) })
            .start();
    }

    private getBezierPoint(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
        const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
        const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
        return new Vec3(x, y, 0);
    }
}