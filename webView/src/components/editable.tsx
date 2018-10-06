import * as React from "react";

export interface Props {
    content: string;
    elementTag?: string;
    onChange: (content: string) => void;
    elementProps?: any;
}

export class Editable extends React.Component<Props, any>{
    private elementRef: React.RefObject<HTMLElement>;

    static defaultProps: Partial<Props> = {
        elementTag: 'div',
        elementProps: {},
    };

    constructor(p, c) {
        super(p, c);
        this.elementRef = React.createRef();
    }

    render() {
        const ele = React.createElement(this.props.elementTag, {
            ...this.props.elementProps,
            ref: this.elementRef,
            onInput: this.onInput,
            contentEditable: true,
            children: this.props.content,
        });
        return ele;
    }

    onInput = (e) => {
        const text = e.currentTarget.innerText;
        if (this.props.onChange) {
            this.props.onChange(text);
        }
    }

    shouldComponentUpdate(props: Props, state) {
        if (!this.elementRef) {
            return true;
        }
        const propsText = props.content || '';
        if (this.elementRef.current.innerText.trim() === propsText.trim()) {
            return false;
        }
        return true;
    }
}