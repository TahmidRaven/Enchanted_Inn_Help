import { _decorator, Component, Node, Vec3, EventTouch, find } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private startPos: Vec3 = new Vec3();
    private originalParent: Node = null!;
    private topLayerNode: Node = null!;
    public gm: GameManager = null!;

    onLoad() {
        // Look for your specific "on top" node in the hierarchy
        this.topLayerNode = find('Canvas/MergeItemGoOnTop')!;

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        this.originalParent = this.node.parent!;
        this.startPos.set(this.node.worldPosition);

        if (this.topLayerNode) {
            // Capture current world position so it doesn't snap to (0,0) of the new parent
            const worldPos = this.node.worldPosition.clone();
            
            // Reparent to the node at the bottom of the hierarchy
            this.node.setParent(this.topLayerNode);
            this.node.setWorldPosition(worldPos);
        }
    }

    onTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        this.node.setWorldPosition(new Vec3(touchPos.x, touchPos.y, 0));
    }

    onTouchEnd(event: EventTouch) {
        const touchPos = event.getUILocation();
        const worldTouch = new Vec3(touchPos.x, touchPos.y, 0);
        
        if (this.gm) {
            const nearestSlotIndex = this.gm.getNearestSlot(worldTouch);
            
            if (nearestSlotIndex !== -1) {
                // GameManager.handleMove handles reparenting to the target slot
                this.gm.handleMove(this.node, nearestSlotIndex);
            } else {
                this.returnToOriginalSlot();
            }
        } else {
            this.returnToOriginalSlot();
        }
    }

    private returnToOriginalSlot() {
        if (this.originalParent) {
            this.node.setParent(this.originalParent);
            this.node.setPosition(0, 0, 0);
        }
    }
}