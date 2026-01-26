import { _decorator, Component, Node, Vec3, EventTouch } from 'cc';
import { GameManager } from './GameManager'; // Ensure filename is GameManager.ts
import { Wheat } from './Wheat'; // Ensure filename is Wheat.ts

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private startPos: Vec3 = new Vec3();
    public gm: GameManager = null!;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onTouchStart(event: EventTouch) {
        this.startPos.set(this.node.worldPosition);
        this.node.setSiblingIndex(99); // Bring to front
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
                this.gm.handleMove(this.node, nearestSlotIndex);
            } else {
                this.node.setWorldPosition(this.startPos);
            }
        } else {
            // Fallback: try to find it if not assigned
            this.gm = Node.find("Canvas/GameManager")?.getComponent(GameManager);
            this.node.setWorldPosition(this.startPos);
        }
    }
}