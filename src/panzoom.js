import {
  LegacyUtils as utils,
} from "@vizabi/shared-components";
import * as d3 from "d3";

export default class PanZoom {

  constructor(context) {
    this.context = context;

    this.dragRectangle = d3.drag();
    this.zoomer = d3.zoom();

    // this.dragLock = false;

    this.dragRectangle
      .filter(event => !event.button)
      .subject(this.dragSubject())
      .on("start", this.drag().start)
      .on("drag", this.drag().go)
      .on("end", this.drag().stop);

    this.zoomer
      .filter(this.zoomFilter())
      .scaleExtent([0.0625, +Infinity])
      .on("start", this.zoom().start)
      .on("zoom", this.zoom().go)
      .on("end", this.zoom().stop);

    this.zoomer.ratioX = 1;
    this.zoomer.ratioY = 1;

    this.context._zoomedXYMinMax = {
      x: { zoomedMin: null, zoomedMax: null },
      y: { zoomedMin: null, zoomedMax: null }
    };
  }

  dragSubject() {
    const _this = this.context;

    return function(event) {
      /*
       * Do not drag if the Ctrl key, Meta key, or plus cursor mode is
       * not enabled. Also do not drag if zoom-pinching on touchmove
       * events.
       */
      if (!(event.sourceEvent.ctrlKey || event.sourceEvent.metaKey ||
        _this.ui.cursorMode === "plus") || (_this.ui.cursorMode === "minus") ||
        (event.sourceEvent.type === "touchmove" || event.sourceEvent.type === "touchstart") &&
        (event.sourceEvent.touches.length > 1 || event.sourceEvent.targetTouches.length > 1)) {
        return null;
      }

      return {
        x: d3.pointer(event, this)[0],
        y: d3.pointer(event, this)[1]
      };
    };
  }

  drag() {
    const _this = this.context;
    const self = this;

    return {
      start(event) {
        /*
         * Do not drag if the Ctrl key, Meta key, or plus cursor mode is
         * not enabled. Also do not drag if zoom-pinching on touchmove
         * events.
         */
        //   if(!(event.sourceEvent.ctrlKey || event.sourceEvent.metaKey ||
        //          _this.ui.cursorMode === "plus") ||
        //          (event.sourceEvent.type === "touchmove" || event.sourceEvent.type === "touchstart") &&
        //          (event.sourceEvent.touches.length > 1 || event.sourceEvent.targetTouches.length > 1)) {
        //         return;
        //     }

        // self.dragLock = true;
        this.origin = {
          x: d3.pointer(event, this)[0],
          y: d3.pointer(event, this)[1]
        };
        _this.DOM.zoomRect.classed("vzb-invisible", false);
      },

      go(event) {
        const origin = this.origin;
        const mouse = {
          x: event.x,
          y: event.y
        };

        _this.DOM.zoomRect
          .attr("x", Math.min(mouse.x, origin.x))
          .attr("y", Math.min(mouse.y, origin.y))
          .attr("width", Math.abs(mouse.x - origin.x))
          .attr("height", Math.abs(mouse.y - origin.y));
      },

      stop(event) {
        // if (!self.dragLock) return;
        // self.dragLock = false;

        _this.DOM.zoomRect
          .attr("width", 0)
          .attr("height", 0)
          .classed("vzb-invisible", true);

        this.target = {
          x: d3.pointer(event, this)[0],
          y: d3.pointer(event, this)[1]
        };
        if (Math.abs(this.origin.x - this.target.x) < 10 || Math.abs(this.origin.y - this.target.y) < 10) return;

        /*
         * Only compensate for dragging when the Ctrl key or Meta key
         * are pressed, or if the cursorMode is not in plus mode.
         */
        const compensateDragging = event.sourceEvent.ctrlKey ||
          event.sourceEvent.metaKey ||
          _this.ui.cursorMode === "plus";

        self._zoomOnRectangle(
          d3.select(this),
          this.origin.x,
          this.origin.y,
          this.target.x,
          this.target.y,
          compensateDragging, 500
        );
      }
    };
  }

