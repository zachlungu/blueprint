/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 - http://www.apache.org/licenses/LICENSE-2.0
 */

import * as classNames from "classnames";
import * as PureRender from "pure-render-decorator";
import * as React from "react";

import { AbstractComponent } from "../../common/abstractComponent";
import * as Classes from "../../common/classes";
import { IProps } from "../../common/props";
import { approxEqual, isFunction } from "../../common/utils";

export interface ICoreSliderProps extends IProps {
    /**
     * Whether the slider is non-interactive.
     * @default false
     */
    disabled?: boolean;

    /**
     * Increment between successive labels.
     * @default 1
     */
    labelStepSize?: number;

    /**
     * Maximum value of the slider.
     * @default 10
     */
    max?: number;

    /**
     * Minimum value of the slider.
     * @default 0
     */
    min?: number;

    /**
     * Whether a solid bar should be rendered on the track between current and initial values,
     * or between handles for `RangeSlider`.
     * @default true
     */
    showTrackFill?: boolean;

    /**
     * Increment between successive values; amount by which the handle moves.
     * @default 1
     */
    stepSize?: number;

    /**
     * Callback to render a single label. Useful for formatting numbers as currency or percentages.
     * If `true`, labels will use number value. If `false`, labels will not be shown.
     * @default true
     */
    renderLabel?: ((value: number) => string | JSX.Element) | boolean;
}

export interface ISliderState {
    /** the client size, in pixels, of one tick */
    tickSize?: number;
}

@PureRender
export abstract class CoreSlider<P extends ICoreSliderProps> extends AbstractComponent<P, ISliderState> {
    public state: ISliderState = {
        tickSize: 0,
    };

    public className = Classes.SLIDER;

    private trackElement: HTMLElement;
    private refHandlers = {
        track: (el: HTMLDivElement) => this.trackElement = el,
    };

    public render() {
        const { disabled } = this.props;
        const classes = classNames(this.className, {
            [Classes.DISABLED]: disabled,
            [`${Classes.SLIDER}-unlabeled`]: this.props.renderLabel === false,
        }, this.props.className);
        return (
            <div className={classes} onMouseDown={this.maybeHandleTrackClick}>
                <div className={`${Classes.SLIDER}-track`} ref={this.refHandlers.track} />
                {this.maybeRenderFill()}
                {this.maybeRenderAxis()}
                {this.renderHandles()}
            </div>
        );
    }

    public componentDidMount() {
        this.updateTickSize();
    }

    public componentDidUpdate() {
        this.updateTickSize();
    }

    protected abstract renderHandles(): JSX.Element | JSX.Element[];
    protected abstract renderFill(): JSX.Element;
    /** An event listener invoked when the user clicks on the track outside a handle */
    protected abstract handleTrackClick(event: MouseEvent | React.MouseEvent<HTMLElement>): void;

    protected formatLabel(value: number): React.ReactChild {
        const { renderLabel } = this.props;
        if (renderLabel === false) {
            return undefined;
        } else if (isFunction(renderLabel)) {
            return renderLabel(value);
        } else {
            return value;
        }
    }

    private maybeRenderAxis() {
        const { max, min, labelStepSize } = this.props;
        if (this.props.renderLabel === false) { return undefined; }

        const stepSize = Math.round(this.state.tickSize * labelStepSize);
        const labels: JSX.Element[] = [];
        // tslint:disable-next-line:one-variable-per-declaration
        for (let i = min, left = 0; i < max || approxEqual(i, max); i += labelStepSize, left += stepSize) {
            labels.push(<div className={`${Classes.SLIDER}-label`} key={i} style={{left}}>{this.formatLabel(i)}</div>);
        }
        return <div className={`${Classes.SLIDER}-axis`}>{labels}</div>;
    }

    private maybeRenderFill() {
        if (this.props.showTrackFill && this.trackElement != null) {
            return this.renderFill();
        }
        return undefined;
    }

    private maybeHandleTrackClick = (event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement;
        // ensure event does not come from inside the handle
        if (!this.props.disabled && target.closest(`.${Classes.SLIDER_HANDLE}`) == null) {
            this.handleTrackClick(event.nativeEvent as MouseEvent);
        }
    }

    private updateTickSize() {
        if (this.trackElement != null) {
            const tickSize = this.trackElement.clientWidth / (this.props.max - this.props.min);
            this.setState({ tickSize });
        }
    }
}
