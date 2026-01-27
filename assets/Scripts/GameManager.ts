import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween } from 'cc';
import { Wheat } from './Wheat';
import { Draggable } from './Draggable';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab) wheatPrefab: Prefab = null!;
    @property([Node]) slots: Node[] = []; 
    @property(Node) gridContainer: Node = null!;

    private occupancy: (Node | null)[] = new Array(25).fill(null);
    private score: number = 0;

    onSpawnButtonPressed() {
        if (this.gridContainer) {
            this.gridContainer.active = true;
        }

        this.spawnSpecificLevel(0);
        this.spawnSpecificLevel(0);
        this.spawnSpecificLevel(1);
        this.spawnSpecificLevel(2);
    }

    private spawnSpecificLevel(level: number) {
        const available = this.occupancy.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (available.length === 0) return;

        const idx = available[Math.floor(Math.random() * available.length)];
        const wheatNode = instantiate(this.wheatPrefab);
        
        this.occupancy[idx] = wheatNode;
        wheatNode.setParent(this.slots[idx]);
        wheatNode.setPosition(0, 0, 0);

        // --- Spawn Animation ---
        wheatNode.setScale(new Vec3(0, 0, 0)); // Start invisible
        tween(wheatNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        const wheatScript = wheatNode.getComponent(Wheat);
        const dragScript = wheatNode.getComponent(Draggable);
        
        if (wheatScript) {
            wheatScript.level = level;
            wheatScript.currentSlotIndex = idx;
            wheatScript.updateVisual();
        }
        
        if (dragScript) {
            dragScript.gm = this;
        }
    }

    // This is no longer called automatically after merge
    spawnWheat() {
        this.spawnSpecificLevel(0);
    }

    getNearestSlot(worldPos: Vec3): number {
        let nearestIdx = -1;
        let minDist = 80;
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
            this.occupancy[oldIdx] = null;
            this.occupancy[targetIdx] = draggedNode;
            draggedNode.setParent(this.slots[targetIdx]);
            draggedNode.setPosition(0, 0, 0);
            scriptA.currentSlotIndex = targetIdx;
        } else if (targetOccupant !== draggedNode) {
            const scriptB = targetOccupant.getComponent(Wheat)!;
            if (scriptA.level === scriptB.level) {
                this.occupancy[oldIdx] = null;
                
                // --- Merge Animation ---
                // Scale target up and back down to signal growth
                tween(targetOccupant)
                    .to(0.1, { scale: new Vec3(1.4, 1.4, 1.4) })
                    .to(0.1, { scale: new Vec3(1, 1, 1) })
                    .start();

                if (scriptB.upgrade()) {
                    this.addScore(1);
                    this.occupancy[targetIdx] = null;
                    targetOccupant.destroy();
                }
                
                draggedNode.destroy();
                // spawnWheat() removed here as requested
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