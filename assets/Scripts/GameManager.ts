import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Sprite, Color, ParticleSystem2D } from 'cc';
import { MergeItem } from './MergeItem';
import { Draggable } from './Draggable';
import { VictoryScreen } from './VictoryScreen';
import { TrashAnimation } from './TrashAnimation'; 
import { TableTransition } from './TableTransition';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property([Prefab]) stagePrefabs: Prefab[] = []; 
    @property([Node]) slots: Node[] = []; 
    @property(Node) gridContainer: Node = null!; 
    @property(Node) gridVisualImage: Node = null!; 
    @property(Prefab) mergeParticlePrefab: Prefab = null!;
    @property({ type: [Component] }) spawnerComponents: Component[] = [];
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;
    @property(Node) decisionUINode: Node = null!; 

    @property(TrashAnimation) trashAnim: TrashAnimation = null!; 
    @property(TableTransition) tableTransition: TableTransition = null!;

    // --- NEW ANIMATION NODES ---
    @property(Node) dragonNode: Node = null!;
    @property(Node) fireTransitionNode: Node = null!;

    public currentStepIndex: number = 0;
    public gameStarted: boolean = false;

    // --- CHARACTER VISUALS ---
    @property(Node) allasseShiverHigh: Node = null!;
    @property(Node) allasseShiverLow: Node = null!;
    @property(Node) allasseHappy: Node = null!;
    @property(Node) nymeraShiver: Node = null!;
    @property(Node) nymeraHappy: Node = null!;

    // --- ROOM VISUALS ---
    @property(Node) bgWinter: Node = null!;
    @property(Node) fixedFloor: Node = null!; 
    @property(Node) trashItemsParent: Node = null!; 
    @property(Node) brokenWindows: Node = null!;
    @property(Node) fixedWindows: Node = null!;
    @property(Node) brokenFireplace: Node = null!;
    @property(Node) fixedFireplace: Node = null!;
    @property(Node) snowNode: Node = null!; 

    private occupancy: (Node | null)[] = new Array(16).fill(null); 
    private completedSteps: Set<number> = new Set();
    private readonly TOTAL_STEPS = 3; 

    onLoad() {
        this.setGridVisibility(false);
        this.updateCharacterVisuals("HIGH");
        if (this.bgWinter) this.bgWinter.active = true;
        
        // Ensure transition nodes are hidden initially
        const hiddenAtStart = [
            this.fixedFloor, this.fixedWindows, this.fixedFireplace, 
            this.dragonNode, this.fireTransitionNode
        ];
        hiddenAtStart.forEach(n => { if(n) n.active = false; });

        if (this.decisionUINode) {
            this.decisionUINode.on('DECISION_HELP', this.onStartGame, this);
            this.decisionUINode.on('DECISION_LEAVE', this.onFastForwardToVictory, this);
        }
    }

    private onStartGame() { this.gameStarted = true; }
    private onFastForwardToVictory() { if (this.victoryScreen) this.victoryScreen.show(); }

    private setGridVisibility(visible: boolean) {
        if (this.gridContainer) this.gridContainer.active = visible;
        if (this.gridVisualImage) this.gridVisualImage.active = visible;
    }

    public spawnFromSpawner(prefabIndex: number) {
        this.setGridVisibility(true);
        const coreLevels = [0, 0, 1, 2];
        coreLevels.forEach(lvl => this.spawnItem(lvl, prefabIndex));
        for (let i = 0; i < 3; i++) {
            let junkIdx = (prefabIndex + 1) % this.stagePrefabs.length;
            this.spawnItem(0, junkIdx);
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
        const itemScript = itemNode.getComponent(MergeItem);
        if (itemScript) {
            itemScript.level = level;
            itemScript.prefabIndex = prefabIdx;
            itemScript.currentSlotIndex = idx;
            itemScript.updateVisual();
        }
        const dragScript = itemNode.getComponent(Draggable);
        if (dragScript) dragScript.gm = this;
    }

    public handleMove(draggedNode: Node, targetIdx: number): boolean {
        if (targetIdx === -1 || !draggedNode.isValid) return false;
        const scriptA = draggedNode.getComponent(MergeItem)!;
        const targetOccupant = this.occupancy[targetIdx];

        if (targetOccupant && targetOccupant.isValid && targetOccupant !== draggedNode) {
            const scriptB = targetOccupant.getComponent(MergeItem)!;
            if (scriptA.level === scriptB.level && scriptA.prefabIndex === scriptB.prefabIndex) {
                this.occupancy[scriptA.currentSlotIndex] = null;
                this.playMergeParticle(targetOccupant.worldPosition);
                
                if (scriptB.upgrade()) {
                    this.scheduleOnce(() => {
                        this.hideGridAndClearItems(); 
                        if (scriptB.prefabIndex === 0) {
                            this.triggerTrashCollection(targetOccupant);
                        } else {
                            this.completedSteps.add(scriptB.prefabIndex);
                            if(targetOccupant.isValid) targetOccupant.destroy();
                            this.executeTransition(scriptB.prefabIndex);
                        }
                    }, 1.5); 
                }
                draggedNode.destroy();
                return true; 
            }
        }
        return false; 
    }

    private triggerTrashCollection(finalMergeNode: Node) {
        let items: Node[] = [];
        if (finalMergeNode && finalMergeNode.isValid) items.push(finalMergeNode);
        if (this.trashItemsParent) {
            this.trashItemsParent.children.forEach(c => { if(c.isValid) items.push(c); });
        }
        if (this.trashAnim) {
            this.trashAnim.playCleanup(items, () => {
                this.completedSteps.add(0);
                this.executeTransition(0);
                this.currentStepIndex = 1; 
                this.checkCelebration();
            });
        }
    }

    private executeTransition(stepIndex: number) {
        switch(stepIndex) {
            case 0: // Floor Fixed
                this.fadeInNode(this.fixedFloor);
                break;
            case 1: // Windows Fixed
                this.fadeNodes(this.brokenWindows, this.fixedWindows); 
                this.stopSnowEffect();
                this.updateCharacterVisuals("LOW"); 
                if (this.tableTransition) this.tableTransition.playTransition();
                this.currentStepIndex = 2;
                this.checkCelebration();
                break;
            case 2: // Fireplace - DRAGON SEQUENCE
                this.playFireplaceSequence();
                break;
        }
    }

    private playFireplaceSequence() {
        if (!this.dragonNode || !this.fireTransitionNode) {
            // Fallback if nodes are missing
            this.fadeNodes(this.brokenFireplace, this.fixedFireplace);
            this.currentStepIndex = 3;
            this.checkCelebration();
            return;
        }

        // 1. Show Dragon and bring to top of render list
        this.dragonNode.active = true;
        this.dragonNode.setSiblingIndex(this.dragonNode.parent!.children.length - 1);

        // 2. Wait for Dragon animation to reach "breath" point
        this.scheduleOnce(() => {
            // 3. Show Fire Transition and bring to top
            this.fireTransitionNode.active = true;
            this.fireTransitionNode.setSiblingIndex(this.fireTransitionNode.parent!.children.length - 1);

            this.scheduleOnce(() => {
                // 4. Swap fireplace visuals while fire is active
                this.fadeNodes(this.brokenFireplace, this.fixedFireplace);
                
                // 5. Cleanup: Hide dragon and fire
                this.dragonNode.active = false;
                this.fireTransitionNode.active = false;

                this.currentStepIndex = 3;
                this.checkCelebration();
            }, 1.5); // fire duration

        }, 2.0); // dragon appearance time
    }

    private hideGridAndClearItems() {
        this.setGridVisibility(false);
        this.occupancy.forEach(n => { if (n && n.isValid) n.destroy(); });
        this.occupancy.fill(null);
    }

    public clearHints() {
        this.occupancy.forEach(node => {
            if (node && node.isValid) {
                const item = node.getComponent(MergeItem);
                if (item) item.stopHint();
            }
        });
    }

    private updateCharacterVisuals(state: "HIGH" | "LOW" | "HAPPY") {
        if (this.allasseShiverHigh) this.allasseShiverHigh.active = (state === "HIGH");
        if (this.allasseShiverLow) this.allasseShiverLow.active = (state === "LOW");
        if (this.allasseHappy) this.allasseHappy.active = (state === "HAPPY");
        const finished = (state === "HAPPY");
        if (this.nymeraShiver) this.nymeraShiver.active = !finished;
        if (this.nymeraHappy) this.nymeraHappy.active = finished;
    }

    private fadeInNode(node: Node) {
        if (!node) return;
        node.active = true;
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = new Color(255, 255, 255, 0);
            tween(sprite).to(1.0, { color: Color.WHITE }).start();
        }
    }

    private fadeNodes(oldNode: Node, newNode: Node) {
        if (oldNode) {
            const oldSprite = oldNode.getComponent(Sprite);
            if (oldSprite) {
                tween(oldSprite).to(1.0, { color: new Color(255, 255, 255, 0) })
                .call(() => oldNode.active = false)
                .start();
            }
        }
        if (newNode) this.fadeInNode(newNode);
    }

    private stopSnowEffect() {
        if (this.snowNode) {
            const ps = this.snowNode.getComponent(ParticleSystem2D);
            if (ps) ps.stopSystem(); else this.snowNode.active = false;
        }
    }

    private playMergeParticle(worldPos: Vec3) {
        if (!this.mergeParticlePrefab) return;
        const p = instantiate(this.mergeParticlePrefab);
        p.setParent(this.node.parent);
        p.setWorldPosition(worldPos);
        this.scheduleOnce(() => { if(p.isValid) p.destroy(); }, 2.0);
    }

    private checkCelebration() {
        if (this.completedSteps.size === this.TOTAL_STEPS) {
            this.scheduleOnce(() => {
                this.updateCharacterVisuals("HAPPY");
                if (this.victoryScreen) this.victoryScreen.show();
            }, 1.0);
        }
    }

    public getNearestSlot(worldPos: Vec3): number {
        let nearestIdx = -1; let minDist = 150;
        this.slots.forEach((slot, idx) => {
            const dist = Vec3.distance(worldPos, slot.worldPosition);
            if (dist < minDist) { minDist = dist; nearestIdx = idx; }
        });
        return nearestIdx;
    }
}