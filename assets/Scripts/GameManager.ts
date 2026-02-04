import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Sprite, Color, ParticleSystem2D } from 'cc';
import { MergeItem } from './MergeItem';
import { Draggable } from './Draggable';
import { VictoryScreen } from './VictoryScreen';
import { TrashAnimation } from './TrashAnimation'; 

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

    public currentStepIndex: number = 0;
    public gameStarted: boolean = false;

    @property(Node) allasseShiver: Node = null!;
    @property(Node) allasseHappy: Node = null!;
    @property(Node) nymeraShiver: Node = null!;
    @property(Node) nymeraHappy: Node = null!;

    @property(Node) bgWinter: Node = null!;
    @property(Node) fixedFloor: Node = null!; 
    @property(Node) trashItemsParent: Node = null!; 
    @property(Node) brokenWindows: Node = null!;
    @property(Node) fixedWindows: Node = null!;
    @property(Node) brokenTables: Node = null!;
    @property(Node) fixedTables: Node = null!;
    @property(Node) brokenFireplace: Node = null!;
    @property(Node) fixedFireplace: Node = null!;
    @property(Node) snowNode: Node = null!; 

    private occupancy: (Node | null)[] = new Array(16).fill(null); 
    private completedSteps: Set<number> = new Set();
    private readonly TOTAL_STEPS = 3; 

    onLoad() {
        this.setGridVisibility(false);
        this.toggleCharacterState(this.allasseHappy, false);
        this.toggleCharacterState(this.nymeraHappy, false);
        if (this.bgWinter) this.bgWinter.active = true;
        this.setNodeActive(this.fixedFloor, false);
        this.setNodeActive(this.fixedWindows, false);
        this.setNodeActive(this.fixedTables, false);
        this.setNodeActive(this.fixedFireplace, false);

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
                        this.completedSteps.add(scriptB.prefabIndex);
                        
                        if (scriptB.prefabIndex === 0) {
                            this.triggerTrashCollection(targetOccupant);
                        } else {
                            if(targetOccupant.isValid) targetOccupant.destroy();
                            this.executeTransition(scriptB.prefabIndex);
                            this.currentStepIndex++;
                            this.checkCelebration();
                        }
                    }, 0.5); 
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
            // Wait for the full animation sequence to finish before incrementing state
            this.trashAnim.playCleanup(items, () => {
                this.executeTransition(0); 
                this.currentStepIndex++; 
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
            case 0: this.fadeInNode(this.fixedFloor); break;
            case 1: 
                this.fadeNodes(this.brokenWindows, this.fixedWindows); 
                this.stopSnowEffect(); 
                this.scheduleOnce(() => { 
                    this.animateChildrenSequentially(this.brokenTables, false); 
                    this.animateChildrenSequentially(this.fixedTables, true);
                }, 0.6);
                break;
            case 2: this.fadeNodes(this.brokenFireplace, this.fixedFireplace); break;
        }
    }

    private animateChildrenSequentially(parent: Node, fadeIn: boolean) {
        if (!parent) return;
        parent.active = true;
        parent.children.forEach((child, idx) => {
            const sprite = child.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(255, 255, 255, fadeIn ? 0 : 255);
                tween(sprite).delay(idx * 0.2).to(0.8, { color: new Color(255, 255, 255, fadeIn ? 255 : 0) }).start();
            }
        });
    }

    private fadeInNode(node: Node) {
        if (!node) return;
        node.active = true;
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = new Color(255, 255, 255, 0);
            tween(sprite).to(1.0, { color: new Color(255, 255, 255, 255) }).start();
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
            if (oldSprite) tween(oldSprite).to(1.0, { color: new Color(255, 255, 255, 0) }).call(() => oldNode.active = false).start();
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
            this.toggleCharacterState(this.allasseShiver, false);
            this.toggleCharacterState(this.nymeraShiver, false);
            this.toggleCharacterState(this.allasseHappy, true);
            this.toggleCharacterState(this.nymeraHappy, true);
            if (this.victoryScreen) this.victoryScreen.show();
        }, 1.0);
    }

    private toggleCharacterState(node: Node, active: boolean) { if (node) node.active = active; }
    private setNodeActive(node: Node, active: boolean) { if (node) node.active = active; }
    public clearHints() {} 
    public getNearestSlot(worldPos: Vec3): number {
        let nearestIdx = -1; let minDist = 150;
        this.slots.forEach((slot, idx) => {
            const dist = Vec3.distance(worldPos, slot.worldPosition);
            if (dist < minDist) { minDist = dist; nearestIdx = idx; }
        });
        return nearestIdx;
    }
}