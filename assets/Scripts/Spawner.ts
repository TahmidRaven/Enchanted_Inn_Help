import { _decorator, Component, Node } from 'cc';
import { GameManager } from './GameManager';
const { ccclass, property } = _decorator;

@ccclass('Spawner')
export class Spawner extends Component {
    @property(GameManager) gameManager: GameManager = null!;
    @property
    prefabIndex: number = 0; 

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, () => {
            if (this.gameManager) this.gameManager.spawnFromSpawner(this.prefabIndex);
        }, this);
    }
}