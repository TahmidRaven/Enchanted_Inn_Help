import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
import { Wheat } from './Wheat';
import { Draggable } from './Draggable';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab) wheatPrefab: Prefab = null!;
    @property([Node]) slots: Node[] = []; 

    private occupancy: (Node | null)[] = new Array(25).fill(null);
    private score: number = 0;

    start() {
        this.spawnWheat();
        this.spawnWheat();
    }

    spawnWheat() {
        const available = this.occupancy.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (available.length === 0) return;

        const idx = available[Math.floor(Math.random() * available.length)];
        const wheatNode = instantiate(this.wheatPrefab);
        
        this.occupancy[idx] = wheatNode;
        wheatNode.setParent(this.slots[idx]);
        wheatNode.setPosition(0, 0, 0);

        // Link references
        const wheatScript = wheatNode.getComponent(Wheat)!;
        const dragScript = wheatNode.getComponent(Draggable)!;
        
        wheatScript.currentSlotIndex = idx;
        wheatScript.updateVisual();
        dragScript.gm = this; // Manually assign the GM
    }

    getNearestSlot(worldPos: Vec3): number {
        let nearestIdx = -1;
        let minDist = 80; // Distance threshold to snap

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
        const scriptA = draggedNode.getComponent(Wheat)!;
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
            const scriptB = targetOccupant.getComponent(Wheat)!;

            if (scriptA.level === scriptB.level) {
                // Merge
                this.occupancy[oldIdx] = null;
                const reachedMax = scriptB.upgrade();


                if (reachedMax) {
                    this.addScore(1);
                    this.occupancy[targetIdx] = null;
                    targetOccupant.destroy();
                }

                draggedNode.destroy();
                this.spawnWheat();
            } else {
                draggedNode.setPosition(0, 0, 0);
            }
        } else {
            draggedNode.setPosition(0, 0, 0);
        }
    }

    addScore(pts: number) {
        this.score += pts;
        console.log("Total Score:", this.score);
    }
}