import { _decorator, Component, Node, Vec3, EventTouch, find, tween } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private originalParent: Node = null!; 
    private topLayerNode: Node = null!;
    private homePosition: Vec3 = new Vec3(0, 0, 0);
    private homeScale: Vec3 = new Vec3(1, 1, 1);
    
    private isDragging: boolean = false;
    private startTouchPos: Vec3 = new Vec3();
    private readonly DRAG_THRESHOLD: number = 20; // Slightly increased for mobile stability

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
        
        const loc = event.getUILocation();
        this.startTouchPos.set(loc.x, loc.y, 0);
        this.isDragging = false; 
    }

    private prepareDrag() {
        // Store current parent and local position before moving to top layer
        this.originalParent = this.node.parent!;
        this.homePosition = this.node.position.clone(); 
        this.homeScale = this.node.scale.clone();
        
        const worldPos = this.node.worldPosition.clone();

        if (this.topLayerNode) {
            this.node.setParent(this.topLayerNode);
            this.node.setWorldPosition(worldPos);
            
            tween(this.node as Node)
                .to(0.1, { scale: new Vec3(1.15, 1.15, 1.15) }, { easing: 'sineOut' })
                .start();
        }
    }

    onTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        const currentPos = new Vec3(touchPos.x, touchPos.y, 0);

        // Check if movement exceeds threshold to distinguish drag from tap
        if (!this.isDragging && Vec3.distance(this.startTouchPos, currentPos) > this.DRAG_THRESHOLD) {
            this.isDragging = true;
            this.prepareDrag();
        }

        if (this.isDragging) {
            this.node.setWorldPosition(currentPos);
        }
    }

    onTouchEnd(event: EventTouch) {
        // If it was just a tap and never moved to the top layer, do nothing
        if (!this.isDragging) {
            if (this.node.parent === this.topLayerNode) {
                this.returnToHome();
            }
            return;
        }

        const touchPos = event.getUILocation();
        const worldTouch = new Vec3(touchPos.x, touchPos.y, 0);
        
        if (this.gm) {
            const nearestIdx = this.gm.getNearestSlot(worldTouch);
            
            // If dropped over a valid slot
            if (nearestIdx !== -1) {
                this.gm.handleMove(this.node, nearestIdx);
                
                // If the move failed or was invalid, the node remains in top layer; return it home
                if (this.node.isValid && this.node.parent === this.topLayerNode) {
                    this.returnToHome();
                }
            } else {
                this.returnToHome();
            }
        } else {
            this.returnToHome();
        }

        this.isDragging = false; 
    }

    public returnToHome() {
        if (this.originalParent && this.originalParent.isValid) {
            tween(this.node as Node).stop();

            // Calculate current world position of the target slot to fly back accurately
            const targetWorldPos = this.originalParent.worldPosition.clone();

            tween(this.node as Node)
                .to(0.2, { 
                    worldPosition: targetWorldPos, 
                    scale: new Vec3(0.9, 1.1, 1) 
                }, { easing: 'sineOut' })
                .to(0.1, { scale: this.homeScale }, { easing: 'backOut' })
                .call(() => {
                    if (!this.node.isValid) return;
                    
                    // Re-parent and force reset local position to center of slot
                    this.node.setParent(this.originalParent);
                    this.node.setPosition(new Vec3(0, 0, 0)); 
                })
                .start();
        }
    }
}