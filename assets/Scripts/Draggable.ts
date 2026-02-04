import { _decorator, Component, Node, Vec3, EventTouch, find, tween, UITransform } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private originalParent: Node = null!; 
    private topLayerNode: Node = null!;
    // Storing the "Home" state data manually
    private homePosition: Vec3 = new Vec3(0, 0, 0);
    private homeScale: Vec3 = new Vec3(1, 1, 1);
    
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
        
        // Save "Clone" data of the current state before moving to top layer
        this.originalParent = this.node.parent!;
        this.homePosition = this.node.position.clone(); // Usually (0,0,0)
        this.homeScale = this.node.scale.clone();
        
        const worldPos = this.node.worldPosition.clone();

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
        
        if (this.gm) {
            const nearestIdx = this.gm.getNearestSlot(worldTouch);
            if (nearestIdx !== -1) {
                this.gm.handleMove(this.node, nearestIdx);
            } else {
                this.returnToHome();
            }
        } else {
            this.returnToHome();
        }
    }

    public returnToHome() {
        if (this.originalParent && this.originalParent.isValid) {
            // Reparent first
            this.node.setParent(this.originalParent);

            // Instead of calculating math, we restore the "Clone" data we saved
            tween(this.node as Node)
                .to(0.2, { 
                    position: this.homePosition, 
                    scale: this.homeScale 
                }, { easing: 'backOut' })
                .start();
        }
    }
}