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

    public currentStepIndex: number = 0;
    public gameStarted: boolean = false;

    // --- CHARACTER STATE PROPERTIES ---
    @property(Node) allasseShiverHigh: Node = null!;
    @property(Node) allasseShiverLow: Node = null!;
    @property(Node) allasseHappy: Node = null!;

    // Nymera only has two states
    @property(Node) nymeraShiver: Node = null!;
    @property(Node) nymeraHappy: Node = null!;

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
        
        // Initial State: High cold
        this.updateCharacterVisuals("HIGH");

        if (this.bgWinter) this.bgWinter.active = true;
        
        [this.fixedFloor, this.fixedWindows, this.fixedFireplace].forEach(n => {
            if(n) n.active = false;
        });

        if (this.decisionUINode) {
            this.decisionUINode.on('DECISION_HELP', this.onStartGame, this);
            this.decisionUINode.on('DECISION_LEAVE', this.onFastForwardToVictory, this);
        }
    }

    public clearHints() {
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
                            this.currentStepIndex++;
                            this.checkCelebration();
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

    private checkCelebration() {
        if (this.completedSteps.size === this.TOTAL_STEPS) this.celebrateCompletion();
    }

    private hideGridAndClearItems() {
        this.setGridVisibility(false);
        this.occupancy.forEach(n => { if (n && n.isValid) n.destroy(); });
        this.occupancy.fill(null);
    }

    private executeTransition(stepIndex: number) {
        switch(stepIndex) {
            case 0: // Trash Cleared
                this.fadeInNode(this.fixedFloor);
                break;
            case 1: // Windows Fixed
                this.fadeNodes(this.brokenWindows, this.fixedWindows); 
                this.stopSnowEffect();
                // Allasse goes to low shiver, Nymera stays shivering
                this.updateCharacterVisuals("LOW"); 
                if (this.tableTransition) this.tableTransition.playTransition();
                break;
            case 2: // Fireplace Fixed
                this.fadeNodes(this.brokenFireplace, this.fixedFireplace); 
                break;
        }
    }

    private updateCharacterVisuals(state: "HIGH" | "LOW" | "HAPPY") {
        // Allasse logic (3 states)
        if (this.allasseShiverHigh) this.allasseShiverHigh.active = (state === "HIGH");
        if (this.allasseShiverLow) this.allasseShiverLow.active = (state === "LOW");
        if (this.allasseHappy) this.allasseHappy.active = (state === "HAPPY");

        // Nymera logic (2 states)
        // She only becomes HAPPY at the very end. Otherwise, she is SHIVERING.
        const isGameFinished = (state === "HAPPY");
        if (this.nymeraShiver) this.nymeraShiver.active = !isGameFinished;
        if (this.nymeraHappy) this.nymeraHappy.active = isGameFinished;
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

    private stopSnowEffect() {
        if (this.snowNode) {
            const ps = this.snowNode.getComponent(ParticleSystem2D);
            if (ps) ps.stopSystem(); else this.snowNode.active = false;
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

    private playMergeParticle(worldPos: Vec3) {
        if (!this.mergeParticlePrefab) return;
        const p = instantiate(this.mergeParticlePrefab);
        p.setParent(this.node.parent);
        p.setWorldPosition(worldPos);
        this.scheduleOnce(() => { if(p.isValid) p.destroy(); }, 2.0);
    }

    private celebrateCompletion() {
        this.scheduleOnce(() => {
            // Final Stage: Both become HAPPY
            this.updateCharacterVisuals("HAPPY");
            if (this.victoryScreen) this.victoryScreen.show();
        }, 1.0);
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