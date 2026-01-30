import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween } from 'cc';
import { MergeItem } from './MergeItem';
import { Draggable } from './Draggable';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property([Prefab]) stagePrefabs: Prefab[] = []; // 0:Trash, 1:Wood, 2:Tools, 3:Egg
    @property([Node]) slots: Node[] = []; 
    @property(Node) gridContainer: Node = null!;

    private currentStageIndex: number = 0;
    private occupancy: (Node | null)[] = new Array(16).fill(null); 

    
    onSpawnButtonPressed() {
        if (this.gridContainer) this.gridContainer.active = true;
        this.spawnItem(0); // Spawns level 0 of the current stage prefab
    }

    private spawnItem(level: number) {
        const available = this.occupancy.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (available.length === 0) return;

        const idx = available[Math.floor(Math.random() * available.length)];
        const itemNode = instantiate(this.stagePrefabs[this.currentStageIndex]);
        
        this.occupancy[idx] = itemNode;
        itemNode.setParent(this.slots[idx]);
        itemNode.setPosition(0, 0, 0);

        itemNode.setScale(new Vec3(0, 0, 0));
        tween(itemNode).to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

        const itemScript = itemNode.getComponent(MergeItem);
        const dragScript = itemNode.getComponent(Draggable);
        
        if (itemScript) {
            itemScript.level = level;
            itemScript.currentSlotIndex = idx;
            itemScript.updateVisual();
        }
        if (dragScript) dragScript.gm = this;
    }

    getNearestSlot(worldPos: Vec3): number {
        let nearestIdx = -1;
        let minDist = 100; // Threshold for snapping
        this.slots.forEach((slot, idx) => {
            const dist = Vec3.distance(worldPos, slot.worldPosition);
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = idx;
            }
        });
        return nearestIdx;
    }

    handleMove(draggedNode: Node, targetIdx: number) {
        const scriptA = draggedNode.getComponent(MergeItem)!;
        const oldIdx = scriptA.currentSlotIndex;
        const targetOccupant = this.occupancy[targetIdx];

        if (!targetOccupant) {
            // Move to empty slot
            this.occupancy[oldIdx] = null;
            this.occupancy[targetIdx] = draggedNode;
            draggedNode.setParent(this.slots[targetIdx]);
            draggedNode.setPosition(0, 0, 0);
            scriptA.currentSlotIndex = targetIdx;
        } else if (targetOccupant !== draggedNode) {
            const scriptB = targetOccupant.getComponent(MergeItem)!;
            
            if (scriptA.level === scriptB.level) {
                // Merge logic
                this.occupancy[oldIdx] = null;
                
                tween(targetOccupant)
                    .to(0.1, { scale: new Vec3(1.3, 1.3, 1.3) })
                    .to(0.1, { scale: new Vec3(1, 1, 1) })
                    .start();

                if (scriptB.upgrade()) {
                    // Item completed its 4th stage -> final goal
                    this.completeStageGoal(targetOccupant, targetIdx);
                }
                draggedNode.destroy();
            } else {
                draggedNode.setPosition(0, 0, 0);
            }
        } else {
            draggedNode.setPosition(0, 0, 0);
        }
    }

    private completeStageGoal(node: Node, index: number) {
        this.occupancy[index] = null;
        node.destroy();
        
        console.log(`Finished stage: ${this.currentStageIndex}`);
        // initial logic will change later -> next item type (Trash -> Wood -> Tools -> Egg) 
        if (this.currentStageIndex < this.stagePrefabs.length - 1) {
            this.currentStageIndex++;
            this.spawnItem(0);
        } else {
            console.log("Playable Complete! Show Win Badge.");
        }
    }
}