  zoomFilter() {
    const _this = this.context;

    return function(event) {

      if (event.ctrlKey || event.metaKey) return false;

      // Cancel drag lock when zoom-pinching via touchmove events.
      if ((event.type === "touchmove" || event.type === "touchstart") &&
        (event.touches.length > 1 || event.targetTouches.length > 1)) return true;

      if ((event.type === "wheel" || event.type === "mousewheel") &&
        _this.ui.zoomOnScrolling) {
        return true;
      }

      if ((event.type === "mousedown" || event.type === "touchstart") &&
        (_this.ui.cursorMode !== "plus") && (_this.ui.cursorMode !== "minus") &&
        (_this.ui.panWithArrow || _this.ui.cursorMode === "hand")) return true;

      return false;
    };
  }

  zoom() {
    const _this = this.context;
    const zoomer = this.zoomer;
    const self = this;

    return {
      start() {
        //this.savedScale = zoomer.scale;
        if ((_this.ui.cursorMode !== "plus") && (_this.ui.cursorMode !== "minus")) {
          _this.DOM.chartSvg.classed("vzb-zooming", true);
        }

      },
      go(event) {

        const sourceEvent = event.sourceEvent;

        let zoom = event.transform.k;

        let pan = [event.transform.x, event.transform.y];//event.translate;
        let ratioY = zoomer.ratioY;
        let ratioX = zoomer.ratioX;

        _this.draggingNow = true;

        //value protections and fallbacks
        if (isNaN(zoom) || zoom == null) zoom = zoomer.scale;
        if (isNaN(zoom) || zoom == null) zoom = 1;

        //TODO: this is a patch to fix #221. A proper code review of zoom and zoomOnRectangle logic is needed
        /*
         * Mouse wheel and touchmove events set the zoom value
         * independently of axis ratios. If the zoom event was triggered
         * by a mouse wheel event scrolling down or touchmove event with
         * more than 1 contact that sets zoom to 1, then set the axis
         * ratios to 1 as well, which will fully zoom out.
         */
        if (zoom === 1 && sourceEvent !== null &&
          ((sourceEvent.type === "wheel" || sourceEvent.type === "mousewheel") && (sourceEvent.deltaY || -sourceEvent.wheelDelta) > 0 ||
          sourceEvent.type === "touchmove" && sourceEvent.touches.length > 1)) {
          zoomer.ratioX = 1;
          ratioX = 1;
          zoomer.ratioY = 1;
          ratioY = 1;
        }

        if (isNaN(pan[0]) || isNaN(pan[1]) || pan[0] == null || pan[1] == null) pan = [0, 0];

        // limit the zooming, so that it never goes below min value of zoom for any of the axes
        const minZoomScale = zoomer.scaleExtent()[0];
        if (zoom * ratioY < minZoomScale) {
          ratioY = minZoomScale / zoom;
          zoomer.ratioY = ratioY;
        }
        if (zoom * ratioX < minZoomScale) {
          ratioX = minZoomScale / zoom;
          zoomer.ratioX = ratioX;
        }

        const zoomXOut = zoom * ratioX < 1;
        const zoomYOut = zoom * ratioY < 1;

        //limit the panning, so that we are never outside the possible range
        if (!zoomXOut) {
          if (pan[0] > 0) pan[0] = 0;
          if (pan[0] < (1 - zoom * ratioX) * _this.width) pan[0] = (1 - zoom * ratioX) * _this.width;
        } else {
          if (pan[0] < 0) pan[0] = 0;
          if (pan[0] > (1 - zoom * ratioX) * _this.width) pan[0] = (1 - zoom * ratioX) * _this.width;
        }

        if (!zoomYOut) {
          if (pan[1] > 0) pan[1] = 0;
          if (pan[1] < (1 - zoom * ratioY) * _this.height) pan[1] = (1 - zoom * ratioY) * _this.height;
        } else {
          if (pan[1] < 0) pan[1] = 0;
          if (pan[1] > (1 - zoom * ratioY) * _this.height) pan[1] = (1 - zoom * ratioY) * _this.height;
        }

        //limit zoom translate
        self.zoomSelection.property("__zoom", d3.zoomIdentity.translate(pan[0], pan[1]).scale(zoom));

        const xPanOffset = _this.width * zoom * ratioX;
        const yPanOffset = _this.height * zoom * ratioY;

        const xRange = [0 * zoom * ratioX + pan[0], xPanOffset + pan[0]];
        const yRange = [yPanOffset + pan[1], 0 * zoom * ratioY + pan[1]];

        const xRangeBumped = _this._rangeBump(xRange);
        const yRangeBumped = _this._rangeBump(yRange);

        /*
         * Shift xRange and yRange by the difference between the bumped
         * ranges, which is scaled by the zoom factor. This accounts for
         * the range bump, which controls a gutter around the
         * bubblechart, while correctly zooming.
         */
        const xRangeMinOffset = (xRangeBumped[0] - xRange[0]) * zoom * ratioX;
        const xRangeMaxOffset = (xRangeBumped[1] - xRange[1]) * zoom * ratioX;

        const yRangeMinOffset = (yRangeBumped[0] - yRange[0]) * zoom * ratioY;
        const yRangeMaxOffset = (yRangeBumped[1] - yRange[1]) * zoom * ratioY;

        xRange[0] += xRangeMinOffset;
        xRange[1] += xRangeMaxOffset;

        yRange[0] += yRangeMinOffset;
        yRange[1] += yRangeMaxOffset;

        // Calculate the maximum xRange and yRange available.
        const xRangeBounds = [0, _this.width];
        const yRangeBounds = [_this.height, 0];

        const xRangeBoundsBumped = _this._rangeBump(xRangeBounds);
        const yRangeBoundsBumped = _this._rangeBump(yRangeBounds);

        /*
         * Set the pan to account for the range bump by subtracting
         * offsets and preventing panning past the range bump gutter.
         */
        if (!zoomXOut) {
          if (xRange[0] > xRangeBoundsBumped[0]) pan[0] = xRangeBoundsBumped[0] - xRangeMinOffset;
          if (xRange[1] < xRangeBoundsBumped[1]) pan[0] = xRangeBoundsBumped[1] - xRangeMaxOffset - xPanOffset;
        } else {
          if (xRange[0] < xRangeBoundsBumped[0]) pan[0] = xRangeBoundsBumped[0] - xRangeMinOffset;
          if (xRange[1] > xRangeBoundsBumped[1]) pan[0] = xRangeBoundsBumped[1] - xRangeMaxOffset - xPanOffset;
        }

        if (!zoomYOut) {
          if (yRange[0] < yRangeBoundsBumped[0]) pan[1] = yRangeBoundsBumped[0] - yRangeMinOffset - yPanOffset;
          if (yRange[1] > yRangeBoundsBumped[1]) pan[1] = yRangeBoundsBumped[1] - yRangeMaxOffset;
        } else {
          if (yRange[0] > yRangeBoundsBumped[0]) pan[1] = yRangeBoundsBumped[0] - yRangeMinOffset - yPanOffset;
          if (yRange[1] < yRangeBoundsBumped[1]) pan[1] = yRangeBoundsBumped[1] - yRangeMaxOffset;
        }

        //zoomer.translate = pan;
        //self.zoomSelection.property("__zoom", d3.zoomIdentity.translate(pan[0], pan[1]).scale(zoom));

        /*
         * Clamp the xRange and yRange by the amount that the bounds
         * that are range bumped.
         *
         * Additionally, take the amount clamped on the end of the range
         * and either subtract or add it to the range's other end. This
         * prevents visible stretching of the range when only panning.
         */
        if (!zoomXOut) {
          if (xRange[0] > xRangeBoundsBumped[0]) {
            xRange[1] -= Math.abs(xRange[0] - xRangeBoundsBumped[0]);
            xRange[0] = xRangeBoundsBumped[0];
          }

          if (xRange[1] < xRangeBoundsBumped[1]) {
            xRange[0] += Math.abs(xRange[1] - xRangeBoundsBumped[1]);
            xRange[1] = xRangeBoundsBumped[1];
          }
        } else {
          if (xRange[0] < xRangeBoundsBumped[0]) {
            xRange[1] += Math.abs(xRange[0] - xRangeBoundsBumped[0]);
            xRange[0] = xRangeBoundsBumped[0];
          }

          if (xRange[1] > xRangeBoundsBumped[1]) {
            xRange[0] -= Math.abs(xRange[1] - xRangeBoundsBumped[1]);
            xRange[1] = xRangeBoundsBumped[1];
          }
        }

        if (!zoomYOut) {
          if (yRange[0] < yRangeBoundsBumped[0]) {
            yRange[1] += Math.abs(yRange[0] - yRangeBoundsBumped[0]);
            yRange[0] = yRangeBoundsBumped[0];
          }

          if (yRange[1] > yRangeBoundsBumped[1]) {
            yRange[0] -= Math.abs(yRange[1] - yRangeBoundsBumped[1]);
            yRange[1] = yRangeBoundsBumped[1];
          }
        } else {
          if (yRange[0] > yRangeBoundsBumped[0]) {
            yRange[1] -= Math.abs(yRange[0] - yRangeBoundsBumped[0]);
            yRange[0] = yRangeBoundsBumped[0];
          }

          if (yRange[1] < yRangeBoundsBumped[1]) {
            yRange[0] += Math.abs(yRange[1] - yRangeBoundsBumped[1]);
            yRange[1] = yRangeBoundsBumped[1];
          }
        }

        if (_this.MDL.x.scale.type === "ordinal") {
          _this.xScale.rangeBands(xRange);
        } else {
          _this.xScale.range(xRange);
        }

        if (_this.MDL.y.scale.type === "ordinal") {
          _this.yScale.rangeBands(yRange);
        } else {
          _this.yScale.range(yRange);
        }

        const formatter = function(n) {
          return utils.isDate(n) ? n : +n.toFixed(2);
        };

        const zoomedXRange = xRangeBoundsBumped;
        const zoomedYRange = yRangeBoundsBumped;

        /*
         * Set the zoomed min/max to the correct value depending on if the
         * min/max values lie within the range bound regions.
         */
        /*
         if(!zoomXOut) {
         zoomedXRange[0] = xRangeBounds[0] > xRange[0] ? xRangeBounds[0] : xRange[0];
         zoomedXRange[1] = xRangeBounds[1] < xRange[1] ? xRangeBounds[1] : xRange[1];
         }

         if(!zoomYOut) {
         zoomedYRange[0] = yRangeBounds[0] < yRange[0] ? yRangeBounds[0] : yRange[0];
         zoomedYRange[1] = yRangeBounds[1] > yRange[1] ? yRangeBounds[1] : yRange[1];
         }
         */

        _this._zoomedXYMinMax = {
          x: {
            zoomedMin: formatter(_this.xScale.invert(zoomedXRange[0])),
            zoomedMax: formatter(_this.xScale.invert(zoomedXRange[1]))
          },
          y: {
            zoomedMin: formatter(_this.yScale.invert(zoomedYRange[0])),
            zoomedMax: formatter(_this.yScale.invert(zoomedYRange[1]))
          }
        };

        //TODO/*avoid storing it in URL*/
        if (!zoomer.dontFeedToState) {
          // _this.ui.panzoom = {
          //   x: Object.assign({}, _this._zoomedXYMinMax.x),
          //   y: Object.assign({}, _this._zoomedXYMinMax.y),          
          // }
          _this.MDL.x.scale.zoomed = [_this._zoomedXYMinMax.x.zoomedMin, _this._zoomedXYMinMax.x.zoomedMax];
          _this.MDL.y.scale.zoomed = [_this._zoomedXYMinMax.y.zoomedMin, _this._zoomedXYMinMax.y.zoomedMax];
        }

        const optionsY = _this.yAxis.labelerOptions();
        const optionsX = _this.xAxis.labelerOptions();
        optionsY.limitMaxTickNumber = zoom * ratioY < 1.5 ? 8 : zoom * ratioY * 8;
        optionsX.limitMaxTickNumber = zoom * ratioX < 1.5 ? 8 : zoom * ratioX * 8;
        optionsY.transitionDuration = zoomer.duration;
        optionsX.transitionDuration = zoomer.duration;

        _this.DOM.xAxisEl.call(_this.xAxis.labelerOptions(optionsX));
        _this.DOM.yAxisEl.call(_this.yAxis.labelerOptions(optionsY));
        _this.redrawData(zoomer.duration);
        //_this._trails.run("resize", null, zoomer.duration);

        zoomer.duration = 0;
      },

      stop() {
        _this.DOM.chartSvg.classed("vzb-zooming", false);
        // if (this.quitZoom) return;

        //Force the update of the URL and history, with the same values
        if (!zoomer.dontFeedToState) {
          // _this.ui.panzoom = {
          //   x: Object.assign({}, _this._zoomedXYMinMax.x),
          //   y: Object.assign({}, _this._zoomedXYMinMax.y),          
          // }
          _this.MDL.x.scale.zoomed = [_this._zoomedXYMinMax.x.zoomedMin, _this._zoomedXYMinMax.x.zoomedMax];
          _this.MDL.y.scale.zoomed = [_this._zoomedXYMinMax.y.zoomedMin, _this._zoomedXYMinMax.y.zoomedMax];
          //_this.model.marker.set(_this._zoomedXYMinMax, true, true);
        }
        zoomer.dontFeedToState = null;

        _this.draggingNow = false;
      }
    };
  }

