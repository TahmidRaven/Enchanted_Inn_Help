import { _decorator, Component, Node, Vec3, tween, Sprite, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TableTransition')
export class TableTransition extends Component {
    @property(Node) brokenGroup: Node = null!;
    @property(Node) fixedLeft: Node = null!;
    @property(Node) fixedRight: Node = null!;
    @property(Node) fixedBottom: Node = null!;
    @property(Node) bottomSlideInPos: Node = null!;

    private _originalScales: Map<string, Vec3> = new Map();

    onLoad() {
        if (this.fixedLeft) this._originalScales.set('left', this.fixedLeft.getScale().clone());
        if (this.fixedRight) this._originalScales.set('right', this.fixedRight.getScale().clone());
        if (this.fixedBottom) this._originalScales.set('bottom', this.fixedBottom.getScale().clone());
    }

    public playTransition() {
        this.playSequentialBroken(() => {
            this.scheduleOnce(() => {
                this.popIn(this.fixedLeft, 'left');
                this.popIn(this.fixedRight, 'right');
            }, 0.2);

            this.scheduleOnce(() => {
                this.slideInBottom();
            }, 0.5);
        });
    }

    private playSequentialBroken(onComplete: Function) {
        if (!this.brokenGroup) return;
        const children = this.brokenGroup.children;
        const staggerDelay = 0.2; 
        const animDuration = 0.7;

        children.forEach((child, index) => {
            const popDownPos = new Vec3(child.position.x, child.position.y - 50, 0);

            tween(child)
                .delay(index * staggerDelay)
                .to(animDuration, { 
                    scale: Vec3.ZERO, 
                    position: popDownPos 
                }, { easing: 'backIn' })
                .call(() => {
                    child.active = false;
                    if (index === children.length - 1) onComplete();
                })
                .start();
        });
    }

    private popIn(node: Node, key: string) {
        if (!node) return;
        const targetScale = this._originalScales.get(key) || Vec3.ONE;
        node.active = true;
        node.setScale(Vec3.ZERO); 
        
        const sprite = node.getComponent(Sprite);
        if (sprite) sprite.color = Color.WHITE.clone();

        tween(node)
            .to(0.5, { scale: targetScale }, { easing: 'backOut' })
            .start();
    }

    private slideInBottom() {
        if (!this.fixedBottom || !this.bottomSlideInPos) return;

        this.fixedBottom.active = true;
        const targetScale = this._originalScales.get('bottom') || Vec3.ONE;
        this.fixedBottom.setScale(targetScale);

        const destination = this.bottomSlideInPos.position.clone();

        const sprite = this.fixedBottom.getComponent(Sprite);
        if (sprite) {
            sprite.color = Color.WHITE.clone(); // it's fully opaque
        }

        tween(this.fixedBottom)
            .to(1.0, { position: destination }, { easing: 'sineOut' })
            .start();
    }
}