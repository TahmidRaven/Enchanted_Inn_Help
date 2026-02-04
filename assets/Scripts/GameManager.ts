import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Sprite, Color, ParticleSystem2D, Animation } from 'cc';
import { MergeItem } from './MergeItem';
import { Draggable } from './Draggable';
import { VictoryScreen } from './VictoryScreen';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property([Prefab]) stagePrefabs: Prefab[] = []; 
    @property([Node]) slots: Node[] = []; 
    @property(Node) gridContainer: Node = null!; // The logic node containing slot positions
    @property(Node) gridVisualImage: Node = null!; // The actual wooden grid image
    @property(Prefab) mergeParticlePrefab: Prefab = null!;
    @property({ type: [Component] }) spawnerComponents: Component[] = [];
    @property(VictoryScreen) victoryScreen: VictoryScreen = null!;
    @property(Node) decisionUINode: Node = null!; 

    public currentStepIndex: number = 0;
    public gameStarted: boolean = false;

    @property(Node) allasseShiver: Node = null!;
    @property(Node) allasseHappy: Node = null!;
    @property(Node) nymeraShiver: Node = null!;
    @property(Node) nymeraHappy: Node = null!;

    @property(Node) bgWinter: Node = null!;
    @property(Node) bgSummer: Node = null!;
    @property(Node) medievalTrash: Node = null!;
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
    private hintTimer: number = 0;
    private readonly HINT_DELAY: number = 6.0; 
    private activeHintNodes: Node[] = [];

    onLoad() {

        this.setGridVisibility(false);
        
        this.toggleCharacterState(this.allasseHappy, false);
        this.toggleCharacterState(this.nymeraHappy, false);
        this.setNodeActive(this.bgSummer, false);
        this.setNodeActive(this.fixedWindows, false);
        this.setNodeActive(this.fixedTables, false);
        this.setNodeActive(this.fixedFireplace, false);
        if (this.snowNode) this.snowNode.active = true;

        if (this.decisionUINode) {
            this.decisionUINode.on('DECISION_HELP', this.onStartGame, this);
            this.decisionUINode.on('DECISION_LEAVE', this.onFastForwardToVictory, this);
        }
    }

    private onStartGame() {
        console.log("Game started! Spawners are now allowed to animate.");
        this.gameStarted = true; 
        this.setGridVisibility(false);
    }

    private onFastForwardToVictory() {
        console.log("Player chose to leave. Showing victory screen.");
        this.setGridVisibility(false);
        if (this.victoryScreen) {
            this.victoryScreen.show();
        }
    }

    private setGridVisibility(visible: boolean) {
        if (this.gridContainer) this.gridContainer.active = visible;
        if (this.gridVisualImage) this.gridVisualImage.active = visible;
    }

    update(dt: number) {
        if (this.gridContainer && this.gridContainer.active && this.activeHintNodes.length === 0) {
            this.hintTimer += dt;
            if (this.hintTimer >= this.HINT_DELAY) {
                this.findAndShowHint();
            }
        }
    }

    public clearHints() {
        this.activeHintNodes.forEach(node => {
            if (node && node.isValid) {
                node.getComponent(MergeItem)?.stopHint();
            }
        });
        this.activeHintNodes = [];
        this.hintTimer = 0;
    }

    private findAndShowHint() {
        this.clearHints();
        for (let i = 0; i < this.occupancy.length; i++) {
            const nodeA = this.occupancy[i];
            if (!nodeA) continue;
            const scriptA = nodeA.getComponent(MergeItem)!;
            for (let j = i + 1; j < this.occupancy.length; j++) {
                const nodeB = this.occupancy[j];
                if (!nodeB) continue;
                const scriptB = nodeB.getComponent(MergeItem)!;
                if (scriptA.level === scriptB.level && scriptA.prefabIndex === scriptB.prefabIndex) {
                    this.applyHintEffect(nodeA, nodeB);
                    return; 
                }
            }
        }
    }

    private applyHintEffect(nodeA: Node, nodeB: Node) {
        const posA = nodeA.worldPosition;
        const posB = nodeB.worldPosition;
        const mid = new Vec3((posA.x + posB.x) / 2, (posA.y + posB.y) / 2, 0);
        nodeA.getComponent(MergeItem)?.playHint(mid);
        nodeB.getComponent(MergeItem)?.playHint(mid);
        this.activeHintNodes = [nodeA, nodeB];
    }

    public spawnFromSpawner(prefabIndex: number) {
        this.clearHints();
        // Activate grid only when the player actually starts a merge task
        this.setGridVisibility(true); 

        const coreLevels = [0, 0, 1, 2];
        coreLevels.forEach(lvl => this.spawnItem(lvl, prefabIndex));

        for (let i = 0; i < 3; i++) {
            let junkPrefabIdx = Math.floor(Math.random() * this.stagePrefabs.length);
            if (junkPrefabIdx === prefabIndex) {
                junkPrefabIdx = (junkPrefabIdx + 1) % this.stagePrefabs.length;
            }
            const junkLevel = Math.random() > 0.5 ? 1 : 0;
            this.spawnItem(junkLevel, junkPrefabIdx);
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

    public handleMove(draggedNode: Node, targetIdx: number): boolean {
        this.clearHints();
        if (targetIdx === -1 || !draggedNode.isValid) return false;

        const scriptA = draggedNode.getComponent(MergeItem)!;
        const oldIdx = scriptA.currentSlotIndex;
        const targetOccupant = this.occupancy[targetIdx];

        if (targetOccupant && targetOccupant.isValid && targetOccupant !== draggedNode) {
            const scriptB = targetOccupant.getComponent(MergeItem)!;
            if (scriptA.level === scriptB.level && scriptA.prefabIndex === scriptB.prefabIndex) {
                this.occupancy[oldIdx] = null;
                this.playMergeParticle(targetOccupant.worldPosition);
                tween(targetOccupant).stop(); 

                tween(targetOccupant)
                    .to(0.15, { scale: new Vec3(1.4, 1.4, 1.4), angle: 360 }, { easing: 'sineOut' })
                    .to(0.1, { scale: new Vec3(1, 1, 1), angle: 0 }, { easing: 'sineIn' })
                    .call(() => {
                        if (scriptB.upgrade()) {
                            this.scheduleOnce(() => {
                                this.hideGridAndClearItems(); 
                                this.completedSteps.add(scriptB.prefabIndex);

                                const spawnerComp = this.spawnerComponents[this.currentStepIndex];
                                if (spawnerComp) {
                                    const spawnerAny = spawnerComp as any;
                                    if (typeof spawnerAny.selfDestruct === 'function') {
                                        spawnerAny.selfDestruct();
                                    } else {
                                        spawnerComp.node.destroy();
                                    }
                                }

                                if (scriptB.prefabIndex === 0) {
                                    this.triggerTrashCollection(targetOccupant);
                                } else {
                                    if(targetOccupant.isValid) targetOccupant.destroy();
                                    this.executeTransition(scriptB.prefabIndex);
                                }
                                this.currentStepIndex++;
                                if (this.completedSteps.size === this.TOTAL_STEPS) this.celebrateCompletion();
                            }, 0.5); 
                        }
                    }).start();
                draggedNode.destroy();
                return true; 
            }
        }
        return false; 
    }

    private hideGridAndClearItems() {
        this.setGridVisibility(false);
        this.occupancy.forEach(n => { if (n && n.isValid) n.destroy(); });
        this.occupancy.fill(null);
        this.clearHints();
    }

    private celebrateCompletion() {
        this.scheduleOnce(() => {
            this.toggleCharacterState(this.allasseShiver, false);
            this.toggleCharacterState(this.nymeraShiver, false);
            this.toggleCharacterState(this.allasseHappy, true);
            this.toggleCharacterState(this.nymeraHappy, true);

            if (this.victoryScreen) {
                this.scheduleOnce(() => {
                    this.victoryScreen.show();
                }, 0.8);
            }
        }, 1.5);
    }

    private triggerTrashCollection(finalMergeNode: Node) {
        if (this.medievalTrash) {
            this.medievalTrash.active = true;
            this.medievalTrash.setScale(Vec3.ZERO);
            tween(this.medievalTrash)
                .to(0.6, { scale: Vec3.ONE }, { easing: 'elasticOut' })
                .call(() => { this.collectItemsOneByOne(finalMergeNode); })
                .start();
        }
    }

    private collectItemsOneByOne(finalNode: Node) {
        const targetPos = this.medievalTrash.worldPosition;
        let itemsToAnimate: Node[] = [];
        if (finalNode && finalNode.isValid) itemsToAnimate.push(finalNode);
        if (this.trashItemsParent) {
            this.trashItemsParent.children.forEach(trash => { if(trash.isValid) itemsToAnimate.push(trash); });
        }

        let finishedCount = 0;
        itemsToAnimate.forEach((item, idx) => {
            const startPos = item.worldPosition.clone();
            const controlPoint = new Vec3((startPos.x + targetPos.x) / 2, Math.max(startPos.y, targetPos.y) + 400, 0);
            let obj = { t: 0 };
            tween(obj).delay(idx * 0.15).to(0.7, { t: 1 }, {
                easing: 'quadIn',
                onUpdate: () => {
                    if (!item.isValid) return;
                    item.setWorldPosition(this.getBezierPoint(startPos, controlPoint, targetPos, obj.t));
                    item.angle += 20;
                    item.setScale(new Vec3(1 - obj.t, 1 - obj.t, 1 - obj.t));
                }
            }).call(() => {
                item.active = false;
                this.shakeTrash(); 
                finishedCount++;
                if (finishedCount === itemsToAnimate.length) {
                    this.executeTransition(0);
                    tween(this.medievalTrash).delay(0.5).to(0.4, { scale: Vec3.ZERO }).call(() => { this.medievalTrash.active = false; }).start();
                }
            }).start();
        });
    }

    private executeTransition(stepIndex: number) {
        switch(stepIndex) {
            case 0: this.fadeNodes(this.bgWinter, this.bgSummer); break;
            case 1: 
                this.fadeNodes(this.brokenWindows, this.fixedWindows); 
                this.stopSnowEffect(); 
                this.scheduleOnce(() => { this.fadeNodes(this.brokenTables, this.fixedTables); }, 0.6);
                break;
            case 2: this.fadeNodes(this.brokenFireplace, this.fixedFireplace); break;
        }
    }

    private stopSnowEffect() {
        if (this.snowNode) {
            const ps = this.snowNode.getComponent(ParticleSystem2D);
            if (ps) ps.stopSystem(); else this.snowNode.active = false;
        }
    }

    private fadeNodes(oldNode: Node, newNode: Node) {
        if (!oldNode || !newNode) return;
        newNode.active = true;
        const oldSprite = oldNode.getComponent(Sprite);
        const newSprite = newNode.getComponent(Sprite);
        if (oldSprite) tween(oldSprite).to(1.5, { color: new Color(255, 255, 255, 0) }).start();
        if (newSprite) {
            newSprite.color = new Color(255, 255, 255, 0);
            tween(newSprite).to(1.5, { color: new Color(255, 255, 255, 255) }).start();
        }
    }

    private shakeTrash() {
        if (!this.medievalTrash) return;
        tween(this.medievalTrash).by(0.05, { position: new Vec3(5, 0, 0) }).by(0.05, { position: new Vec3(-10, 0, 0) }).by(0.05, { position: new Vec3(5, 0, 0) }).start();
    }

    private getBezierPoint(p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 {
        return new Vec3(
            Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * p1.x + Math.pow(t, 2) * p2.x,
            Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * p1.y + Math.pow(t, 2) * p2.y,
            0
        );
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

    private toggleCharacterState(node: Node, active: boolean) {
        if (!node) return;
        node.active = active;
        if (active) {
            const anim = node.getComponent(Animation);
            if (anim && anim.defaultClip) anim.play(anim.defaultClip.name);
        }
    }

    private setNodeActive(node: Node, active: boolean) {
        if (node) node.active = active;
    }
}