  expandCanvas(duration) {
    const _this = this.context;
    if (!duration) duration = _this.duration;

    //d3 extent returns min and max of the input array as [min, max]
    const mmX = d3.extent(utils.values(_this.frame.x));
    const mmY = d3.extent(utils.values(_this.frame.y));

    //protection agains unreasonable min-max results -- abort function
    if (!mmX[0] && mmX[0] !== 0 || !mmX[1] && mmX[1] !== 0 || !mmY[0] && mmY[0] !== 0 || !mmY[1] && mmY[1] !== 0) {
      return utils.warn("panZoom.expandCanvas: X or Y min/max are broken. Aborting with no action");
    }
    /*
     * Use a range bumped scale to correctly accommodate the range bump
     * gutter.
     */
    const suggestedFrame = {
      x1: _this.xScale(mmX[0]),
      y1: _this.yScale(mmY[0]),
      x2: _this.xScale(mmX[1]),
      y2: _this.yScale(mmY[1])
    };
    const xBounds = [0, _this.width];
    const yBounds = [_this.height, 0];

    // Get the current zoom frame based on the current dimensions.
    const frame = {
      x1: xBounds[0],
      x2: xBounds[1],
      y1: yBounds[0],
      y2: yBounds[1]
    };

    const TOLERANCE = 0.0;

    /*
     * If there is no current zoom frame, or if any of the suggested frame
     * points extend outside of the current zoom frame, then expand the
     * canvas.
     */
    if (!_this.isCanvasPreviouslyExpanded ||
      suggestedFrame.x1 < frame.x1 * (1 - TOLERANCE) || suggestedFrame.x2 > frame.x2 * (1 + TOLERANCE) ||
      suggestedFrame.y2 < frame.y2 * (1 - TOLERANCE) || suggestedFrame.y1 > frame.y1 * (1 + TOLERANCE)) {
      /*
       * If there is already a zoom frame, then clamp the suggested frame
       * points to only zoom out and expand the canvas.
       *
       * If any of x1, x2, y1, or y2 is within the current frame
       * boundaries, then clamp them to the frame boundaries. If any of
       * the above values will translate into a data value that is outside
       * of the possible data range, then clamp them to the frame
       * coordinate that corresponds to the maximum data value that can
       * be displayed.
       */
      if (_this.isCanvasPreviouslyExpanded) {
        /*
         * Calculate bounds and bumped scale for calculating the data boundaries
         * to which the suggested frame points need to be clamped.
         */
        const xBoundsBumped = _this._rangeBump(xBounds);
        const yBoundsBumped = _this._rangeBump(yBounds);

        if (suggestedFrame.x1 > xBoundsBumped[0]) suggestedFrame.x1 = xBoundsBumped[0];
        if (suggestedFrame.x2 < xBoundsBumped[1]) suggestedFrame.x2 = xBoundsBumped[1];
        if (suggestedFrame.y1 < yBoundsBumped[0]) suggestedFrame.y1 = yBoundsBumped[0];
        if (suggestedFrame.y2 > yBoundsBumped[0]) suggestedFrame.y2 = yBoundsBumped[1];
      }

      _this.isCanvasPreviouslyExpanded = true;
      this._zoomOnRectangle(_this.element, suggestedFrame.x1, suggestedFrame.y1,
        suggestedFrame.x2, suggestedFrame.y2, false, duration);
    } else {
      _this.redrawDataPoints(duration);
    }
  }

