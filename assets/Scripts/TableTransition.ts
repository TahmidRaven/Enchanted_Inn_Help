import { _decorator, Component, Node, Vec3, tween, Sprite, Color } from 'cc';
const { ccclass, property, menu } = _decorator;

@ccclass('TableTransition')
@menu('Custom/TableTransition')
export class TableTransition extends Component {

    @property({ type: Node, group: { name: 'Broken Pieces', displayOrder: 1 } })
    t1: Node = null!;
    @property({ type: Node, group: { name: 'Broken Pieces', displayOrder: 1 } })
    t2: Node = null!;
    @property({ type: Node, group: { name: 'Broken Pieces', displayOrder: 1 } })
    t3: Node = null!;

    @property({ type: Node, group: { name: 'Fixed Pieces', displayOrder: 2 } })
    fixedLeft: Node = null!;
    @property({ type: Node, group: { name: 'Fixed Pieces', displayOrder: 2 } })
    fixedRight: Node = null!;
    @property({ type: Node, group: { name: 'Fixed Pieces', displayOrder: 2 } })
    fixedBottom: Node = null!;
    @property({ type: Node, group: { name: 'Fixed Pieces', displayOrder: 2 } })
    bottomSlideInPos: Node = null!;

    @property({ tooltip: '1.0 is normal, 0.5 is 2x faster, 2.0 is 2x slower', displayOrder: 3 })
    timeScale: number = 1.0;

    private _originalScales: Map<string, Vec3> = new Map();
    private _originalPositions: Map<Node, Vec3> = new Map();

    onLoad() {
        // Store scales and hide fixed parts initially
        const fixedNodes: { [key: string]: Node } = { 
            'left': this.fixedLeft, 
            'right': this.fixedRight, 
            'bottom': this.fixedBottom 
        };

        Object.keys(fixedNodes).forEach(key => {
            const node = fixedNodes[key];
            if (node) {
                this._originalScales.set(key, node.getScale().clone());
                node.active = false;
            }
        });

        // Store broken pieces positions for potential resets
        [this.t1, this.t2, this.t3].forEach(node => {
            if (node) this._originalPositions.set(node, node.position.clone());
        });
    }


    private d(seconds: number): number {
        return seconds * this.timeScale;
    }

    public playTransition() {
        if (!this.t1 || !this.t2 || !this.t3) {
            console.warn("TableTransition: Missing broken piece nodes!");
            return;
        }

        // 1. T3 goes first
        this.animateBrokenOut(this.t3, () => {
            
            // 2. T2 starts when T3 finishes
            this.animateBrokenOut(this.t2, () => {
                
                // 3. Right table starts AND T1 starts
                this.popIn(this.fixedRight, 'right');
                
                this.animateBrokenOut(this.t1, () => {
                    // 4. T1 finished -> Left table and Bottom table start
                    this.popIn(this.fixedLeft, 'left');
                    this.slideInBottom();
                });
            });
        });
    }

    private animateBrokenOut(node: Node, onComplete: Function) {
        const dropPos = new Vec3(node.position.x, node.position.y - 50, 0);

        tween(node)
            .to(this.d(0.6), { 
                scale: Vec3.ZERO, 
                position: dropPos 
            }, { easing: 'backIn' })
            .call(() => {
                node.active = false;
                onComplete();
            })
            .start();
    }

    private popIn(node: Node, key: string) {
        if (!node) return;
        const targetScale = this._originalScales.get(key) || Vec3.ONE;
        node.active = true;
        node.setScale(Vec3.ZERO); 
        
        tween(node)
            .to(this.d(0.5), { scale: targetScale }, { easing: 'backOut' })
            .start();
    }

    private slideInBottom() {
        if (!this.fixedBottom || !this.bottomSlideInPos) return;

        this.fixedBottom.active = true;
        this.fixedBottom.setScale(this._originalScales.get('bottom') || Vec3.ONE);

        tween(this.fixedBottom)
            .to(this.d(0.8), { position: this.bottomSlideInPos.position }, { easing: 'sineOut' })
            .start();
    }


    public resetAnimation() {
        [this.t1, this.t2, this.t3].forEach(node => {
            if (node) {
                node.active = true;
                node.setScale(Vec3.ONE);
                node.position = this._originalPositions.get(node) || Vec3.ZERO;
            }
        });

        [this.fixedLeft, this.fixedRight, this.fixedBottom].forEach(node => {
            if (node) node.active = false;
        });
    }
}