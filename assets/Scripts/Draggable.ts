import { _decorator, Component, Node, Vec3, EventTouch } from 'cc';
import { GameManager } from './GameManager'; 

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
        this.node.setSiblingIndex(100); 
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
                this.node.setPosition(0, 0, 0);
            }
        } else {
            this.node.setPosition(0, 0, 0);
        }
    }
}