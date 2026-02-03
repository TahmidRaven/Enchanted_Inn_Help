import { _decorator, Component, Node, Vec3, EventTouch, find, tween } from 'cc';
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
        // Clear active hints when the user starts interacting
        if (this.gm) this.gm.clearHints();

        this.originalParent = this.node.parent!;
        if (this.topLayerNode) {
            const worldPos = this.node.worldPosition.clone();
            this.node.setParent(this.topLayerNode);
            this.node.setWorldPosition(worldPos);
            tween(this.node)
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
        tween(this.node)
            .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
            .start();

        if (this.gm) {
            const nearestSlotIndex = this.gm.getNearestSlot(worldTouch);
            if (nearestSlotIndex !== -1) {
                this.gm.handleMove(this.node, nearestSlotIndex);
            } else {
                this.returnToHome();
            }
        } else {
            this.returnToHome();
        }
    }

    private returnToHome() {
        if (this.originalParent) {
            const targetWorldPos = this.originalParent.worldPosition;
            tween(this.node)
                .to(0.15, { worldPosition: targetWorldPos }, { easing: 'quadOut' })
                .call(() => {
                    this.node.setParent(this.originalParent);
                    this.node.setPosition(0, 0, 0);
                })
                .start();
        }
    }
}