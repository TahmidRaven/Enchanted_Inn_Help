import { _decorator, Component, Node, Vec3, EventTouch, find, tween } from 'cc';
import { GameManager } from './GameManager'; 

const { ccclass, property } = _decorator;

@ccclass('Draggable')
export class Draggable extends Component {
    private originalParent: Node = null!; 
    private topLayerNode: Node = null!;
    private homePosition: Vec3 = new Vec3(0, 0, 0);
    private homeScale: Vec3 = new Vec3(1, 1, 1);
    
    // Drag threshold variables - Fixing the tap issue
    private isDragging: boolean = false;
    private startTouchPos: Vec3 = new Vec3();
    private readonly DRAG_THRESHOLD: number = 15; 

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
        this.isDragging = false; // Reset dragging state on every new touch
    }

    private prepareDrag() {
        // Capture original state before we move the node
        this.originalParent = this.node.parent!;
        this.homePosition = this.node.position.clone(); 
        this.homeScale = this.node.scale.clone();
        
        const worldPos = this.node.worldPosition.clone();

        if (this.topLayerNode) {
            this.node.setParent(this.topLayerNode);
            this.node.setWorldPosition(worldPos);
            
            // Subtle "Pick up" pop
            tween(this.node as Node)
                .to(0.1, { scale: new Vec3(1.15, 1.15, 1.15) }, { easing: 'sineOut' })
                .start();
        }
    }

    onTouchMove(event: EventTouch) {
        const touchPos = event.getUILocation();
        const currentPos = new Vec3(touchPos.x, touchPos.y, 0);

        // Only start drag logic if moved past threshold
        if (!this.isDragging && Vec3.distance(this.startTouchPos, currentPos) > this.DRAG_THRESHOLD) {
            this.isDragging = true;
            this.prepareDrag();
        }

        if (this.isDragging) {
            this.node.setWorldPosition(currentPos);
        }
    }

    onTouchEnd(event: EventTouch) {
        // IMPORTANT: If we never started dragging, ignore the end logic entirely.
        // This prevents the item from "jumping" to the top layer's (0,0,0) on a tap.
        if (!this.isDragging) return;

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

        this.isDragging = false; 
    }

    public returnToHome() {
        if (this.originalParent && this.originalParent.isValid) {
            tween(this.node as Node).stop();

            // Calculate the slot's world position so we can fly back to it
            const targetWorldPos = this.originalParent.worldPosition.clone();

            tween(this.node as Node)
                // 1. Fly from current finger position back to slot center
                .to(0.25, { 
                    worldPosition: targetWorldPos, 
                    scale: new Vec3(0.9, 1.1, 1) // Stretch during flight
                }, { easing: 'backOut' })
                // 2. Squash on impact
                .to(0.1, { scale: new Vec3(1.1, 0.9, 1) }, { easing: 'quadOut' })
                // 3. Settle and snap parent back
                .to(0.1, { scale: this.homeScale }, { easing: 'sineInOut' })
                .call(() => {
                    this.node.setParent(this.originalParent);
                    this.node.setPosition(this.homePosition); // Snap to local (0,0,0)
                })
                .start();
        }
    }
}