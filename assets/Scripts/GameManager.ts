import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween } from 'cc';
import { MergeItem } from './MergeItem';
import { Draggable } from './Draggable';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property([Prefab]) stagePrefabs: Prefab[] = []; 
    @property([Node]) slots: Node[] = []; 
    @property(Node) gridContainer: Node = null!;

    private occupancy: (Node | null)[] = new Array(16).fill(null); 
    private itemsCreatedCount: number = 0;

    public spawnFromSpawner(prefabIndex: number) {
        if (this.gridContainer) this.gridContainer.active = true;

        // Sequence to help user reach Level 3: 
        // Two Lvl 0, One Lvl 1, One Lvl 2
        const coreLevels = [0, 0, 1, 2];
        coreLevels.forEach(lvl => this.spawnItem(lvl, prefabIndex));

        // Junk Items: 2 random items from other prefabs
        for (let i = 0; i < 2; i++) {
            let junkIdx = Math.floor(Math.random() * this.stagePrefabs.length);
            if (junkIdx === prefabIndex) junkIdx = (junkIdx + 1) % this.stagePrefabs.length;
            this.spawnItem(Math.random() > 0.5 ? 0 : 1, junkIdx);
        }
    }

    private spawnItem(level: number, prefabIdx: number) {
        const available = this.occupancy.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (available.length === 0) return;

        const idx = available[Math.floor(Math.random() * available.length)];
        const itemNode = instantiate(this.stagePrefabs[prefabIdx]);
        
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
        let minDist = 100; 
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
            this.occupancy[oldIdx] = null;
            this.occupancy[targetIdx] = draggedNode;
            draggedNode.setParent(this.slots[targetIdx]);
            draggedNode.setPosition(0, 0, 0);
            scriptA.currentSlotIndex = targetIdx;
        } else if (targetOccupant !== draggedNode) {
            const scriptB = targetOccupant.getComponent(MergeItem)!;
            
            if (scriptA.level === scriptB.level) {
                this.occupancy[oldIdx] = null;
                
                // Spin and Scale merge effect
                tween(targetOccupant)
                    .to(0.2, { scale: new Vec3(1.4, 1.4, 1.4), angle: 360 }, { easing: 'sineOut' })
                    .to(0.1, { scale: new Vec3(1, 1, 1), angle: 0 })
                    .call(() => {
                        // upgrade returns true if it hits Level 3
                        if (scriptB.upgrade()) {
                            this.completeStageGoal(targetOccupant, targetIdx);
                        }
                    })
                    .start();

                draggedNode.destroy();
            } else {
                draggedNode.setPosition(0, 0, 0);
            }
        } else {
            draggedNode.setPosition(0, 0, 0);
        }
    }

    private completeStageGoal(node: Node, index: number) {
        this.itemsCreatedCount++;
        this.occupancy[index] = null;
        node.destroy();
        
        console.log(`Item ${this.itemsCreatedCount} Created!`);
        
        if (this.gridContainer) this.gridContainer.active = false;
        this.clearGrid();
    }

    private clearGrid() {
        this.occupancy.forEach((node, i) => {
            if (node) {
                node.destroy();
                this.occupancy[i] = null;
            }
        });
    }
}