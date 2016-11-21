/*
 * Copyright 2015 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 - http://www.apache.org/licenses/LICENSE-2.0
 */

import * as classNames from "classnames";
import * as React from "react";

import * as Classes from "../../common/classes";
import { IProps } from "../../common/props";

export interface ICollapseProps extends IProps {
    /**
     * Component to render as the root element.
     * Useful when rendering a Collapse inside a `<table>`, for instance.
     * @default "div"
     */
    component?: React.ReactType;

    /**
     * Whether the component is open or closed.
     * @default false
     */
    isOpen?: boolean;

    /**
     * The length of time the transition takes, in ms. This must match the duration of the animation in CSS.
     * Only set this prop if you override Blueprint's default transitions with new transitions of a different length.
     * @default 200
     */
    transitionDuration?: number;
}

export interface ICollapseState {
    /** The height that should be used for the content animations. This is a CSS value, not just a number. */
    height?: string;

    /** The state the element is currently in. */
    animationState?: AnimationStates;
}

export enum AnimationStates {
    CLOSED,
    OPENING,
    OPEN,
    CLOSING_START,
    CLOSING_END,
}

/*
 * A collapse can be in one of 5 states:
 * CLOSED
 * When in this state, the contents of the collapse is not rendered, the collapse height is 0,
 * and the body Y is at -height (so that the bottom of the body is at Y=0).
 *
 * OPEN
 * When in this state, the collapse height is set to auto, and the body Y is set to 0 (so the element can be seen
 * as normal).
 *
 * CLOSING_START
 * When in this state, height has been changed from auto to the measured height of the body to prepare for the
 * closing animation in CLOSING_END.
 *
 * CLOSING_END
 * When in this state, the height is set to 0 and the body Y is at -height. Both of these properties are transformed,
 * and then after the animation is complete, the state changes to CLOSED.
 *
 * OPENING
 * When in this state, the body is re-rendered, height is set to the measured body height and the body Y is set to 0.
 * This is all animated, and on complete, the state changes to OPEN.
 *
 * When changing the isOpen prop, the following happens to the states:
 * isOpen = true : CLOSED -> OPENING -> OPEN
 * isOpen = false: OPEN -> CLOSING_START -> CLOSING_END -> CLOSED
 * These are all animated.
 */
export class Collapse extends React.Component<ICollapseProps, ICollapseState> {
    public static displayName = "Blueprint.Collapse";

    public static defaultProps: ICollapseProps = {
        component: "div",
        isOpen: false,
        transitionDuration: 200,
    };

    public state = {
        animationState: AnimationStates.OPEN,
        height: "0px",
    };

    // The element containing the contents of the collapse.
    private contents: HTMLElement;
    // The most recent non-0 height (once a height has been measured - is 0 until then)
    private height: number = 0;

    private closingTimeout: number;
    private delayedTimeout: number;

    public componentWillReceiveProps(nextProps: ICollapseProps) {
        if (this.contents != null && this.contents.clientHeight !== 0) {
            this.height = this.contents.clientHeight;
        }
        if (this.props.isOpen !== nextProps.isOpen) {
            if (this.state.animationState !== AnimationStates.CLOSED && !nextProps.isOpen) {
                this.setState({
                    animationState: AnimationStates.CLOSING_START,
                    height: `${this.height}px`,
                });
            } else if (this.state.animationState !== AnimationStates.OPEN && nextProps.isOpen) {
                this.setState({
                    animationState: AnimationStates.OPENING,
                    height: `${this.height}px`,
                });
                this.delayedTimeout = setTimeout(() => this.onDelayedStateChange(), this.props.transitionDuration);
            }
        }
    }

    public render() {
        const showContents = (this.state.animationState !== AnimationStates.CLOSED);
        const displayWithTransform = showContents && (this.state.animationState !== AnimationStates.CLOSING_END);
        const isAutoHeight = (this.state.height === "auto");

        const containerStyle = {
            height: showContents ? this.state.height : null,
            overflow: isAutoHeight ? "visible" : null,
            transition: isAutoHeight ? "none" : null,
        };

        const contentsStyle = {
            transform: displayWithTransform ? "translateY(0)" : `translateY(-${this.height}px)`,
            transition: isAutoHeight ? "none" : null,
        };

        // quick type cast because there's no single overload that supports all three ReactTypes (str | Cmp | SFC)
        return React.createElement(this.props.component as string, {
            className: classNames(Classes.COLLAPSE, this.props.className),
            style: containerStyle,
        },
            <div className="pt-collapse-body" ref={this.contentsRefHandler} style={contentsStyle}>
                {showContents ? this.props.children : null}
            </div>,
        );
    }

    public componentDidMount() {
        this.forceUpdate();
        if (this.props.isOpen) {
            this.setState({ animationState: AnimationStates.OPEN, height: "auto" });
        } else {
            this.setState({ animationState: AnimationStates.CLOSED });
        }
    }

    public componentDidUpdate() {
        if (this.state.animationState === AnimationStates.CLOSING_START) {
            this.closingTimeout =
                setTimeout(() => this.setState({ animationState: AnimationStates.CLOSING_END, height: "0px" }));
            this.delayedTimeout = setTimeout(() => this.onDelayedStateChange(), this.props.transitionDuration);
        }
    }

    public componentWillUnmount() {
        clearTimeout(this.closingTimeout);
        clearTimeout(this.delayedTimeout);
    }

    private contentsRefHandler = (el: HTMLElement) => {
        this.contents = el;
        if (el != null) {
            this.height = this.contents.clientHeight;
            this.setState({
                animationState: this.props.isOpen ? AnimationStates.OPEN : AnimationStates.CLOSED,
                height: `${this.height}px`,
            });
        }
    }

    private onDelayedStateChange() {
        switch (this.state.animationState) {
            case AnimationStates.OPENING:
                this.setState({ animationState: AnimationStates.OPEN, height: "auto" });
                break;
            case AnimationStates.CLOSING_END:
                this.setState({ animationState: AnimationStates.CLOSED });
                break;
            default:
                break;
        }
    }
}