  zoomToMaxMin(zoomedMinX, zoomedMaxX, zoomedMinY, zoomedMaxY, duration, dontFeedToState) {
    const _this = this.context;
    let minX = zoomedMinX;
    let maxX = zoomedMaxX;
    let minY = zoomedMinY;
    let maxY = zoomedMaxY;

    const xDomain = _this.xScale.domain();
    const yDomain = _this.yScale.domain();

    /*
     * Prevent zoomout if only one of zoom edges set outside domain
     */
    if (minX < xDomain[0] && maxX < xDomain[1]) minX = xDomain[0];
    if (minX > xDomain[0] && maxX > xDomain[1]) maxX = xDomain[1];
    if (minY < yDomain[0] && maxY < yDomain[1]) minY = yDomain[0];
    if (minY > yDomain[0] && maxY > yDomain[1]) maxY = yDomain[1];


    const xRange = [_this.xScale(minX), _this.xScale(maxX)];
    const yRange = [_this.yScale(minY), _this.yScale(maxY)];


    this._zoomOnRectangle(_this.element, xRange[0], yRange[0], xRange[1], yRange[1], false, duration, dontFeedToState);
  }

  _zoomOnRectangle(element, zoomedX1, zoomedY1, zoomedX2, zoomedY2, compensateDragging, duration, dontFeedToState) {
    const _this = this.context;
    const zoomer = this.zoomer;
    const transform = d3.zoomTransform(this.zoomSelection.node());

    const x1 = zoomedX1;
    const y1 = zoomedY1;
    const x2 = zoomedX2;
    const y2 = zoomedY2;

    /*
     * When dragging to draw a rectangle, the translate vector has (x2 - x1)
     * added to zoomer.translate()[0], and (y2 - 1) added to
     * zoomer.translate()[1].
     *
     * We need to compensate for this addition when
     * zooming with a rectangle, because zooming with a rectangle will
     * update the translate vector with new values based on the rectangle
     * dimensions.
     */
    if (compensateDragging) {
      transform.translate(
        x1 - x2,
        y1 - y2
      );
    }

    const xRangeBounds = [0, _this.width];
    const yRangeBounds = [_this.height, 0];

    const xRangeBoundsBumped = _this._rangeBump(xRangeBounds);
    const yRangeBoundsBumped = _this._rangeBump(yRangeBounds);

    const minZoom = zoomer.scaleExtent()[0];
    const maxZoom = zoomer.scaleExtent()[1];
    let zoom, ratioX, ratioY;

    if (x1 == x2 || y1 == y2 || xRangeBoundsBumped[0] == xRangeBoundsBumped[1] || yRangeBoundsBumped[0] == yRangeBoundsBumped[1]) {
      return utils.warn("_zoomOnRectangle(): can not proceed because this may result in infinity zooms");
    }

    if (Math.abs(x1 - x2) > Math.abs(y1 - y2)) {
      zoom = Math.abs(yRangeBoundsBumped[0] - yRangeBoundsBumped[1]) / Math.abs(y1 - y2) * transform.k;

      /*
       * Clamp the zoom scalar to the maximum zoom allowed before
       * calculating the next ratioX and ratioY.
       */
      if (zoom < minZoom) {
        zoomer.ratioY *= zoom / transform.k;
        zoom = minZoom;
      }
      if (zoom > maxZoom) zoom = maxZoom;

      ratioX = Math.abs(xRangeBoundsBumped[0] - xRangeBoundsBumped[1]) / Math.abs(x1 - x2) * transform.k / zoom * zoomer.ratioX;
      ratioY = zoomer.ratioY;
    } else {
      zoom = Math.abs(xRangeBoundsBumped[0] - xRangeBoundsBumped[1]) / Math.abs(x1 - x2) * transform.k;

      /*
       * Clamp the zoom scalar to the maximum zoom allowed before
       * calculating the next ratioX and ratioY.
       */
      if (zoom < minZoom) {
        zoomer.ratioX *= zoom / transform.k;
        zoom = minZoom;
      }
      if (zoom > maxZoom) zoom = maxZoom;

      ratioY = Math.abs(yRangeBoundsBumped[0] - yRangeBoundsBumped[1]) / Math.abs(y1 - y2) * transform.k / zoom * zoomer.ratioY;
      ratioX = zoomer.ratioX;
    }

    const pan = [
      (transform.x - Math.min(x1, x2)) / transform.k / zoomer.ratioX * zoom * ratioX + (xRangeBoundsBumped[0] - xRangeBounds[0]),
      (transform.y - Math.min(y1, y2)) / transform.k / zoomer.ratioY * zoom * ratioY + (yRangeBoundsBumped[1] - yRangeBounds[1])
    ];

    zoomer.dontFeedToState = dontFeedToState;
    zoomer.ratioY = ratioY || 1; //NaN defaults to 1
    zoomer.ratioX = ratioX || 1; //NaN defaults to 1
    zoomer.duration = duration ? duration : 0;

    this.zoomSelection.call(zoomer.transform, d3.zoomIdentity.translate(pan[0], pan[1]).scale(zoom));
  }

