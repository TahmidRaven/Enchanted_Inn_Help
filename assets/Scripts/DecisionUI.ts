import { _decorator, Component, Node, Vec3, tween, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('DecisionUI')
export class DecisionUI extends Component {
    @property(Node) helpButton: Node = null!;
    @property(Node) leaveButton: Node = null!;
    @property(Node) characterDialogue: Node = null!; 

    private opacity: UIOpacity = null!;

    onLoad() {
        this.opacity = this.getComponent(UIOpacity) || this.addComponent(UIOpacity);
        this.setupButtons();
    }

    private setupButtons() {
        this.animateButton(this.helpButton, 1.25, 1.25);
        this.animateButton(this.leaveButton, 1.25, 1.25);

        this.helpButton.on(Node.EventType.TOUCH_END, this.onHelpClicked, this);
        this.leaveButton.on(Node.EventType.TOUCH_END, this.onLeaveClicked, this);
    }

    private animateButton(node: Node, scale: number, duration: number) {
        tween(node)
            .to(duration, { scale: new Vec3(scale, scale, 1) }, { easing: 'sineInOut' })
            .to(duration, { scale: Vec3.ONE }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }

    onHelpClicked() {
        this.hide(() => {
            this.node.emit('DECISION_HELP');
        });
    }

    onLeaveClicked() {
        console.log("[DecisionUI] Leave button clicked.");
        this.hide(() => {
            this.node.emit('DECISION_LEAVE');
        });
    }


    public hide(onComplete?: Function) {
        if (this.opacity) {
            tween(this.opacity)
                .to(0.4, { opacity: 0 })
                .call(() => {
                    this.node.active = false;
                    if (onComplete) onComplete();
                })
                .start();
        } else {

            this.node.active = false;
            if (onComplete) onComplete();
        }
    }
}