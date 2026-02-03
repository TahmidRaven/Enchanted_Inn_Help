import { _decorator, Component, Node, Vec3, EventTouch, find, tween, UITransform } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private originalParent: Node = null!; 
    private topLayerNode: Node = null!;
    public gm: GameManager = null!;

    onLoad() {
        this.topLayerNode = find('Canvas/MergeItemGoOnTop')!;
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        if (this.gm) this.gm.clearHints();
        this.originalParent = this.node.parent!;
        const worldPos = this.node.worldPosition;

        if (this.topLayerNode) {
            this.node.setParent(this.topLayerNode);
            this.node.setWorldPosition(worldPos);
            tween(this.node as Node)
                .to(0.1, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'sineOut' })
                .start();
        }
    }

    onTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        this.node.setWorldPosition(new Vec3(touchPos.x, touchPos.y, 0));
    }

    onTouchEnd(event: EventTouch) {
        const touchPos = event.getUILocation();
        const worldTouch = new Vec3(touchPos.x, touchPos.y, 0);
        
        tween(this.node as Node)
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();

        if (this.gm) {
            const nearestIdx = this.gm.getNearestSlot(worldTouch);
            if (nearestIdx !== -1) {
                this.gm.handleMove(this.node, nearestIdx);
            } else {
                this.playInvalidDropEffect();
            }
        } else {
            this.returnToHome();
        }
    }

    private playInvalidDropEffect() {
        tween(this.node as Node)
            .by(0.05, { position: new Vec3(10, 0, 0) })
            .by(0.05, { position: new Vec3(-20, 0, 0) })
            .by(0.05, { position: new Vec3(10, 0, 0) })
            .call(() => { this.returnToHome(); })
            .start();
    }

    public returnToHome() {
        if (this.originalParent && this.originalParent.isValid) {
            const currentWorldPos = this.node.worldPosition.clone();
            this.node.setParent(this.originalParent);

            const uiTrans = this.originalParent.getComponent(UITransform);
            if (uiTrans) {
                const localPos = uiTrans.convertToNodeSpaceAR(currentWorldPos);
                this.node.setPosition(localPos);
            }

            tween(this.node as Node)
                .to(0.2, { position: new Vec3(0, 0, 0) }, { easing: 'backOut' })
                .start();
        }
    }
}