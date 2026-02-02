import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Sprite, Color, ParticleSystem2D } from 'cc';
import { MergeItem } from './MergeItem';
import { Draggable } from './Draggable';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property([Prefab]) stagePrefabs: Prefab[] = []; 
    @property([Node]) slots: Node[] = []; 
    @property(Node) gridContainer: Node = null!;

    @property(Prefab) mergeParticlePrefab: Prefab = null!;
    @property(Node) bgWinter: Node = null!;
    @property(Node) bgSummer: Node = null!;
    @property(Node) medievalTrash: Node = null!; 
    @property(Node) trashItemsParent: Node = null!; 

    private occupancy: (Node | null)[] = new Array(16).fill(null); 

    onLoad() {
        if (this.gridContainer) this.gridContainer.active = false;
    }

    public spawnFromSpawner(prefabIndex: number) {
        if (this.gridContainer) this.gridContainer.active = true;
        const coreLevels = [0, 0, 1, 2];
        coreLevels.forEach(lvl => this.spawnItem(lvl, prefabIndex));

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
            itemScript.prefabIndex = prefabIdx;
            itemScript.currentSlotIndex = idx;
            itemScript.updateVisual();
        }
        if (dragScript) dragScript.gm = this;
    }

    public getNearestSlot(worldPos: Vec3): number {
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
                this.playMergeParticle(targetOccupant.worldPosition);

                tween(targetOccupant)
                    .to(0.2, { scale: new Vec3(1.4, 1.4, 1.4), angle: 360 })
                    .to(0.1, { scale: new Vec3(1, 1, 1), angle: 0 })
                    .call(() => {
                        if (scriptB.upgrade()) {
                            // Wait 1 second after merging the final step before hiding grid
                            this.scheduleOnce(() => {
                                this.hideGridAndClearItems();
                                if (scriptB.prefabIndex === 0) {
                                    this.triggerTrashCollection(targetOccupant);
                                } else {
                                    targetOccupant.destroy();
                                }
                            }, 1.0);
                        }
                    }).start();
                draggedNode.destroy();
            } else {
                draggedNode.setPosition(0, 0, 0);
            }
        } else {
            draggedNode.setPosition(0, 0, 0);
        }
    }

    private playMergeParticle(worldPos: Vec3) {
        if (!this.mergeParticlePrefab) return;
        const p = instantiate(this.mergeParticlePrefab);
        p.setParent(this.node.parent);
        p.setWorldPosition(worldPos);
        const ps = p.getComponent(ParticleSystem2D);
        if (ps) ps.resetSystem();
        this.scheduleOnce(() => { if(p.isValid) p.destroy(); }, 2.0);
    }

    private hideGridAndClearItems() {
        if (this.gridContainer) this.gridContainer.active = false;
        this.occupancy.forEach(n => { if (n && n.isValid) n.destroy(); });
        this.occupancy.fill(null);
    }

    private triggerTrashCollection(finalMergeNode: Node) {
        if (this.medievalTrash) {
            this.medievalTrash.active = true;
            this.medievalTrash.setScale(new Vec3(0, 0, 0));
            tween(this.medievalTrash)
                .to(0.6, { scale: new Vec3(1, 1, 1) }, { easing: 'elasticOut' })
                .call(() => { this.collectItemsOneByOne(finalMergeNode); })
                .start();
        }
    }

    private collectItemsOneByOne(finalNode: Node) {
        const targetPos = this.medievalTrash.worldPosition;
        let itemsToAnimate: Node[] = [];
        if (finalNode && finalNode.isValid) itemsToAnimate.push(finalNode);
        if (this.trashItemsParent) {
            this.trashItemsParent.children.forEach(trash => { if (trash && trash.isValid) itemsToAnimate.push(trash); });
        }

        let finishedCount = 0;
        const totalItems = itemsToAnimate.length;

        itemsToAnimate.forEach((item, idx) => {
            const startPos = item.worldPosition.clone();
            const controlPoint = new Vec3((startPos.x + targetPos.x) / 2, Math.max(startPos.y, targetPos.y) + 400, 0);
            let obj = { t: 0 };
            
            tween(obj).delay(idx * 0.15).to(0.7, { t: 1 }, {
                easing: 'quadIn',
                onUpdate: () => {
                    if (!item || !item.isValid) return;
                    item.setWorldPosition(this.getBezierPoint(startPos, controlPoint, targetPos, obj.t));
                    item.angle += 20;
                    item.setScale(new Vec3(1 - obj.t, 1 - obj.t, 1 - obj.t));
                }
            }).call(() => {
                if (item && item.isValid) item.active = false;
                this.shakeTrash(); 
                finishedCount++;
                
                if (finishedCount === totalItems) {
                    this.transitionToSummer();
                    // Destroy the medieval trash after a short delay so the transition is visible
                    tween(this.medievalTrash)
                        .delay(1.5) 
                        .to(0.5, { scale: new Vec3(0, 0, 0) }, { easing: 'backIn' })
                        .call(() => {
                            if (this.medievalTrash && this.medievalTrash.isValid) {
                                this.medievalTrash.active = false;
                                // If you want to fully destroy it: this.medievalTrash.destroy();
                            }
                        })
                        .start();
                }
            }).start();
        });
    }

    private shakeTrash() {
        if (!this.medievalTrash) return;
        tween(this.medievalTrash)
            .by(0.05, { position: new Vec3(5, 0, 0) })
            .by(0.05, { position: new Vec3(-10, 0, 0) })
            .by(0.05, { position: new Vec3(5, 0, 0) })
            .start();
    }

    private getBezierPoint(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
        const out = new Vec3();
        out.x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x;
        out.y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y;
        return out;
    }

    private transitionToSummer() {
        if (this.bgWinter && this.bgSummer) {
            const winterSprite = this.bgWinter.getComponent(Sprite);
            if (winterSprite) tween(winterSprite).to(1.5, { color: new Color(255, 255, 255, 0) }).start();
            this.bgSummer.active = true;
            const summerSprite = this.bgSummer.getComponent(Sprite);
            if (summerSprite) {
                summerSprite.color = new Color(255, 255, 255, 0);
                tween(summerSprite).to(1.5, { color: new Color(255, 255, 255, 255) }).start();
            }
        }
    }
}