  /*
   * Incrementally zoom in or out and pan the view so that it never looses the point where click happened
   * this function is a modified d3's own zoom behavior on double click
   * for the original code see https://github.com/mbostock/d3/blob/master/src/behavior/zoom.js
   * function dblclicked() and what it refers to
   */
  zoomByIncrement(event, direction, duration) {
    const transform = d3.zoomTransform(this.zoomSelection.node());

    let ratio = transform.k;
    const pan = [transform.x, transform.y];

    const mouse = d3.pointer(event, this.zoomSelection.node());
    let k = Math.log(ratio) / Math.LN2;

    //change factor direction based on the input. default is no direction supplied
    if (direction == "plus" || !direction) k = Math.floor(k) + 1;
    if (direction == "minus") k = Math.ceil(k) - 1;

    //decode panning
    let locus = [(mouse[0] - pan[0]) / ratio, (mouse[1] - pan[1]) / ratio];

    //recalculate zoom ratio
    const scaleExtent = this.zoomer.scaleExtent();
    if (ratio == scaleExtent[0]) {
      this.zoomer.ratioY = 1;
      this.zoomer.ratioX = 1;
    }
    ratio = Math.max(scaleExtent[0], Math.min(scaleExtent[1], Math.pow(2, k)));

    //recalculate panning
    locus = [locus[0] * ratio + pan[0], locus[1] * ratio + pan[1]];
    pan[0] += mouse[0] - locus[0];
    pan[1] += mouse[1] - locus[1];

    this.zoomer.duration = duration || 0;
    this.zoomSelection.call(this.zoomer.transform, d3.zoomIdentity.translate(pan[0], pan[1]).scale(ratio));

  }

  /*
   * Reset zoom values without triggering a zoom event.
   */
  resetZoomState(element) {
    this.zoomer.ratioY = 1;
    this.zoomer.ratioX = 1;
    (element || this.zoomSelection).property("__zoom", d3.zoomIdentity);
  }

  reset(element, duration) {
    const _this = this.context;
    _this.isCanvasPreviouslyExpanded = false;

    this.zoomer.ratioY = 1;
    this.zoomer.ratioX = 1;
    this.zoomer.duration = duration || 0;
    (element || this.zoomSelection).call(this.zoomer.transform, d3.zoomIdentity);
  }

  rerun(element) {
    (element || this.zoomSelection).call(this.zoomer.scaleBy, 1);
  }

  zoomSelection(element) {
    this.zoomSelection = element;
  }

}
