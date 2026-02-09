import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Sprite, Color, ParticleSystem2D, UIOpacity } from 'cc';
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

    // --- ANIMATION NODES ---
    @property(Node) dragonNode: Node = null!;
    @property(Node) fireTransitionNode: Node = null!;
    @property(Node) fireplaceFixedAnimSeq: Node = null!;

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
    @property(Node) snowNode: Node = null!; 

    // --- HINT SETTINGS ---
    @property({ tooltip: "Seconds of inactivity before showing a merge hint" })
    public hintInterval: number = 5.0; 

    public currentStepIndex: number = 0;
    public gameStarted: boolean = false;

    private occupancy: (Node | null)[] = new Array(16).fill(null); 
    private completedSteps: Set<number> = new Set();
    private readonly TOTAL_STEPS = 3; 
    private hintTimer: number = 0;

    onLoad() {
        this.setGridVisibility(false);
        this.updateCharacterVisuals("HIGH");
        if (this.bgWinter) this.bgWinter.active = true;
        
        const hiddenAtStart = [
            this.fixedFloor, this.fixedWindows, 
            this.dragonNode, this.fireTransitionNode, this.fireplaceFixedAnimSeq
        ];
        hiddenAtStart.forEach(n => { if(n) n.active = false; });

        if (this.decisionUINode) {
            this.decisionUINode.on('DECISION_HELP', this.onStartGame, this);
            this.decisionUINode.on('DECISION_LEAVE', this.onFastForwardToVictory, this);
        }
    }

    update(dt: number) {
        if (!this.gameStarted) return;

        // Count up inactivity
        this.hintTimer += dt;
        if (this.hintTimer >= this.hintInterval) {
            this.showMergeHint();
            this.hintTimer = 0; 
        }
    }

    private showMergeHint() {
        const activeItems: MergeItem[] = [];
        this.occupancy.forEach(node => {
            if (node && node.isValid) {
                const item = node.getComponent(MergeItem);
                if (item && !item.isHinting) activeItems.push(item);
            }
        });

        // Loop through grid to find matches
        for (let i = 0; i < activeItems.length; i++) {
            for (let j = i + 1; j < activeItems.length; j++) {
                const itemA = activeItems[i];
                const itemB = activeItems[j];

                // If level and type match
                if (itemA.level === itemB.level && itemA.prefabIndex === itemB.prefabIndex) {
                    const posA = itemA.node.worldPosition;
                    const posB = itemB.node.worldPosition;
                    
                    // Midpoint calculation: M = (A + B) / 2
                    const mid = new Vec3(
                        (posA.x + posB.x) / 2,
                        (posA.y + posB.y) / 2,
                        (posA.z + posB.z) / 2
                    );

                    itemA.playHint(mid);
                    itemB.playHint(mid);
                    return; // Only trigger one pair at a time
                }
            }
        }
    }

    public clearHints() {
        this.hintTimer = 0; // Reset timer on any touch
        this.occupancy.forEach(node => {
            if (node && node.isValid) {
                const item = node.getComponent(MergeItem);
                if (item) item.stopHint();
            }
        });
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
        
        let junkPool = this.stagePrefabs
            .map((_, idx) => idx)
            .filter(idx => idx !== prefabIndex);

        for (let i = junkPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [junkPool[i], junkPool[j]] = [junkPool[j], junkPool[i]];
        }

        const junkLevelSet = [0, 1, 2, 3]; 

        // Spawn for Junk Prefab 1
        if (junkPool.length > 0) {
            const junk1Idx = junkPool[0];
            junkLevelSet.forEach(lvl => this.spawnItem(lvl, junk1Idx));
        }

        // Spawn for Junk Prefab 2
        if (junkPool.length > 1) {
            const junk2Idx = junkPool[1];
            junkLevelSet.forEach(lvl => this.spawnItem(lvl, junk2Idx));
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
            case 1: // Windows Fixed + TABLE TRANSITION
                this.fadeNodes(this.brokenWindows, this.fixedWindows); 
                this.stopSnowEffect();
                this.updateCharacterVisuals("LOW"); 

                if (this.tableTransition) {
                    this.tableTransition.playTransition();
                }

                this.currentStepIndex = 2;
                this.checkCelebration();
                break;
            case 2: // Fireplace Transition
                this.playFireplaceSequence();
                break;
        }
    }

    private playFireplaceSequence() {
        if (!this.dragonNode || !this.fireTransitionNode || !this.fireplaceFixedAnimSeq) {
            this.currentStepIndex = 3;
            this.checkCelebration();
            return;
        }

        this.setNodeOpacity(this.dragonNode, 0);
        this.setNodeOpacity(this.fireTransitionNode, 0);
        this.setNodeOpacity(this.fireplaceFixedAnimSeq, 0);

        this.dragonNode.active = true;
        this.dragonNode.setSiblingIndex(this.dragonNode.parent!.children.length - 1);

        tween(this.getOpacityComp(this.dragonNode))
            .to(0.5, { opacity: 255 })
            .delay(0.65)
            .call(() => {
                this.fireTransitionNode.active = true;
                this.fireTransitionNode.setSiblingIndex(this.fireTransitionNode.parent!.children.length - 1);
                
                tween(this.getOpacityComp(this.dragonNode))
                    .to(0.3, { opacity: 0 })
                    .call(() => this.dragonNode.active = false)
                    .start();

                tween(this.getOpacityComp(this.fireTransitionNode))
                    .to(0.3, { opacity: 255 })
                    .start();

                this.fireplaceFixedAnimSeq.active = true;
                tween(this.getOpacityComp(this.fireplaceFixedAnimSeq))
                    .to(0.5, { opacity: 255 })
                    .start();

                if (this.tableTransition) {
                    tween(this.getOpacityComp(this.tableTransition.node))
                        .to(0.5, { opacity: 0 })
                        .call(() => { this.tableTransition.node.active = false; })
                        .start();
                }
            })
            .delay(0.5)
            .call(() => {
                tween(this.getOpacityComp(this.fireTransitionNode))
                    .to(0.5, { opacity: 0 })
                    .call(() => {
                        this.fireTransitionNode.active = false;
                        this.currentStepIndex = 3;
                        this.updateCharacterVisuals("HAPPY"); 
                        this.checkCelebration();
                    })
                    .start();
            })
            .start();
    }

    private getOpacityComp(node: Node): UIOpacity {
        let comp = node.getComponent(UIOpacity);
        if (!comp) comp = node.addComponent(UIOpacity);
        return comp;
    }

    private setNodeOpacity(node: Node, value: number) {
        this.getOpacityComp(node).opacity = value;
    }

    private hideGridAndClearItems() {
        this.setGridVisibility(false);
        this.occupancy.forEach(n => { if (n && n.isValid) n.destroy(); });
        this.occupancy.fill(null);
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
        this.setNodeOpacity(node, 0);
        tween(this.getOpacityComp(node)).to(1.0, { opacity: 255 }).start();
    }

    private fadeNodes(oldNode: Node, newNode: Node) {
        if (oldNode) {
            tween(this.getOpacityComp(oldNode))
                .to(1.0, { opacity: 0 })
                .call(() => oldNode.active = false)
                .start();
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
                if (this.victoryScreen) {
                    this.victoryScreen.show();
                }
            }, 2.5); 
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