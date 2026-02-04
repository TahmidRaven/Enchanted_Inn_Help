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
    private readonly DRAG_THRESHOLD: number = 20; 

    public gm: GameManager = null!;

    onLoad() {
        this.topLayerNode = find('Canvas/MergeItemGoOnTop')!;
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    onTouchStart(event: EventTouch) {
        if (!this.node.isValid) return;
        if (this.gm) this.gm.clearHints();
        
        const loc = event.getUILocation();
        this.startTouchPos.set(loc.x, loc.y, 0);
        this.isDragging = false; 
    }

    private prepareDrag() {
        if (!this.node.isValid || !this.node.parent || this.node.parent === this.topLayerNode) return;

        this.originalParent = this.node.parent!;
        this.homePosition = this.node.position.clone(); 
        this.homeScale = this.node.scale.clone();
        
        const worldPos = this.node.worldPosition.clone();

        if (this.topLayerNode) {
            tween(this.node).stop(); 
            this.node.setParent(this.topLayerNode);
            this.node.setWorldPosition(worldPos);
            
            tween(this.node as Node)
                .to(0.1, { scale: new Vec3(1.15, 1.15, 1.15) }, { easing: 'sineOut' })
                .start();
        }
    }

    onTouchMove(event: EventTouch) {
        if (!this.node.isValid) return;
        const touchPos = event.getUILocation();
        const currentPos = new Vec3(touchPos.x, touchPos.y, 0);

        if (!this.isDragging && Vec3.distance(this.startTouchPos, currentPos) > this.DRAG_THRESHOLD) {
            this.isDragging = true;
            this.prepareDrag();
        }

        if (this.isDragging) {
            this.node.setWorldPosition(currentPos);
        }
    }

    onTouchEnd(event: EventTouch) {
        if (!this.isDragging) {
            this.forceCleanUp();
            return;
        }

        const touchPos = event.getUILocation();
        const worldTouch = new Vec3(touchPos.x, touchPos.y, 0);
        
        let mergeHappened = false;
        if (this.gm && this.node.isValid) {
            const nearestIdx = this.gm.getNearestSlot(worldTouch);
            mergeHappened = this.gm.handleMove(this.node, nearestIdx);
        }

        if (!mergeHappened && this.node.isValid) {
            this.returnToHome();
        }

        this.isDragging = false; 
    }

    onTouchCancel(event: EventTouch) {
        if (this.node.isValid) {
            this.returnToHome();
        }
        this.isDragging = false;
    }

    private forceCleanUp() {
        if (this.node.isValid && this.node.parent === this.topLayerNode && this.originalParent) {
            this.node.setParent(this.originalParent);
            this.node.setPosition(Vec3.ZERO);
        }
    }

    public returnToHome() {
        if (!this.node.isValid) return;

        if (this.originalParent && this.originalParent.isValid) {
            tween(this.node).stop();
            const targetWorldPos = this.originalParent.worldPosition.clone();

            tween(this.node as Node)
                .to(0.15, { 
                    worldPosition: targetWorldPos, 
                    scale: new Vec3(0.9, 1.1, 1) 
                }, { easing: 'sineOut' })
                .to(0.1, { scale: this.homeScale }, { easing: 'backOut' })
                .call(() => {
                    if (!this.node.isValid) return;
                    this.node.setParent(this.originalParent);
                    this.node.setPosition(Vec3.ZERO); 
                })
                .start();
        } else if (this.node.parent === this.topLayerNode) {
            this.node.destroy();
        }
    }
}