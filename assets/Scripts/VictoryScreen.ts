import { _decorator, Component, Vec3, tween, UIOpacity, Node } from 'cc';
const { ccclass, requireComponent } = _decorator;

@ccclass('VictoryScreen')
@requireComponent(UIOpacity) 
export class VictoryScreen extends Component {

    private opacityComp: UIOpacity = null!;
    

    private readonly TARGET_SCALE = new Vec3(1.25, 1.25, 1);
    private readonly POP_SCALE = new Vec3(1.35, 1.35, 1);

    onLoad() {
        this.opacityComp = this.node.getComponent(UIOpacity)!;
        this.node.active = false;
        this.node.setScale(Vec3.ZERO);
    }

    show() {
        console.log("[VictoryScreen] Showing Screen...");
        
        this.node.active = true;

        if (this.node.parent) {
            const lastIndex = this.node.parent.children.length - 1;
            this.node.setSiblingIndex(lastIndex);
        }

        this.node.setPosition(0, 0, 0); 
        this.node.setScale(0.5, 0.5, 1); 
        
        if (this.opacityComp) {
            this.opacityComp.opacity = 0;
            tween(this.opacityComp)
                .to(0.3, { opacity: 255 })
                .start();
        }

        tween(this.node as Node)
            .to(0.4, { scale: this.POP_SCALE }, { easing: 'cubicOut' })
            .to(0.2, { scale: this.TARGET_SCALE }, { easing: 'sineOut' })
            .start();
    }
}