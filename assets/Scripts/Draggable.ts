import { _decorator, Component, Node, Vec3, EventTouch, find, tween } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private originalParent: Node = null!; 
    private topLayerNode: Node = null!;
    private savedWorldPos: Vec3 = new Vec3();
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
        
        this.node.getWorldPosition(this.savedWorldPos);

        if (this.topLayerNode) {
            this.node.setParent(this.topLayerNode);
            this.node.setWorldPosition(this.savedWorldPos);

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
        // Feedback shake before returning
        tween(this.node as Node)
            .by(0.05, { position: new Vec3(10, 0, 0) })
            .by(0.05, { position: new Vec3(-20, 0, 0) })
            .by(0.05, { position: new Vec3(10, 0, 0) })
            .call(() => {
                this.returnToHome();
            })
            .start();
    }

    private returnToHome() {
        if (this.originalParent) {
            const homePos = this.originalParent.worldPosition;

            tween(this.node as Node)
                .to(0.15, { worldPosition: homePos }, { easing: 'quadOut' })
                .call(() => {
                    this.node.setParent(this.originalParent);
                    
                    this.node.setPosition(0, 0, 0); 
                })
                .start();
        }
    }
}