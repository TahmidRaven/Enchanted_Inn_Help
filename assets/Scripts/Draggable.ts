import { _decorator, Component, Node, Vec3, EventTouch } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private startPos: Vec3 = new Vec3();
    public gm: GameManager = null!;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            this.startPos.set(this.node.worldPosition);
            this.node.setSiblingIndex(100); 
        }, this);

        this.node.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            const loc = e.getUILocation();
            this.node.setWorldPosition(new Vec3(loc.x, loc.y, 0));
        }, this);

        this.node.on(Node.EventType.TOUCH_END, this.handleEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.handleEnd, this);
    }

    handleEnd(event: EventTouch) {
        const loc = event.getUILocation();
        const worldPos = new Vec3(loc.x, loc.y, 0);
        
        if (this.gm) {
            const nearest = this.gm.getNearestSlot(worldPos);
            if (nearest !== -1) {
                this.gm.handleMove(this.node, nearest);
            } else {
                this.node.setPosition(0, 0, 0);
            }
        } else {
            this.node.setPosition(0, 0, 0);
        }
    }
}