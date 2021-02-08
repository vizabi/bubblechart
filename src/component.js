import {
  BaseComponent,
  Icons,
  Utils,
  LegacyUtils as utils,
  axisSmart,
  Labels,
  DynamicBackground,
  Exporter as svgexport,
} from "VizabiSharedComponents";
import PanZoom from "./panzoom";

import {
  runInAction
} from "mobx";

import {decorate, computed} from "mobx";

const {ICON_WARN, ICON_QUESTION} = Icons;
const COLOR_WHITEISH = "rgb(253, 253, 253)";

const marginScaleH = (marginMin, ratio = 0) => height => marginMin + height * ratio;
const marginScaleW = (marginMin, ratio = 0) => width => marginMin + width * ratio;

const PROFILE_CONSTANTS = (width, height, options) => ({
  SMALL: {
    margin: { top: 30, bottom: 35, left: 30, right: 10},
    leftMarginRatio: 1,
    padding: 2,
    minRadiusPx: 0.5,
    maxRadiusEm: options.ui.maxRadiusEm || 0.05,
    infoElHeight: 16,
    yAxisTitleBottomMargin: 6,
    xAxisTitleBottomMargin: 4
  },
  MEDIUM: {
    margin: { top: 15, bottom: 40, left: 40, right: 15},
    leftMarginRatio: 1.6,
    padding: 2,
    minRadiusPx: 1,
    maxRadiusEm: options.ui.maxRadiusEm || 0.05,
    infoElHeight: 20,
    yAxisTitleBottomMargin: 3,
    xAxisTitleBottomMargin: 4
  },
  LARGE: {
    margin: { top: 15, bottom: marginScaleH(30, 0.03)(height), left: marginScaleW(31, 0.015)(width), right: 20},
    leftMarginRatio: 1.8,
    padding: 2,
    minRadiusPx: 1,
    maxRadiusEm: options.ui.maxRadiusEm || 0.05,
    infoElHeight: 22,
    yAxisTitleBottomMargin: 3,//marginScaleH(4, 0.01)(height),
    xAxisTitleBottomMargin: marginScaleH(0, 0.01)(height),
    hideSTitle: true
  }
});

const PROFILE_CONSTANTS_FOR_PROJECTOR = (width, height, options) => ({
  MEDIUM: {
    margin: { top: 20, bottom: 55, left: 50, right: 20 },
    yAxisTitleBottomMargin: 3,
    xAxisTitleBottomMargin: 4,
    infoElHeight: 26,
  },
  LARGE: {
    margin: { top: 30, bottom: marginScaleH(45, 0.03)(height), left: marginScaleW(35, 0.025)(width), right: 30 },
    yAxisTitleBottomMargin: 3,//marginScaleH(4, 0.01)(height),
    xAxisTitleBottomMargin: marginScaleH(-10, 0.01)(height),
    infoElHeight: 32,
    hideSTitle: true
  }
});

// BUBBLE CHART COMPONENT
class _VizabiBubbleChart extends BaseComponent {

  constructor(config) {
    config.subcomponents = [{
      type: Labels,
      placeholder: ".vzb-bc-labels",      
      options: {
        CSS_PREFIX: "vzb-bc",
        LABELS_CONTAINER_CLASS: "vzb-bc-labels",
        LINES_CONTAINER_CLASS: "vzb-bc-lines",
        SUPPRESS_HIGHLIGHT_DURING_PLAY: false
      },
      name: "labels"
    },{
      type: DynamicBackground,
      placeholder: ".vzb-bc-year"
    }];

    config.template = `
      <svg class="vzb-bubblechart-svg vzb-bubblechart-svg-back vzb-export">
          <g class="vzb-bc-graph">
              <g class="vzb-bc-year"></g>
              <svg class="vzb-bc-axis-x"><g></g></svg>
              <svg class="vzb-bc-axis-y"><g></g></svg>
              <line class="vzb-bc-projection-x"></line>
              <line class="vzb-bc-projection-y"></line>
              <svg class="vzb-bc-bubbles-crop">
                  <g class="vzb-bc-decorations">
                      <line class="vzb-bc-line-equal-xy vzb-invisible"></line>
                      <g class="vzb-bc-x-axis-groups"></g>
                  </g>    
              </svg>
          </g>
      </svg>
      <svg class="vzb-bubblechart-svg vzb-bubblechart-svg-main vzb-export">
          <g class="vzb-bc-graph">
              <g class="vzb-bc-axis-x-title"></g>
              <g class="vzb-bc-axis-x-info vzb-noexport"></g>

              <g class="vzb-bc-axis-y-title"></g>
              <g class="vzb-bc-axis-y-info vzb-noexport"></g>
              <svg class="vzb-bc-bubbles-crop">
                  <g class="vzb-zoom-selection"></g>
                  <rect class="vzb-bc-eventarea"></rect>
                  <g class="vzb-bc-trails"></g>
                  <g class="vzb-bc-bubbles"></g>
                  <rect class="vzb-bc-forecastoverlay vzb-hidden" x="0" y="0" width="100%" height="100%" fill="url(#vzb-bc-pattern-lines)" pointer-events='none'></rect>
              </svg>

              <g class="vzb-bc-axis-y-subtitle"></g>
              <g class="vzb-bc-axis-x-subtitle"></g>
              <g class="vzb-bc-axis-s-title"></g>
              <g class="vzb-bc-axis-c-title"></g>

              <g class="vzb-data-warning vzb-noexport">
                  <svg></svg>
                  <text></text>
              </g>

              <rect class="vzb-bc-zoom-rect"></rect>
          </g>
      </svg>
      <svg class="vzb-bubblechart-svg vzb-bubblechart-svg-front vzb-export">
          <g class="vzb-bc-graph">
              <svg class="vzb-bc-bubbles-crop">
                  <g class="vzb-bc-lines"></g>
                  <g class="vzb-bc-bubble-crown vzb-hidden">
                      <circle class="vzb-crown-glow"></circle>
                      <circle class="vzb-crown"></circle>
                  </g>        
              </svg>
              <svg class="vzb-bc-labels-crop">
                  <g class="vzb-bc-labels"></g>
              </svg>
          </g>
      </svg>
      <svg width="0" height="0">
          <defs>
              <filter id="vzb-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="2"></feGaussianBlur>
              </filter>
            <pattern id="vzb-bc-pattern-lines" x="0" y="0" patternUnits="userSpaceOnUse" width="50" height="50" viewBox="0 0 10 10"> 
                <path d='M-1,1 l2,-2M0,10 l10,-10M9,11 l2,-2' stroke='black' stroke-width='3' opacity='0.08'/>
              </pattern> 
          </defs>
      </svg>
      <!-- This could possibly be another component -->
      <div class="vzb-tooltip vzb-hidden vzb-tooltip-mobile"></div>
    `;

    super(config);
  }

  setup() {

    this.DOM = {
      element: this.element,
      chartSvg: this.element.select("svg.vzb-bubblechart-svg-main"),
      chartSvgFront: this.element.select("svg.vzb-bubblechart-svg-front"),
      chartSvgBack: this.element.select("svg.vzb-bubblechart-svg-back"),
      chartSvgAll: this.element.selectAll("svg.vzb-bubblechart-svg"),
      graphAll: this.element.selectAll(".vzb-bc-graph"),
      bubbleContainerCropAll: this.element.selectAll(".vzb-bc-bubbles-crop"),
      zoomRect: this.element.select(".vzb-bc-zoom-rect"),
      eventArea: this.element.select(".vzb-bc-eventarea"),
      forecastOverlay: this.element.select(".vzb-bc-forecastoverlay"),
      tooltipMobile: this.element.select(".vzb-tooltip-mobile")
    };
    this.DOM.chartSvg.select(".vzb-bc-graph").call(graph => 
      Object.assign(this.DOM, {
        graph: graph,
        ySubTitleEl: graph.select(".vzb-bc-axis-y-subtitle"),
        xSubTitleEl: graph.select(".vzb-bc-axis-x-subtitle"),
        yTitleEl: graph.select(".vzb-bc-axis-y-title"),
        xTitleEl: graph.select(".vzb-bc-axis-x-title"),
        sTitleEl: graph.select(".vzb-bc-axis-s-title"),
        cTitleEl: graph.select(".vzb-bc-axis-c-title"),
        yInfoEl: graph.select(".vzb-bc-axis-y-info"),
        xInfoEl: graph.select(".vzb-bc-axis-x-info"),
        dataWarningEl: graph.select(".vzb-data-warning"),
        trailsContainer: graph.select(".vzb-bc-trails"),
        bubbleContainer: graph.select(".vzb-bc-bubbles"),
        bubbleContainerCrop: graph.select(".vzb-bc-bubbles-crop"),
        zoomSelection: graph.select(".vzb-zoom-selection"),
      })
    );
    this.DOM.chartSvgFront.select(".vzb-bc-graph").call(graphFront => 
      Object.assign(this.DOM, {
        graphFront: graphFront,
        labelsContainer: graphFront.select(".vzb-bc-labels"),
        labelsContainerCrop: graphFront.select(".vzb-bc-labels-crop"),
        linesContainer: graphFront.select(".vzb-bc-lines"),
        bubbleCrown: graphFront.select(".vzb-bc-bubble-crown")
      })
    );
    this.DOM.chartSvgBack.select(".vzb-bc-graph").call(graphBack => {
      Object.assign(this.DOM, {
        yAxisElContainer: graphBack.select(".vzb-bc-axis-y"),
        xAxisElContainer: graphBack.select(".vzb-bc-axis-x"),
        yearEl: graphBack.select(".vzb-bc-year"),
        projectionX: graphBack.select(".vzb-bc-projection-x"),
        projectionY: graphBack.select(".vzb-bc-projection-y"),
        decorationsEl: graphBack.select(".vzb-bc-decorations"),
      });
      this.DOM.yAxisEl = this.DOM.yAxisElContainer.select("g");
      this.DOM.xAxisEl = this.DOM.xAxisElContainer.select("g");
      this.DOM.lineEqualXY = this.DOM.decorationsEl.select(".vzb-bc-line-equal-xy");
      this.DOM.xAxisGroupsEl = this.DOM.decorationsEl.select(".vzb-bc-x-axis-groups");
    });

    //set filter
    this.DOM.bubbleCrown.selectAll(".vzb-crown-glow")
      .attr("filter", "url(" + location.pathname + "#vzb-glow-filter)");

    this._year = this.findChild({type: "DynamicBackground"});
    this._labels = this.findChild({type: "Labels"});
    this._panZoom = new PanZoom(this);
  
    this.scrollableAncestor = utils.findScrollableAncestor(this.element);

    this.xAxis = axisSmart("bottom");
    this.yAxis = axisSmart("left");


    this.isCanvasPreviouslyExpanded = false;
    this.draggingNow = null;

    this.wScale = d3.scaleLinear()
      .domain(this.ui.datawarning.doubtDomain)
      .range(this.ui.datawarning.doubtRange);

    this.hoverBubble = false;

    const _this = this;
    //keyboard listeners
    d3.select("body")
      .on("keydown", () => {
        if (_this.ui.cursorMode !== "arrow" && _this.ui.cursorMode !== "hand") return;
        if (d3.event.metaKey || d3.event.ctrlKey) _this.DOM.chartSvgAll.classed("vzb-zoomin", true);
      })
      .on("keyup", () => {
        if (_this.ui.cursorMode !== "arrow" && _this.ui.cursorMode !== "hand") return;
        if (!d3.event.metaKey && !d3.event.ctrlKey) _this.DOM.chartSvgAll.classed("vzb-zoomin", false);
      })
      //this is for the case when user would press ctrl and move away from the browser tab or window
      //keyup event would happen somewhere else and won't be captured, so zoomin class would get stuck
      .on("mouseenter", () => {
        if (_this.ui.cursorMode !== "arrow" && _this.ui.cursorMode !== "hand") return;
        if (!d3.event.metaKey && !d3.event.ctrlKey) _this.DOM.chartSvgAll.classed("vzb-zoomin", false);
      });
  
    this.root.element.on("custom-resetZoom", () => {
      _this._panZoom.reset(null, 500);
    });

    this._panZoom.zoomSelection(this.DOM.bubbleContainerCrop);
    this.DOM.bubbleContainerCrop
      .call(this._panZoom.dragRectangle)
      .call(this._panZoom.zoomer)
      .on("dblclick.zoom", null)
      .on("mouseup", () => {
        _this.draggingNow = false;
      })
      .on("click", () => {
        const cursor = _this.ui.cursorMode;
        if (!d3.event.defaultPrevented && cursor !== "arrow" && cursor !== "hand") {
          _this._panZoom.zoomByIncrement(cursor, 500);
        }
      });

  }

  get MDL(){
    return {
      frame: this.model.encoding.get("frame"),
      selected: this.model.encoding.get("selected"),
      highlighted: this.model.encoding.get("highlighted"),
      superHighlighted: this.model.encoding.get("superhighlighted"),
      y: this.model.encoding.get(this.state.alias.y || "y"),
      x: this.model.encoding.get(this.state.alias.x || "x"),
      size: this.model.encoding.get("size"),
      color: this.model.encoding.get("color"),
      label: this.model.encoding.get("label"),
      trail: this.model.encoding.get("trail")
    };
  }

  draw() {
    this.localise = this.services.locale.auto();

    //this.MDL.trail.config.show = false;
    //this.ui.cursorMode = "plus";

    this.TIMEDIM = this.MDL.frame.data.concept;
    this.KEYS = this.model.data.space.filter(dim => dim !== this.TIMEDIM);

    if (this._updateLayoutProfile()) return; //return if exists with error
    this.addReaction(this._updateTrailsOnSelect);
    this.addReaction(this._updateXYScales);
    this.addReaction(this._updateColorScale);
    this.addReaction(this._updateUIStrings);
    this.addReaction(this._updateSize);
    this.addReaction(this._updateMarkerSizeLimits);
    //    this.addReaction(this._resetZoomMinMaxXReaction, this._resetZoomMinMaxX);
    //    this.addReaction(this._resetZoomMinMaxYReaction, this._resetZoomMinMaxY);
    this.addReaction(this._updateOpacity);
    this.addReaction(this._updateShowYear);
    this.addReaction(this._updateYear);
    this.addReaction(this.drawData);
    this.addReaction(this._zoomToMarkerMaxMin);

    this.addReaction(this._selectDataPoints);
    this.addReaction(this._highlightDataPoints);
    this.addReaction(this._blinkSuperHighlighted);
    this.addReaction(this._updateDoubtOpacity);
  }

  drawData() {
    if (this.MDL.trail.show) this.MDL.trail.updateTrailStart(this.MDL.frame.framesAround[1]);

    this.processFrameData();
    this._createAndDeleteBubbles();
    //this.redrawData();
  }

  _updateTrailsOnSelect() {
    const selectedFilter = this.MDL.selected.data.filter;
    runInAction(() => {
      Object.keys(this.MDL.trail.config.starts).forEach(marker => {
        if (!selectedFilter.markers.has(marker)) {
          this.MDL.trail.deleteTrail({
            [Symbol.for("key")]: marker
          });
        }
      });
      selectedFilter.markers.has();
      for (const [marker] of selectedFilter.markers) {
        if (!this.MDL.trail.config.starts[marker]) {
          this.MDL.trail.setTrail({
            [Symbol.for("key")]: marker,
            [this.MDL.trail.groupDim]: this.MDL.frame.value
          });
        }
      }
    });
  }

  _updateShowYear() {
    this.DOM.yearEl.classed("vzb-hidden", !this.ui.timeInBackground);
  }

  _updateYear() {
    const duration = this._getDuration();
    this._year.setText(this.localise(this.MDL.frame.value), duration);    
  }

  _createAndDeleteBubbles() {
    const _this = this;
    const duration = this._getDuration();
    const transition = this._getTransition(duration);
    const data = this.__dataProcessed;

    this.bubbles = this.DOM.bubbleContainer.selectAll(".vzb-bc-entity")
      .data(this.__dataProcessed, d => d[Symbol.for("key")])
      .join(
        enter => enter
          .append(d => {
            if (d[Symbol.for("trailHeadKey")]) {
              const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
              g.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "circle"));
              g.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "line"));
              return g;
            }
            return document.createElementNS("http://www.w3.org/2000/svg", "circle");
          })
          .attr("class", "vzb-bc-entity")
          .attr("id", d => `vzb-bc-bubble-${d[Symbol.for("key")]}-${this.id}`)
          .style("opacity", d => d[Symbol.for("opacity")] = this._getBubbleOpacity(d))
          .call(selection => {
            if(!utils.isTouchDevice()){
              selection
                .on("mouseover", this._bubblesInteract().mouseover)
                .on("mouseout", this._bubblesInteract().mouseout)
                .on("click", this._bubblesInteract().click);
            } else {
              selection
                .on("tap", this._bubblesInteract().tap);
            }
          })
          .each(function(d, index) {
            const dataNext = data[index + 1] || {};
            const trail = d[Symbol.for("trailHeadKey")];
            const headTrail = trail && !dataNext[Symbol.for("trailHeadKey")];
            const node = trail ? this.children[0] : this;
            //console.log("enter", d, headTrail)
      
            const valueX = d[_this.__alias("x")];
            const valueY = d[_this.__alias("y")];
            const valueS = d.size;
            const valueC = d.color;
      
            //d.hidden = (!valueS && valueS !== 0) || valueX == null || valueY == null;
      
            //view.classed("vzb-hidden", d.hidden);
            d.r = utils.areaToRadius(_this.sScale(valueS || 0));
            const scaledX = _this.xScale(valueX);
            const scaledY = _this.yScale(valueY);
            const scaledC = valueC != null ? _this.cScale(valueC) : COLOR_WHITEISH;
      
            const view = d3.select(node);
            if (!duration || !headTrail) {
              view
                .attr("r", d.r)
                .attr("fill", scaledC)
                .attr("cy", scaledY)
                .attr("cx", scaledX);
              //.transition(transition)
      
              //trail line
              if (trail) {
                const lineView = d3.select(node.nextSibling);

                const scaledX0 = _this.xScale(dataNext[_this.__alias("x")]);
                const scaledY0 = _this.yScale(dataNext[_this.__alias("y")]);
                
                lineView
                  .attr("x1", scaledX)
                  .attr("y1", scaledY)
                  .attr("x2", scaledX0)
                  .attr("y2", scaledY0)
                  .style("stroke", scaledC)
                  .attr("stroke-dasharray", Math.abs(scaledX - scaledX0) + Math.abs(scaledY - scaledY0))
                  .attr("stroke-dashoffset", -d.r);
              }
            }
      
            if (duration && !trail) {
              view
                .style("opacity", 0)
                .transition().duration(duration*0.9)
                .style("opacity", d[Symbol.for("opacity")]);
            }
      
            if (!trail) {
              _this._updateLabel(d, valueX, valueY, duration, true, false);
            }
          }),

        update => update
          .each(function(d, index) {
            
            const trail = d[Symbol.for("trailHeadKey")];
            const dataNext = data[index + 1] || {};
            const dataNext2 = data[index + 2] || {};
            const headTrail = trail && !dataNext[Symbol.for("trailHeadKey")];
            const headTrail2 = trail && !dataNext2[Symbol.for("trailHeadKey")];
      
            const valueS = d.size;
            d.r = utils.areaToRadius(_this.sScale(valueS || 0));
            if (trail && !headTrail && !headTrail2) return;
      
            const valueX = d[_this.__alias("x")];
            const valueY = d[_this.__alias("y")];
            const valueC = d.color;
      
            //d.hidden = (!valueS && valueS !== 0) || valueX == null || valueY == null;
      
            //view.classed("vzb-hidden", d.hidden);
            const scaledX = _this.xScale(valueX);
            const scaledY = _this.yScale(valueY);
            const scaledC = valueC != null ? _this.cScale(valueC) : COLOR_WHITEISH;
      
            if (!duration || !headTrail) {
              const node = trail ? this.children[0] : this;
              const view = duration && !trail ?
                d3.select(node).transition(transition)
                :
                d3.select(node).interrupt();
          
              view
                .attr("r", d.r)
                .attr("fill", scaledC)
                .attr("cy", scaledY)
                .attr("cx", scaledX);

              
            
              //trail line
              if (trail) {
                const lineView = d3.select(node.nextSibling);

                const scaledX0 = _this.xScale(dataNext[_this.__alias("x")]);
                const scaledY0 = _this.yScale(dataNext[_this.__alias("y")]);
                
                lineView
                  .attr("x1", scaledX)
                  .attr("y1", scaledY);
                if (duration && !data[index + 2][Symbol.for("trailHeadKey")]) {
                  lineView
                    .attr("x2", scaledX)
                    .attr("y2", scaledY)
                    .transition(transition)
                    .attr("x2", scaledX0)
                    .attr("y2", scaledY0);
                } else {
                  lineView.interrupt()
                    .attr("x2", scaledX0)
                    .attr("y2", scaledY0);
                }
      
                lineView
                  .style("stroke", scaledC)
                  .attr("stroke-dasharray", Math.abs(scaledX - scaledX0) + Math.abs(scaledY - scaledY0))
                  .attr("stroke-dashoffset", -d.r);
              }
            }
            
            if (!trail)
              _this._updateLabel(d, valueX, valueY, duration, false, false);    
          }),    

        exit => exit
          .each(function(d) {
            const trail = d[Symbol.for("trailHeadKey")];
            const node = this;
            //console.log("exit", d)
            
            const view = duration && !trail ?
              d3.select(node).transition(transition)
                .duration(duration*0.9)
                .style("opacity", 0)
              :
              d3.select(node).interrupt();
      
            view
              .remove();
            
            if (!trail) 
              _this._updateLabel(d, d[_this.__alias("x")], d[_this.__alias("y")], duration, true, true);
          })
      )
      .order();

  }


  redrawData(duration) {
    this.services.layout.size;
    this.MDL.x.scale.type;
    this.MDL.y.scale.type;
    this.MDL.color.scale.type;
    this.MDL.size.scale.type;
    this.MDL.size.scale.extent;

    const _this = this;
    const data = this.__dataProcessed;

    if (this.bubbles) this.bubbles.each(function(d, index) {
      const trail = d[Symbol.for("trailHeadKey")];
      const node = trail ? this.children[0] : this;

      const valueX = d[_this.__alias("x")];
      const valueY = d[_this.__alias("y")];
      const valueS = d.size;
      const valueC = d.color;

      d.r = utils.areaToRadius(_this.sScale(valueS || 0));
      const scaledX = _this.xScale(valueX);
      const scaledY = _this.yScale(valueY);
      const scaledC = valueC != null ? _this.cScale(valueC) : COLOR_WHITEISH;

      const view = duration ? 
        d3.select(node)
          .transition()
          .duration(duration)
        : d3.select(node).interrupt();
      view
        .attr("r", d.r)
        .attr("fill", scaledC)
        .attr("cy", scaledY)
        .attr("cx", scaledX);

      if (trail) {
        const lineView = duration ? 
          d3.select(node.nextSibling)
            .transition()
            .duration(duration)
          : d3.select(node.nextSibling).interrupt();

        const dataNext = data[index + 1];
        const scaledX0 = _this.xScale(dataNext[_this.__alias("x")]);
        const scaledY0 = _this.yScale(dataNext[_this.__alias("y")]);

        lineView
          .attr("x1", scaledX)
          .attr("y1", scaledY)
          .attr("x2", scaledX0)
          .attr("y2", scaledY0)
          .style("stroke", scaledC)
          .attr("stroke-dasharray", Math.abs(scaledX - scaledX0) + Math.abs(scaledY - scaledY0))
          .attr("stroke-dashoffset", -d.r);
      }
    });

    _this._updateLabels();
  }

  __getZoomed(type, zoomed, domain) {
    //const zoomed = values[`zoomed${type}`];
    return d3[type.toLowerCase()](zoomed !== null ? zoomed : domain);
  }

  __getZoomedMin(values, domain) {
    return this.__getZoomed("Min", values, domain);
  }

  __getZoomedMax(values, domain) {
    return this.__getZoomed("Max", values, domain);
  }

  /*
   * Zoom to the min and max values given in the URL axes markers.
   */
  _zoomToMarkerMaxMin() {
    this.services.layout.size;
    this.MDL.x.scale.type;
    this.MDL.y.scale.type;

    const panzoom = //this.ui.panzoom;
    {
      x: this.MDL.x.scale.zoomed,
      y: this.MDL.y.scale.zoomed
    };
    
    const xDomain = this.MDL.x.data.domain;
    const yDomain = this.MDL.y.data.domain;

    if (this.draggingNow) return;

    /*
     * Reset just the zoom values without triggering a zoom event. This ensures
     * a clean zoom state for the subsequent zoom event.
     */
    this._panZoom.resetZoomState();

    this.yScale.range(this._rangeBump([this.height, 0]));
    this.xScale.range(this._rangeBump([0, this.width]));
   
    /*
     * The axes may return null when there is no value given for the zoomed
     * min and max values. In that case, fall back to the axes' domain values.
     */
    const zoomedMinX = this.__getZoomedMin(panzoom.x, xDomain);
    const zoomedMaxX = this.__getZoomedMax(panzoom.x, xDomain);
    const zoomedMinY = this.__getZoomedMin(panzoom.y, yDomain);
    const zoomedMaxY = this.__getZoomedMax(panzoom.y, yDomain);

    //by default this will apply no transition and feed values back to state
    runInAction(() => {
      this._panZoom.zoomToMaxMin(zoomedMinX, zoomedMaxX, zoomedMinY, zoomedMaxY, 0, "don't feed these zoom values back to state");
    });
  }

  _resetZoomMinMaxXReaction() {
    return { concept: this.MDL.x.data.concept };
  }

  _resetZoomMinMaxX() {
    this.ui.panzoom.x = {zoomedMin: null, zoomedMax: null};
  }

  _resetZoomMinMaxYReaction() {
    return { concept: this.MDL.y.data.concept };
  }

  _resetZoomMinMaxY() {
    this.ui.panzoom.y = {zoomedMin: null, zoomedMax: null};
  }

  _drawForecastOverlay() {
    this.DOM.forecastOverlay.classed("vzb-hidden", 
      !this.MDL.frame.endBeforeForecast || 
      !this.ui.showForecastOverlay || 
      (this.MDL.frame.value <= this.MDL.frame.endBeforeForecast)
    );
  }

  _updateLayoutProfile(){
    this.services.layout.size;

    this.elementHeight = (this.element.node().clientHeight) || 0;
    this.elementWidth = (this.element.node().clientWidth) || 0;

    this.profileConstants = this.services.layout.getProfileConstants(
      PROFILE_CONSTANTS(this.elementWidth, this.elementHeight, { ui: this.ui }), 
      PROFILE_CONSTANTS_FOR_PROJECTOR(this.elementWidth, this.elementHeight, { ui: this.ui }));

    if (!this.elementHeight || !this.elementWidth) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");

  }

  _getDuration() {
    return this.MDL.frame.playing ? this.MDL.frame.speed || 0 : 0;
  }

  _updateXYScales() {
    this.yScale = this.MDL.y.scale.d3Scale.copy();
    this.xScale = this.MDL.x.scale.d3Scale.copy();
    this._labels.setScales(this.xScale, this.yScale);
  }

  _updateColorScale() {
    this.cScale = this.MDL.color.scale.d3Scale.copy();
  }
  
  _updateUIStrings() {
    const {
      y, x, size, color
    } = this.MDL;

    const {
      xTitleEl,
      yTitleEl,
      sTitleEl,
      xSubTitleEl,
      ySubTitleEl,
      dataWarningEl,
      xInfoEl,
      yInfoEl
    } = this.DOM;

    const _this = this;

    const conceptPropsY = Utils.getConceptProps(y, this.localise);
    const conceptPropsX = Utils.getConceptProps(x, this.localise);
    const conceptPropsS = Utils.getConceptProps(size, this.localise);
    const conceptPropsC = Utils.getConceptProps(color, this.localise);

    function getTitle(cp, enc){
      return cp.name || cp.concept || enc.name;
    }

    function getShortTitle(cp, enc){
      return cp.name_short || getTitle(cp, enc);
    }

    function getSubtitle(cp, enc) {
      const title = getTitle(cp, enc);
      const shortTitle = getShortTitle(cp, enc);
      let subtitle = title.replace(shortTitle,"");
      if (subtitle[0] === ",") subtitle = subtitle.slice(1);
      const regexpResult = /^\((.*)\)$|.*/.exec(subtitle.trim());
      return regexpResult[1] || regexpResult[0] || "";
    }

    this.strings = {
      title: {
        Y: getTitle(conceptPropsY, y),
        X: getTitle(conceptPropsX, x),
        S: getTitle(conceptPropsS, size),
        C: getTitle(conceptPropsC, color)
      },
      title_short: {
        Y: getShortTitle(conceptPropsY, y),
        X: getShortTitle(conceptPropsX, x),
        S: getShortTitle(conceptPropsS, size),
        C: getShortTitle(conceptPropsC, color)
      },
      subtitle: {
        Y: getSubtitle(conceptPropsY, y),
        X: getSubtitle(conceptPropsX, x),
        S: conceptPropsS.name_short || "",
        C: conceptPropsC.name_short || ""
      },
      unit: {
        Y: conceptPropsY.unit || "",
        X: conceptPropsX.unit || "",
        S: conceptPropsS.unit || "",
        C: conceptPropsC.unit || ""
      }
    };

    ySubTitleEl.selectAll("text").data([0])
      .join("text");
    xSubTitleEl.selectAll("text").data([0])
      .join("text");

    yTitleEl.selectAll("text").data([0])
      .join("text")
    //.attr("y", "-6px")
      .on("click", () => {
        this.root.findChild({type: "TreeMenu"})
          .encoding(this.__alias("y"))
          .alignX(this.services.locale.isRTL() ? "right" : "left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    xTitleEl.selectAll("text").data([0])
      .join("text")
      .on("click", () => {
        this.root.findChild({type: "TreeMenu"})
          .encoding(this.__alias("x"))
          .alignX(this.services.locale.isRTL() ? "right" : "left")
          .alignY("bottom")
          .updateView()
          .toggle();
      });

    sTitleEl.selectAll("text").data([0])
      .join("text")
      .attr("text-anchor", "end");

    utils.setIcon(dataWarningEl, ICON_WARN).select("svg").attr("width", "0px").attr("height", "0px");
    dataWarningEl.append("text")
      .attr("text-anchor", "end")
      .text(this.localise("hints/dataWarning"));

    utils.setIcon(yInfoEl, ICON_QUESTION)
      .select("svg").attr("width", "0px").attr("height", "0px");

    utils.setIcon(xInfoEl, ICON_QUESTION)
      .select("svg").attr("width", "0px").attr("height", "0px");


    //TODO: move away from UI strings, maybe to ready or ready once
    yInfoEl.on("click", () => {
      _this.root.findChild({type: "DataNotes"}).pin();
    });
    yInfoEl.on("mouseover", function() {
      const rect = this.getBBox();
      const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      const toolRect = _this.root.element.node().getBoundingClientRect();
      const chartRect = _this.element.node().getBoundingClientRect();
      _this.root.findChild({type: "DataNotes"})
        .setEncoding(_this.MDL.y)
        .show()
        .setPos(coord.x + chartRect.left - toolRect.left, coord.y);
    });
    yInfoEl.on("mouseout", () => {
      _this.root.findChild({type: "DataNotes"}).hide();
    });
    xInfoEl.on("click", () => {
      _this.root.findChild({type: "DataNotes"}).pin();
    });
    xInfoEl.on("mouseover", function() {
      //if (_this.model.time.dragging) return;
      const rect = this.getBBox();
      const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
      const toolRect = _this.root.element.node().getBoundingClientRect();
      const chartRect = _this.element.node().getBoundingClientRect();
      _this.root.findChild({type: "DataNotes"})
        .setEncoding(_this.MDL.x)
        .show()
        .setPos(coord.x + chartRect.left - toolRect.left, coord.y);
    });
    xInfoEl.on("mouseout", () => {
      //if (_this.model.time.dragging) return;
      _this.root.findChild({type: "DataNotes"}).hide();
    });
    dataWarningEl
      .on("click", () => {
        _this.root.findChild({type: "DataWarning"}).toggle();
      })
      .on("mouseover", () => {
        _this._updateDoubtOpacity(1);
      })
      .on("mouseout", () => {
        _this._updateDoubtOpacity();
      });
  }

  _updateSize() {
    this.services.layout.size;

    const {
      x,
      y
    } = this.MDL;
    
    const {
      graphAll,
      eventArea,
      bubbleContainerCropAll,
      labelsContainerCrop,
      xAxisElContainer,
      xAxisEl,
      yAxisElContainer,
      yAxisEl,
      projectionX,
      projectionY,
      sTitleEl,
      xTitleEl,
      yTitleEl,
      xSubTitleEl,
      ySubTitleEl,
      xAxisGroupsEl,
      xInfoEl,
      yInfoEl

    } = this.DOM;

    const _this = this;

    const layoutProfile = this.services.layout.profile;
    this.profileConstants.maxRadiusPx = Math.max(
      this.profileConstants.minRadiusPx,
      this.profileConstants.maxRadiusEm * utils.hypotenuse(this.elementWidth, this.elementHeight)
    );

    const margin = this.profileConstants.margin;
    const infoElHeight = this.profileConstants.infoElHeight;

    //labels
    this._labels.setCloseCrossHeight(_this.profileConstants.infoElHeight * 1.2);
    this._labels.setTooltipFontSize(_this.profileConstants.infoElHeight + "px");
    
    //stage
    const height = this.height = (this.elementHeight - margin.top - margin.bottom) || 0;
    const width = this.width = (this.elementWidth - margin.left * this.profileConstants.leftMarginRatio - margin.right) || 0;

    // if (height <= 0 || width <= 0) {
    //   height = 0;
    //   width = 0;
    //   utils.warn("Bubble chart updateSize(): vizabi container is too little or has display:none");
    // }

    //graph group is shifted according to margins (while svg element is at 100 by 100%)
    graphAll
      .attr("transform", "translate(" + (margin.left * this.profileConstants.leftMarginRatio) + "," + margin.top + ")");

    this._year.resizeText(width, height);
    //this.yearEl.classed("vzb-hidden", !this.ui.timeInBackground);
    //this.year.resize(width, height);
    
    eventArea
      .attr("width", width)
      .attr("height", Math.max(0, height));

    //update scales to the new range
    // // if (this.model.marker.y.scaleType !== "ordinal") {
    // //   this.yScale.range(this._rangeBump([height, 0]));
    // // } else {
    // //   this.yScale.rangePoints([height, 0], _this.profileConstants.padding).range();
    // // }
    // // if (this.model.marker.x.scaleType !== "ordinal") {
    // //   this.xScale.range(this._rangeBump([0, width]));
    // // } else {
    // //   this.xScale.rangePoints([0, width], _this.profileConstants.padding).range();
    // // }
    this.yScale.range(this._rangeBump([height, 0]));
    this.xScale.range(this._rangeBump([0, width]));

    //apply scales to axes and redraw
    this.yAxis.scale(this.yScale)
      .tickSizeInner(-width)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-width, 0)
      .labelerOptions({
        scaleType: y.scale.type,
        toolMargin: margin,
        limitMaxTickNumber: 6,
        bump: this.profileConstants.maxRadiusPx / 2,
        viewportLength: height,
        formatter: this.localise
      });

    this.xAxis.scale(this.xScale)
      .tickSizeInner(-height)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-height, 0)
      .labelerOptions({
        scaleType: x.scale.type,
        toolMargin: margin,
        bump: this.profileConstants.maxRadiusPx / 2,
        viewportLength: width,
        formatter: this.localise
      });


    bubbleContainerCropAll
      .attr("width", width)
      .attr("height", Math.max(0, height));

    labelsContainerCrop
      .attr("width", width)
      .attr("height", Math.max(0, height));

    xAxisElContainer
      .attr("width", width + 1)
      .attr("height", this.profileConstants.margin.bottom + height)
      .attr("y", -1)
      .attr("x", -1);
    xAxisEl
      .attr("transform", "translate(1," + (1 + height) + ")");

    yAxisElContainer
      .attr("width", this.profileConstants.margin.left + width)
      .attr("height", Math.max(0, height))
      .attr("x", -this.profileConstants.margin.left);
    yAxisEl
      .attr("transform", "translate(" + (this.profileConstants.margin.left - 1) + "," + 0 + ")");

    yAxisEl.call(this.yAxis);
    xAxisEl.call(this.xAxis);

    projectionX.attr("y1", _this.yScale.range()[0] + this.profileConstants.maxRadiusPx / 2);
    projectionY.attr("x2", _this.xScale.range()[0] - this.profileConstants.maxRadiusPx / 2);


    // reduce font size if the caption doesn't fit
    this._updateSTitle();
    sTitleEl
      .attr("transform", "translate(" + width + "," + 20 + ") rotate(-90)");

    if (layoutProfile !== "SMALL") {
      ySubTitleEl.select("text").attr("dy", infoElHeight * 0.6).text(this.strings.subtitle.Y);
      xSubTitleEl.select("text").attr("dy", -infoElHeight * 0.3).text(this.strings.subtitle.X);
      
      yTitleEl.select("text").text(this.strings.title_short.Y + " ")
        .append("tspan")
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
      xTitleEl.select("text").text(this.strings.title_short.X + " ")
        .append("tspan")
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
    } else {
      ySubTitleEl.select("text").text("");
      xSubTitleEl.select("text").text("");

      const yTitleText = yTitleEl.select("text").text(this.strings.title.Y);
      if (yTitleText.node().getBBox().width > width) yTitleText.text(this.strings.title_short.Y);
    
      const xTitleText = xTitleEl.select("text").text(this.strings.title.X);
      if (xTitleText.node().getBBox().width > width - 100) xTitleText.text(this.strings.title_short.X);      
    }

    const isRTL = this.services.locale.isRTL();
    ySubTitleEl
      .style("font-size", (infoElHeight * 0.8) + "px")
      .attr("transform", "translate(" + 0 + "," + 0 + ") rotate(-90)");
    xSubTitleEl
      .style("font-size", (infoElHeight * 0.8) + "px")
      .attr("transform", "translate(" + width + "," + height + ")");
  
    yTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (-margin.left - this.profileConstants.yAxisTitleBottomMargin)  + "," + (height * 0.5) + ") rotate(-90)"
        : 
        "translate(" + (isRTL ? width : 10 - this.profileConstants.margin.left) + ", -" + this.profileConstants.yAxisTitleBottomMargin + ")");

    xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (width * 0.5) + "," + (height + margin.bottom - this.profileConstants.xAxisTitleBottomMargin) + ")"
        :
        "translate(" + (isRTL ? width : 0) + "," + (height + margin.bottom - this.profileConstants.xAxisTitleBottomMargin) + ")");
    
    xAxisGroupsEl
      .style("font-size", infoElHeight * 0.8 + "px");

    if (yInfoEl.select("svg").node()) {
      const titleBBox = yTitleEl.node().getBBox();
      const t = utils.transform(yTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);
      const vTranslate = isRTL ? (t.translateY + infoElHeight * 1.4 + titleBBox.width * 0.5) : (t.translateY - infoElHeight * 0.4 - titleBBox.width * 0.5);
      const conceptPropsY = y.data.conceptProps;

      yInfoEl
        .classed("vzb-hidden", !conceptPropsY.description && !conceptPropsY.sourceLink || this.services.layout.projector)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      yInfoEl.attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (t.translateX - infoElHeight * 0.8) + "," + vTranslate + ") rotate(-90)"
        :
        "translate(" + hTranslate + "," + (t.translateY - infoElHeight * 0.8) + ")");
    }

    if (xInfoEl.select("svg").node()) {
      const titleBBox = xTitleEl.node().getBBox();
      const t = utils.transform(xTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);
      const conceptPropsX = x.data.conceptProps;

      xInfoEl
        .classed("vzb-hidden", !conceptPropsX.description && !conceptPropsX.sourceLink || this.services.layout.projector)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      xInfoEl.attr("transform", "translate("
        + hTranslate + ","
        + (t.translateY - infoElHeight * 0.8) + ")");
    }

    this._resizeDataWarning();

    //this.services.layout.setHGrid([this.elementWidth - marginRightAdjusted]);
    //this.ui.margin.set("left", margin.left * this.profileConstants.leftMarginRatio, false, false);

    // (function(xMin, xMax, yMin, yMax) {
    //   if ((xMin && xMax && yMin && yMax) === null) return;
    //   _this._panZoom.zoomer.dontFeedToState = true;
    //   _this._panZoom.rerun(); // includes redraw data points and trail resize
    //   _this._panZoom.zoomToMaxMin(xMin, xMax, yMin, yMax, 0, true);
    // })(_this._zoomedXYMinMax.x.zoomedMin,
    //   _this._zoomedXYMinMax.x.zoomedMax,
    //   _this._zoomedXYMinMax.y.zoomedMin,
    //   _this._zoomedXYMinMax.y.zoomedMax);
  }

  _rangeBump(arg, undo) {
    const bump = this.profileConstants.maxRadiusPx / 2;
    undo = undo ? -1 : 1;
    if (utils.isArray(arg) && arg.length > 1) {
      let z1 = arg[0];
      let z2 = arg[arg.length - 1];

      //the sign of bump depends on the direction of the scale
      if (z1 < z2) {
        z1 += bump * undo;
        z2 -= bump * undo;
        // if the scale gets inverted because of bump, set it to avg between z1 and z2
        if (z1 > z2) z1 = z2 = (z1 + z2) / 2;
      } else if (z1 > z2) {
        z1 -= bump * undo;
        z2 += bump * undo;
        // if the scale gets inverted because of bump, set it to avg between z1 and z2
        if (z1 < z2) z1 = z2 = (z1 + z2) / 2;
      } else {
        // rangeBump error: the input scale range has 0 length. that sucks but we keep cool
      }
      return [z1, z2];
    }
    utils.warn("rangeBump error: input is not an array or empty");
  }

  _updateSTitle(titleS, titleC) {
    const { sTitleEl } = this.DOM;
    const {
      size,
      color
    } = this.MDL;
    // vertical text about size and color
    if (this.profileConstants.hideSTitle
      && this.root.ui.dialogs.dialogs.sidebar.indexOf("colors") > -1
      && this.root.ui.dialogs.dialogs.sidebar.indexOf("size") > -1) {
      sTitleEl.classed("vzb-invisible", true);
      return;
    }
    if (sTitleEl.classed("vzb-invisible")) {
      sTitleEl.classed("vzb-invisible", false);
    }
    const sTitleContentON = !size.data.constant;
    const cTitleContentON = !color.data.constant;
    const sTitleText = sTitleEl.select("text")
    // reset font size to remove jumpy measurement
      .style("font-size", null)
      .text(
        (sTitleContentON ? this.localise("buttons/size") + ": " + (titleS ? titleS : this.strings.title.S) : "") +
        (sTitleContentON && cTitleContentON ? ", " : "") +
        (cTitleContentON ? this.localise("buttons/colors") + ": " + (titleC ? titleC : this.strings.title.C) : "")
      );
    const sTitleWidth = sTitleText.node().getBBox().width;
    const remainigHeight = this.height - 30;
    const font = parseInt(sTitleText.style("font-size")) * remainigHeight / sTitleWidth;
    sTitleText.style("font-size", sTitleWidth > remainigHeight ? font + "px" : null);
  }

  _resizeDataWarning() {
    const {
      dataWarningEl,
      xTitleEl
    } = this.DOM;

    // reset font size to remove jumpy measurement
    const dataWarningText = dataWarningEl.select("text").style("font-size", null);

    // reduce font size if the caption doesn't fit
    const dataWarningWidth = dataWarningText.node().getBBox().width + dataWarningText.node().getBBox().height * 3;
    const remainingWidth = this.elementWidth - xTitleEl.node().getBBox().width - this.profileConstants.infoElHeight;
    const font = parseInt(dataWarningText.style("font-size")) * remainingWidth / dataWarningWidth;
    dataWarningText.style("font-size", dataWarningWidth > remainingWidth ? font + "px" : null);

    // position the warning icon
    const warnBB = dataWarningText.node().getBBox();
    dataWarningEl.select("svg")
      .attr("width", warnBB.height * 0.75)
      .attr("height", warnBB.height * 0.75)
      .attr("x", -warnBB.width - warnBB.height * 1.2)
      .attr("y", -warnBB.height * 0.65);

    dataWarningEl
      .classed("vzb-hidden", this.services.layout.projector)
      .attr("transform", "translate("
        + (this.services.locale.isRTL() ? warnBB.width + warnBB.height : this.width) + ","
        + (this.height + this.profileConstants.margin.bottom - this.profileConstants.xAxisTitleBottomMargin)
        + ")");
  }

  processFrameData() {
    return this.__dataProcessed = this.model.dataArray;
  }

  _getTransition(duration) {
    return duration ? d3.transition()
      .duration(duration)
      .ease(d3.easeLinear) : d3.transition();
  }  

  _bubblesInteract() {
    const _this = this;

    return {
      mouseover(d) {
        _this.hoverBubble = true;
        _this.MDL.highlighted.data.filter.set(d);
        _this._labels.showCloseCross(d, true);
      },

      mouseout(d) {
        _this.hoverBubble = false;
        _this.MDL.highlighted.data.filter.delete(d);
        //_this._setTooltip();
        _this._labels.showCloseCross(d, false);
      },

      click(d) {
        if (_this.draggingNow) return;
        // // const isSelected = d.isSelected;
        if (!d[Symbol.for("trailHeadKey")]) _this.model.toggleSelection(d);
        //_this.MDL.selected.data.filter.toggle(d);
        // // //return to highlighted state
        // // if (!utils.isTouchDevice()) {
        // //   if (isSelected) _this.model.marker.highlightMarker(d);
        // //   _this.highlightDataPoints();
      }
    };
  }

  _updateMarkerSizeLimits() {
    this.services.layout.size;
    this.MDL.size.scale.domain;
    this.MDL.size.scale.extent;

    this.sScale = this.MDL.size.scale.d3Scale.copy();

    //if (!this.profileConstants) return utils.warn("updateMarkerSizeLimits() is called before ready(). This can happen if events get unfrozen and getFrame() still didn't return data");
    const {
      minRadiusPx,
      maxRadiusPx
    } = this.profileConstants;
    
    const extent = this.MDL.size.scale.extent || [0, 1];
    
    let minArea = utils.radiusToArea(Math.max(maxRadiusPx * extent[0], minRadiusPx));
    let maxArea = utils.radiusToArea(Math.max(maxRadiusPx * extent[1], minRadiusPx));

    let range = minArea === maxArea? [minArea, maxArea] :
      d3.range(minArea, maxArea, (maxArea - minArea)/(this.sScale.domain().length - 1)).concat(maxArea);

    this.sScale.range(range);
  }

  _setTooltip(tooltipText, x, y, s, c, d) {
    if (tooltipText) {
      const labelValues = {};
      if (d) {
        labelValues.valueY = d[this.__alias("y")];
        labelValues.valueX = d[this.__alias("x")];
        labelValues.valueS = d.size;
        labelValues.valueC = d.color;
        labelValues.valueLST = d.size_label || null;
        labelValues.labelText = this.__labelWithoutFrame(d, this.localise);
      }

      const tooltipCache = {};
      tooltipCache.labelX0 = this.xScale.invert(x);
      tooltipCache.labelY0 = this.yScale.invert(y);
      tooltipCache.scaledS0 = s;
      tooltipCache.scaledC0 = null;

      this._labels.setTooltip(d, tooltipText, tooltipCache, labelValues);
    } else {
      this._labels.setTooltip();
    }
  }

  _getLabelText(d) {
    return this.KEYS.map(key => d.label[key]).join(",");
    ////  + (this.model.ui.chart.timeInTrails && time && (this.model.time.start - this.model.time.end !== 0) ? " " + time : "");
  }

  _updateOpacity(selection) {
    //this.MDL.frame.value; //listen

    const highlightedFilter = this.MDL.highlighted.data.filter;
    const selectedFilter = this.MDL.selected.data.filter;

    this.__highlightedMarkers = new Map(highlightedFilter.markers);
    this.__selectedMarkers = new Map(selectedFilter.markers);
    this.__someSelected = this.__selectedMarkers.size != 0;
    this.__someHighlighted = this.__highlightedMarkers.size != 0;

    const _selection = selection || this.bubbles;
    if (_selection) _selection.style("opacity", d => this._getBubbleOpacity(d, this.ui));
  }

  _getBubbleOpacity(d) { 
    const ui = this.ui;

    if (this.__highlightedMarkers.has(d[Symbol.for("key")])) return ui.opacityHighlight;
    if (d[Symbol.for("trailHeadKey")]) return ui.opacityRegular;
    if (this.__selectedMarkers.has(d[Symbol.for("key")])) return ui.opacitySelect;

    if (this.__someSelected) return ui.opacitySelectDim;
    if (this.__someHighlighted) return ui.opacityHighlightDim;

    return ui.opacityRegular;
  }

  _updateDoubtOpacity(opacity) {
    if (opacity == null) opacity = this.wScale(this.MDL.frame.value.getUTCFullYear());
    if (this.MDL.selected.data.filter.any()) opacity = 1;
    this.DOM.dataWarningEl.style("opacity", opacity);
  }

  _setBubbleCrown(x, y, r, glow, skipInnerFill) {
    const bubbleCrown = this.DOM.bubbleCrown;
    if (x != null) {
      bubbleCrown.classed("vzb-hidden", false);
      bubbleCrown.select(".vzb-crown")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", r)
        .attr("fill", skipInnerFill ? "none" : glow);
      bubbleCrown.selectAll(".vzb-crown-glow")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", r + 10)
        .attr("stroke", glow);

    } else {
      bubbleCrown.classed("vzb-hidden", true);
    }

  }

  /*
   * Shows and hides axis projections
   */
  _axisProjections(d) {
    const {
      projectionX,
      projectionY,
      xAxisEl,
      yAxisEl
    } = this.DOM;

    if (d != null) {

      const valueY = d[this.__alias("y")];
      const valueX = d[this.__alias("x")];
      const radius = d.r;

      //if (!valueY && valueY !== 0 || !valueX && valueX !== 0 || !valueS && valueS !== 0) return;

      if (this.ui.whenHovering.showProjectionLineX
        && this.xScale(valueX) > 0 && this.xScale(valueX) < this.width
        && (this.yScale(valueY) + radius) < this.height) {
        projectionX
          .style("opacity", 1)
          .attr("y2", this.yScale(valueY) + radius)
          .attr("x1", this.xScale(valueX))
          .attr("x2", this.xScale(valueX));
      }

      if (this.ui.whenHovering.showProjectionLineY
        && this.yScale(valueY) > 0 && this.yScale(valueY) < this.height
        && (this.xScale(valueX) - radius) > 0) {
        projectionY
          .style("opacity", 1)
          .attr("y1", this.yScale(valueY))
          .attr("y2", this.yScale(valueY))
          .attr("x1", this.xScale(valueX) - radius);
      }

      if (this.ui.whenHovering.higlightValueX) xAxisEl.call(
        this.xAxis.highlightValue(valueX)
      );

      if (this.ui.whenHovering.higlightValueY) yAxisEl.call(
        this.yAxis.highlightValue(valueY)
      );


    } else {

      projectionX.style("opacity", 0);
      projectionY.style("opacity", 0);
      xAxisEl.call(this.xAxis.highlightValue("none"));
      yAxisEl.call(this.yAxis.highlightValue("none"));

    }

  }

  /*
   * Highlights all hovered bubbles
   */
  _highlightDataPoints() {
    const _this = this;

    const highlightedFilter = this.MDL.highlighted.data.filter;
    const selectedFilter = this.MDL.selected.data.filter;
    this.someHighlighted = highlightedFilter.any();

    //this.updateBubbleOpacity();
    const trailShow = this.MDL.trail.show;
    const trailStarts = this.MDL.trail.starts;
    const trailGroupDim = this.MDL.trail.groupDim;

    if (highlightedFilter.markers.size === 1) {
      const highlightedKey = highlightedFilter.markers.keys().next().value;
      const d = Object.assign(this.model.dataMap.getByObjOrStr(null, highlightedKey));
      const x = _this.xScale(d[_this.__alias("x")]);
      const y = _this.yScale(d[_this.__alias("y")]);
      const s = d.r;
      const c = d.color != null ? this.cScale(d.color) : COLOR_WHITEISH;
      let entityOutOfView = false;

      ////const titles = _this._formatSTitleValues(values.size[utils.getKey(d, dataKeys.size)], values.color[utils.getKey(d, dataKeys.color)]);
      ////_this._updateSTitle(titles[0], titles[1]);
      if (x + s < 0 || x - s > this.width || y + s < 0 || y - s > this.height) {
        entityOutOfView = true;
      }

      //show tooltip
      const selectedKey = d[Symbol.for("trailHeadKey")] || d[Symbol.for("key")];
      // const trailShow = this.MDL.trail.show;
      // const trailStarts = this.MDL.trail.starts;
      // const trailGroupDim = this.MDL.trail.groupDim;
      const isSelected = selectedFilter.has(selectedKey);
      const isTailTrail = !(trailStarts[selectedKey] - d[trailGroupDim]);
      const isBubble = !(d[Symbol.for("trailHeadKey")]);

      let text = "";
      
      text = isSelected ? 
        !trailShow || isTailTrail || (isBubble && !this.hoverBubble) ? "": this.localise(d.label[trailGroupDim])
        : 
        this.__labelWithoutFrame(d);
      
      _this._labels.highlight(null, false);
      _this._labels.highlight({ [Symbol.for("key")]: selectedKey }, true);
      if (isSelected) {
        const skipCrownInnerFill = isBubble;
        //!d.trailStartTime || d.trailStartTime == _this.model.time.formatDate(_this.time);
        _this._setBubbleCrown(x, y, s, c, skipCrownInnerFill);
      }

      if (!entityOutOfView) {
        _this._axisProjections(d);
      }

      //set tooltip and show axis projections
      if (text && !entityOutOfView) {
        _this._setTooltip(text, x, y, s + 3, c, d);
      }

      // // const selectedData = utils.find(_this.model.marker.select, f => utils.getKey(f, KEYS) == d[KEY]);
      // // if (selectedData) {
      // //   const clonedSelectedData = utils.clone(selectedData);
      // //   //change opacity to OPACITY_HIGHLT = 1.0;
      // //   clonedSelectedData.opacity = 1.0;
      // //   _this._trails.run(["opacityHandler"], clonedSelectedData);
      // // }
    } else {
      this._axisProjections();
      ////this._trails.run(["opacityHandler"]);
      //hide tooltip
      //this._updateSTitle();
      this._setTooltip();
      this._setBubbleCrown();
      this._labels.highlight(null, false);
    }

  }

  _blinkSuperHighlighted() {
    if (!this.MDL.superHighlighted) return;

    const superHighlightFilter = this.MDL.superHighlighted.data.filter;

    this.bubbles
      .classed("vzb-super-highlighted", d => superHighlightFilter.has(d));
  }

  _selectDataPoints() {
    const _this = this;
    const selectedFilter = this.MDL.selected.data.filter;
    
    if (utils.isTouchDevice()) {
      _this.model.clearHighlighted();
      _this._labels.showCloseCross(null, false);
    } else {
      //hide tooltip
      _this._setTooltip();
      ////_this._setBubbleCrown();
    }

    // utils.forEach(_this.bubbles.data(), d => {
    //   d.isSelected = _this.model.marker.isSelected(d);
    // });

    _this.someSelected = selectedFilter.any();
    _this.nonSelectedOpacityZero = false;

  }

  _updateLabel(d, x, y, duration, showhide, hidden) {
    const selectedMarkers = this.MDL.selected.data.filter.markers;
    const key = d[Symbol.for("key")];
    // only for selected markers
    if (selectedMarkers.has(key)) {
      const trail = this.MDL.trail;
  
      const cache = {};

      let labelText = "";

      //if (showhide && hidden && trail.show && trailStartTime && (trailStartTime < _this.time)) showhide = false;
      if (hidden && !trail.show) showhide = true;

      if (trail.show) {
        const trailStart = trail.starts[key];
        //console.log("trailstart", trailStart)
        // if this bubble is trail start bubble
        if (trailStart >= this.MDL.frame.value || showhide) {
          const trailData = this.model.getDataMapByFrameValue(trailStart).getByObjOrStr(null, key);
          
          cache.labelText = labelText = this.__labelAll(trailData);
          cache.labelX0 = trailData[this.__alias("x")];
          cache.labelY0 = trailData[this.__alias("y")];
          cache.scaledC0 = trailData.color != null ? this.cScale(trailData.color) : COLOR_WHITEISH,
          cache.scaledS0 = (trailData.size || trailData.size === 0) ? utils.areaToRadius(this.sScale(trailData.size)) : null;
          cache.valueS0 = trailData.size;
          trailData.hidden = hidden;
          this._labels.updateLabel(trailData, cache, cache.labelX0, cache.labelY0, trailData.size, trailData.color, labelText, trailData.size_label, duration, showhide);
        }
      } else {
        cache.labelText = labelText = this.__labelWithoutFrame(d);
        cache.labelX0 = x;
        cache.labelY0 = y;
        cache.scaledC0 = d.color != null ? this.cScale(d.color) : COLOR_WHITEISH,
        cache.scaledS0 = (d.size || d.size === 0) ? utils.areaToRadius(this.sScale(d.size)) : null;
        cache.valueS0 = d.size;
        d.hidden = hidden;
        this._labels.updateLabel(d, cache, x, y, d.size, d.color, labelText, d.size_label, duration, showhide);
      }
    }
  }
  
  _updateLabels() {
    //console.log("updateLabels");

    const selectedFilter = this.MDL.selected.data.filter;
    const trail = this.MDL.trail;

    for (const key of selectedFilter.markers.keys()) {
      const cache = this._labels.cached[key];

      const d = (trail.show ? this.model.getDataMapByFrameValue(trail.starts[key]) : this.model.dataMap)
        .getByObjOrStr(null, key);
      
      cache.labelText = this[(trail.show && this.ui.timeInTrails ? "__labelAll" : "__labelWithoutFrame")](d);
      cache.labelX0 = d[this.__alias("x")];
      cache.labelY0 = d[this.__alias("y")];
      cache.scaledC0 = d.color != null ? this.cScale(d.color) : COLOR_WHITEISH,
      cache.scaledS0 = (d.size || d.size === 0) ? utils.areaToRadius(this.sScale(d.size)) : null;
      cache.valueS0 = d.size;
      cache.initTextBBox = null;
      cache.initFontSize = null;
      this._labels.updateLabel({ [Symbol.for("key")]: key }, null, null, null, null, null, null, d.size_label);
    }
  }

  __labelWithoutFrame(d) {
    if (typeof d.label == "object") return Object.values(d.label).join(", ");
    if (d.label != null) return "" + d.label;
    return d[Symbol.for("key")];
  }

  __labelAll(d) {
    return this.model.data.space.map(dim => this.localise(d.label[dim])).join(" ");
  }

  __alias(x) {
    return this.state.alias[x];
  }  
}

_VizabiBubbleChart.DEFAULT_UI = {
  showForecastOverlay: true,
  opacityHighlight: 1.0,
  opacitySelect: 1.0,
  opacityHighlightDim: 0.1,
  opacitySelectDim: 0.3,
  opacityRegular: 0.5,
  timeInBackground: true,
  timeInTrails: true,
  decorations: {
    enabled: true,
    xAxisGroups: null
  },
  superhighlightOnMinimapHover: true,
  whenHovering: {
    showProjectionLineX: true,
    showProjectionLineY: true,
    higlightValueX: true,
    higlightValueY: true
  },
  labels: {
    // enabled: true,
    // dragging: true,
    removeLabelBox: true
  },
  margin: {
    left: 0,
    top:0
  },
  lockNonSelected: 0,
  datawarning: {
    doubtDomain: [],
    doubtRange: []
  },
  numberFormatSIPrefix: true,
}


// const {
  
//   labels: Labels,
//   'd3.axisWithLabelPicker': axisSmart,
//   'd3.dynamicBackground': DynamicBackground
// } = Vizabi.helpers;

// const {
//   warn: ICON_WARN,
//   question: ICON_QUESTION
// } = Vizabi.iconset;

// import Trail from './trail';
// import PanZoom from './panzoom';


// BUBBLE CHART COMPONENT
const BubbleChart = {

  /**
   * Initializes the component (Bubble Chart).
   * Executed once before any template is rendered.
   * @param {Object} config The config passed to the component
   * @param {Object} context The component's parent
   */
  init(config, context) {
    const _this = this;
    this.name = "bubblechart";
    this.template = require("./template.html");

    //define expected models for this component
    this.model_expects = [{
      name: "time",
      type: "time"
    }, {
      name: "marker",
      type: "marker"
    }, {
      name: "locale",
      type: "locale"
    }, {
      name: "ui",
      type: "ui"
    }];

    this.model_binds = {
      "change:time.playing": function(evt, original) {
        if (utils.isTouchDevice() && _this.model.time.playing && _this.someHighlighted) {
          _this.model.marker.clearHighlighted();
        }
      },
      "change:time.start": function(evt, original) {
        if (!_this._readyOnce || _this.model.time.splash) return;
        if (["color", "axis_x", "axis_y"].filter(hook => _this.model.marker[hook].which == _this.model.time.dim).length) {
          _this.ready();
          return;          
        };
        _this._trails.create().then(() => {
          _this._trails.run(["findVisible", "reveal", "opacityHandler"]);
        });
      },
      "change:time.end": function(evt, original) {
        if (!_this._readyOnce || _this.model.time.splash) return;
        if (["color", "axis_x", "axis_y"].filter(hook => _this.model.marker[hook].which == _this.model.time.dim).length) {
          _this.ready();
          return;          
        };
        _this._trails.create().then(() => {
          _this._trails.run(["findVisible", "reveal", "opacityHandler"]);
        });
      },
      "change:time.record": function() {
        //console.log("change time record");
        if (_this.model.time.record) {
          _this._export.open(this.element, this.name);
        } else {
          _this._export.reset();
        }
      },
      "change:ui.chart.trails": function(evt) {
        //console.log("EVENT change:time:trails");
        if (!_this._readyOnce) return;
        _this._trails.toggle(_this.ui.trails);
        _this.redrawDataPoints();
      },
      "change:ui.chart.timeInBackground": function(evt) {
        if (!_this._readyOnce) return;
        _this.trigger("resize");
      },
      "change:ui.chart.timeInTrails": function(evt) {
        if (!_this._readyOnce) return;
        _this.trigger("resize");
      },
      "change:ui.numberFormatSIPrefix": function(evt) {
        if (!_this._readyOnce) return;
        _this.trigger("resize");
      },
      "change:ui.chart.lockNonSelected": function(evt) {
        if (!_this._readyOnce) return;
        //console.log("EVENT change:time:lockNonSelected");
        _this.redrawDataPoints(500);
      },
      "change:ui.chart.decorations": function(evt) {
        if (!_this._readyOnce) return;
        _this._updateDecorations(500);
      },
      "change:ui.chart.showForecastOverlay": function(evt) {
        if (!_this._readyOnce) return;
        _this._updateForecastOverlay();
      },
      
      "change:marker": function(evt, path) {
        // bubble size change is processed separately
        if (!_this._readyOnce) return;
        if (path.indexOf("scaleType") > -1) {
          _this.ready();
          return;
        }

        if (path.indexOf("marker.color") !== -1) return;
        if (path.indexOf("marker.size") !== -1) return;
        if (path.indexOf("marker.size_label") !== -1) return;

        if (path.indexOf("domainMin") > -1 || path.indexOf("domainMax") > -1) {
          if (!_this.yScale || !_this.xScale) return; //abort if building of the scale is in progress
          _this.updateSize();
          _this.updateMarkerSizeLimits();
          _this._trails.run("findVisible");
          _this.redrawDataPoints();
          _this._trails.run("resize", null, 500);
        } else if (path.indexOf("zoomedMin") > -1 || path.indexOf("zoomedMax") > -1) {
          if (_this.draggingNow) return;

          //avoid zooming again if values didn't change.
          //also prevents infinite loop on forced URL update from zoom.stop()
          if (utils.approxEqual(_this._zoomedXYMinMax.axis_x.zoomedMin, _this.model.marker.axis_x.zoomedMin, 0.01)
            && utils.approxEqual(_this._zoomedXYMinMax.axis_x.zoomedMax, _this.model.marker.axis_x.zoomedMax, 0.01)
            && utils.approxEqual(_this._zoomedXYMinMax.axis_y.zoomedMin, _this.model.marker.axis_y.zoomedMin, 0.01)
            && utils.approxEqual(_this._zoomedXYMinMax.axis_y.zoomedMax, _this.model.marker.axis_y.zoomedMax, 0.01)
          ) return;
          let playAfterZoom = false;
          if (_this.model.time.playing) {
            playAfterZoom = true;
            _this.model.time.pause(true);
          }
          _this._trails.run("abortAnimation");
          _this._panZoom.zoomToMaxMin(
            _this.model.marker.axis_x.getZoomedMin(),
            _this.model.marker.axis_x.getZoomedMax(),
            _this.model.marker.axis_y.getZoomedMin(),
            _this.model.marker.axis_y.getZoomedMax(),
            500 /*duration*/, "don't feed these zoom values back to state"
          );
          if (playAfterZoom) {
            _this.model.time.postponePause = false;
          }
        }

        //console.log("EVENT change:marker", evt);
      },
      "change:marker.select": function(evt, path) {
        if (!_this._readyOnce || !_this.entityBubbles) return;
        //console.log("EVENT change:marker:select");
        if (path.indexOf("select.labelOffset") !== -1) return;

        //disable trails if too many items get selected at once
        //otherwise it's too much waiting time
        if ((evt.source._val || []).length - (evt.source._previousVal || []).length > 50) _this.ui.trails = false;

        _this.selectDataPoints();
        _this.redrawDataPoints();
        _this._trails.create().then(() => {
          _this._trails.run(["findVisible", "reveal", "opacityHandler"]);
        });
        _this.updateBubbleOpacity();
        _this._updateDoubtOpacity();
      },
      "change:marker.superHighlight": (evt, path) => {
        if (this._readyOnce) {
          this._blinkSuperHighlighted();
        }
      },
      "change:marker.highlight": function(evt, path) {
        if (!_this._readyOnce) return;
        //path have values if trail is highlighted
        if (path != "highlight") {
          if (path !== null) {
            const titles = _this._formatSTitleValues(path.size, path.color);
            _this._updateSTitle(titles[0], titles[1]);
          } else {
            _this._updateSTitle();
          }
          return;
        }
        //console.log("EVENT change:marker:highlight");
        _this.highlightDataPoints();
      },
      "change:time.value": function() {
        if (_this.model.time.splash || !_this._readyOnce || !_this.entityBubbles) return;
        if (!_this.calculationQueue) { // collect timestamp that we request
          _this.calculationQueue = [_this.model.time.value.toString()];
        } else {
          _this.calculationQueue.push(_this.model.time.value.toString());
        }
        (function(time) { // isolate timestamp
          //_this._bubblesInteract().mouseout();
          _this.model.marker.getFrame(time, (frame, time) => {
            if (!_this._frameIsValid(frame)) return utils.warn("change:time.value: empty data received from marker.getFrame(). doing nothing");
            const index = _this.calculationQueue.indexOf(time.toString()); //
            if (index == -1) { // we was receive more recent frame before so we pass this frame
              return;
            }
            _this.calculationQueue.splice(0, index + 1); // remove timestamps that added to queue before current timestamp
            _this.frameChanged(frame, time);
          });

        })(_this.model.time.value);
      },
      "change:ui.adaptMinMaxZoom": function() {
        //console.log("EVENT change:ui:adaptMinMaxZoom");
        if (_this.model.ui.adaptMinMaxZoom) {
          _this._panZoom.expandCanvas(500);
        } else {
          _this._panZoom.reset();
        }
      },
      "change:marker.size.extent": function(evt, path) {
        //console.log("EVENT change:marker:size:max");
        if (!_this._readyOnce) return;
        _this.updateMarkerSizeLimits();
        _this.redrawDataPointsOnlySize();
        _this._trails.run("resize");
      },
      "change:marker.color": function(evt, path) {
        if (!_this._readyOnce) return;
        //console.log("EVENT change:marker:color:palette");
        _this.redrawDataPointsOnlyColors();
        _this._trails.run("recolor");
      },
      // 'change:marker.color.palette': function(evt, path) {
      //   if(!_this._readyOnce) return;
      //   //console.log("EVENT change:marker:color:palette");
      //   _this.redrawDataPointsOnlyColors();
      //   _this._trails.run("recolor");
      // },
      "change:marker.opacitySelectDim": function() {
        _this.updateBubbleOpacity();
      },
      "change:marker.opacityRegular": function() {
        _this.updateBubbleOpacity();
        _this._trails.run("opacityHandler");
      },
      "change:ui.cursorMode": function() {
        const svg = _this.chartSvgAll;
        if (_this.model.ui.cursorMode === "plus") {
          svg.classed("vzb-zoomin", true);
          svg.classed("vzb-zoomout", false);
          svg.classed("vzb-panhand", false);
        } else if (_this.model.ui.cursorMode === "minus") {
          svg.classed("vzb-zoomin", false);
          svg.classed("vzb-zoomout", true);
          svg.classed("vzb-panhand", false);
        } else if (_this.model.ui.cursorMode === "hand") {
          svg.classed("vzb-zoomin", false);
          svg.classed("vzb-zoomout", false);
          svg.classed("vzb-panhand", true);
        } else {
          svg.classed("vzb-zoomin", false);
          svg.classed("vzb-zoomout", false);
          svg.classed("vzb-panhand", false);
        }
      },
      "change:marker.space": function() {
        if (_this.someHighlighted) {
          _this.model.marker.clearHighlighted();
        }
        if (_this.someSelected) {
          _this.model.marker.clearSelected();
        }
      },
      "ready": function() {
        // if(_this.model.marker.color.scaleType === 'time') {
        //   _this.model.marker.color.scale = null;
        //   utils.defer(function() {
        //     _this.trigger('ready');
        //   });
        // }
      }
    };

    this._super(config, context);

    this.xScale = null;
    this.yScale = null;
    this.sScale = null;
    this.cScale = null;


    this._trails = new Trail(this);
    this._panZoom = new PanZoom(this);
    this._export = new Exporter(this);
    this._export
      .prefix("vzb-bc-")
      .deleteClasses(["vzb-bc-bubbles-crop", "vzb-hidden", "vzb-bc-year", "vzb-bc-zoom-rect",
        "vzb-bc-projection-x", "vzb-bc-projection-y", "vzb-bc-axis-c-title"
      ]);
    this._labels = new Labels(this);
    this._labels.config({
      CSS_PREFIX: "vzb-bc",
      LABELS_CONTAINER_CLASS: "vzb-bc-labels",
      LINES_CONTAINER_CLASS: "vzb-bc-lines",
      LINES_CONTAINER_SELECTOR_PREFIX: "bubble-"
    });
  },



  /**
   * Executes right after the template is in place, but the model is not yet ready
   */
  readyOnce() {
    const _this = this;
    this._readyOnce = false;






    this.entityBubbles = null;
    //component events
    this.on("resize", () => {
      //console.log("EVENT: resize");
      //return if updatesize exists with error
      _this._trails.run("abortAnimation");
      if (_this.updateSize()) return;
      _this.updateMarkerSizeLimits();
      _this._labels.updateSize();
      (function(xMin, xMax, yMin, yMax) {
        _this._panZoom.zoomer.dontFeedToState = true;
        _this._panZoom.rerun(); // includes redraw data points and trail resize
        _this._panZoom.zoomToMaxMin(xMin, xMax, yMin, yMax, 0, true);
      })(_this._zoomedXYMinMax.axis_x.zoomedMin,
        _this._zoomedXYMinMax.axis_x.zoomedMax,
        _this._zoomedXYMinMax.axis_y.zoomedMin,
        _this._zoomedXYMinMax.axis_y.zoomedMax);
    });

    //keyboard listeners
    d3.select("body")
      .on("keydown", () => {
        if (_this.model.ui.cursorMode !== "arrow" && _this.model.ui.cursorMode !== "hand") return;
        if (d3.event.metaKey || d3.event.ctrlKey) _this.chartSvgAll.classed("vzb-zoomin", true);
      })
      .on("keyup", () => {
        if (_this.model.ui.cursorMode !== "arrow" && _this.model.ui.cursorMode !== "hand") return;
        if (!d3.event.metaKey && !d3.event.ctrlKey) _this.chartSvgAll.classed("vzb-zoomin", false);
      })
      //this is for the case when user would press ctrl and move away from the browser tab or window
      //keyup event would happen somewhere else and won't be captured, so zoomin class would get stuck
      .on("mouseenter", () => {
        if (_this.model.ui.cursorMode !== "arrow" && _this.model.ui.cursorMode !== "hand") return;
        if (!d3.event.metaKey && !d3.event.ctrlKey) _this.chartSvgAll.classed("vzb-zoomin", false);
      });

    this.root.on("resetZoom", () => {
      _this._panZoom.reset(null, 500);
    });

    this._panZoom.zoomSelection(this.bubbleContainerCrop);
    this.bubbleContainerCrop
      .call(this._panZoom.dragRectangle)
      .call(this._panZoom.zoomer)
      .on("dblclick.zoom", null)
      .on("mouseup", () => {
        _this.draggingNow = false;
      })
      .on("click", () => {
        const cursor = _this.model.ui.cursorMode;
        if (!d3.event.defaultPrevented && cursor !== "arrow" && cursor !== "hand") {
          _this._panZoom.zoomByIncrement(cursor, 500);
        }
      });

    this.TIMEDIM = this.model.time.getDimension();
    this.KEYS = utils.unique(this.model.marker._getAllDimensions({ exceptType: "time" }));
    this.KEY = this.KEYS.join(",");
    this.dataKeys = this.model.marker.getDataKeysPerHook();

    this.updateUIStrings();

    this.wScale = d3.scaleLinear()
      .domain(this.ui.datawarning.doubtDomain)
      .range(this.ui.datawarning.doubtRange);

    this._labels.readyOnce();

    _this._readyOnce = true;
  },

  _frameIsValid(frame) {
    return !(!frame
    || Object.keys(frame.axis_y).length === 0
    || Object.keys(frame.axis_x).length === 0
    || Object.keys(frame.size).length === 0);
  },

  ready() {
    const _this = this;
    this.KEYS = utils.unique(this.model.marker._getAllDimensions({ exceptType: "time" }));
    this.KEY = this.KEYS.join(",");
    this.dataKeys = this.model.marker.getDataKeysPerHook();

    this.updateUIStrings();
    const endTime = this.model.time.end;
    this.updateIndicators();
    this.updateTime();
    if (!_this.model.time.splash) {
      _this._trails.create();
    }
    this.model.marker.getFrame(this.model.time.value, (frame, time) => {
      // TODO: temporary fix for case when after data loading time changed on validation
      if (time.toString() != _this.model.time.value.toString()) {
        utils.defer(() => {
          _this.ready();
        });
        return;
      }
      if (!_this._frameIsValid(frame)) return utils.warn("ready: empty data received from marker.getFrame(). doing nothing");

      _this.frame = frame;
      _this.updateSize();
      _this.updateMarkerSizeLimits();
      _this.updateEntities();
      _this._labels.ready();
      _this.redrawDataPoints();
      _this.selectDataPoints();
      _this.updateBubbleOpacity();
      _this._updateDoubtOpacity();
      _this.zoomToMarkerMaxMin(); // includes redraw data points and trail resize
      if (!_this.model.time.splash) {
        _this._trails.run(["findVisible", "reveal", "opacityHandler"]);
      }
      if (_this.model.ui.adaptMinMaxZoom) _this._panZoom.expandCanvas();
    });
  },

  /*
   * Zoom to the min and max values given in the URL axes markers.
   */
  zoomToMarkerMaxMin() {
    /*
     * Reset just the zoom values without triggering a zoom event. This ensures
     * a clean zoom state for the subsequent zoom event.
     */
    this._panZoom.resetZoomState();

    const xAxis = this.model.marker.axis_x;
    const yAxis = this.model.marker.axis_y;

    const xDomain = xAxis.getScale().domain();
    const yDomain = yAxis.getScale().domain();

    /*
     * The axes may return null when there is no value given for the zoomed
     * min and max values. In that case, fall back to the axes' domain values.
     */
    const zoomedMinX = xAxis.getZoomedMin();
    const zoomedMaxX = xAxis.getZoomedMax();
    const zoomedMinY = yAxis.getZoomedMin();
    const zoomedMaxY = yAxis.getZoomedMax();

    //by default this will apply no transition and feed values back to state
    this._panZoom.zoomToMaxMin(zoomedMinX, zoomedMaxX, zoomedMinY, zoomedMaxY, 0, "don't feed these zoom values back to state");
  },



  frameChanged(frame, time) {
//    if (time.toString() != this.model.time.value.toString()) return; // frame is outdated
    const prevTime = this.time;
    this.frame = frame;
    this.updateTime();

    this._updateDoubtOpacity();
    this._trails.run("findVisible", null, null, [+prevTime, +time]);
    if (this.ui.adaptMinMaxZoom) {
      this._panZoom.expandCanvas();
    } else {
      this.redrawDataPoints();
    }
    this._trails.run("reveal", null, this.duration, [+prevTime, +time]);
    this.tooltipMobile.classed("vzb-hidden", true);
    this._reorderEntities();
  },


  /*
   * UPDATE ENTITIES:
   * Ideally should only update when show parameters change or data changes
   */
  updateEntities() {
    const _this = this;
    const dataKeys = this.dataKeys = this.model.marker.getDataKeysPerHook();
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    const TIMEDIM = this.TIMEDIM;

    const getKeys = function(prefix) {
      prefix = prefix || "";
      return _this.model.marker.getKeys()
        .map(d => {
          const pointer = Object.assign({}, d);
          //pointer[KEY] = d[KEY];
          pointer[TIMEDIM] = endTime;
          pointer.sortValue = _this.frame.size[utils.getKey(d, dataKeys.size)] || 0;
          pointer[KEY] = prefix + utils.getKey(d, KEYS);
          return pointer;
        })
        .sort((a, b) => b.sortValue - a.sortValue);
};

    // get array of GEOs, sorted by the size hook
    // that makes larger bubbles go behind the smaller ones
    const endTime = this.model.time.end;
    const markers = getKeys.call(this);
    this.model.marker.setVisible(markers);

    //unselecting bubbles with no data is used for the scenario when
    //some bubbles are selected and user would switch indicator.
    //bubbles would disappear but selection would stay
    if (!this.model.time.splash) {
      this.unselectBubblesWithNoData(markers);
    }
    this.entityBubbles = this.bubbleContainer.selectAll("circle.vzb-bc-entity")
      .data(this.model.marker.getVisible(), d => d[KEY]); // trails have not keys

    //exit selection
    this.entityBubbles.exit().remove();

    //enter selection -- init circles
    this.entityBubbles = this.entityBubbles.enter().append("circle")
      .attr("class", d => "vzb-bc-entity " + "bubble-" + d[KEY])
      .on("mouseover", (d, i) => {
        if (utils.isTouchDevice() || (_this.model.ui.cursorMode !== "arrow" && _this.model.ui.cursorMode !== "hand")) return;
        if (_this._labels.dragging) return;
        _this._bubblesInteract().mouseover(d, i);
      })
      .on("mouseout", (d, i) => {
        if (utils.isTouchDevice() || (_this.model.ui.cursorMode !== "arrow" && _this.model.ui.cursorMode !== "hand")) return;
        if (_this._labels.dragging) return;

        _this._bubblesInteract().mouseout(d, i);
      })
      .on("click", (d, i) => {
        if (utils.isTouchDevice() || (_this.model.ui.cursorMode !== "arrow" && _this.model.ui.cursorMode !== "hand")) return;

        _this._bubblesInteract().click(d, i);
      })
      .onTap((d, i) => {
        d3.event.stopPropagation();
        _this._bubblesInteract().click(d, i);
      })
      .onLongTap((d, i) => {
      })
      .merge(this.entityBubbles);

    this._reorderEntities();
  },

  unselectBubblesWithNoData(entities) {
    const _this = this;
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    if (!this.model.marker.select.length) return;

    const _select = [];
    const keys = entities.map(d => d[KEY]);

    this.model.marker.select.forEach(d => {
      if (keys.indexOf(utils.getKey(d, KEYS)) !== -1) _select.push(d);
});

    if (_select.length !== _this.model.marker.select.length) _this.model.marker.select = _select;
  },

  _reorderEntities() {
    const _this = this;
    const dataKeys = this.dataKeys;
    const KEY = this.KEY;
    this.bubbleContainer.selectAll(".vzb-bc-entity")
      .sort((a, b) => {
        const sizeA = _this.frame.size[utils.getKey(a, dataKeys.size)];
        const sizeB = _this.frame.size[utils.getKey(b, dataKeys.size)];

        if (typeof sizeA === "undefined" && typeof sizeB !== "undefined") return -1;
        if (typeof sizeA !== "undefined" && typeof sizeB === "undefined") return 1;
        if (sizeA != sizeB) return d3.descending(sizeA, sizeB);
        if (a[KEY] != b[KEY]) return d3.ascending(a[KEY], b[KEY]);
        if (typeof a.trailStartTime !== "undefined" || typeof b.trailStartTime !== "undefined") return typeof a.trailStartTime !== "undefined" ? -1 : 1; // only lines has trailStartTime
        if (typeof a.status !== "undefined" || typeof b.status !== "undefined") return typeof a.status !== "undefined" ? -1 : 1; // only trails has attribute status
        return d3.descending(sizeA, sizeB);
      });
  },




  /*
   * UPDATE TIME:
   * Ideally should only update when time or data changes
   */
  updateTime() {
    const _this = this;

    this.time_1 = this.time == null ? this.model.time.value : this.time;
    this.time = this.model.time.value;
    this.duration = this.model.time.playing && (this.time - this.time_1 > 0) ? this.model.time.delayAnimations : 0;
    this.year.setText(this.model.time.formatDate(this.time, "ui"), this.duration);
    this._updateForecastOverlay();
  },

  /*
   * RESIZE:
   * Executed whenever the container is resized
   */
  updateSize() {

    const { chartSvg } = this;
    const svgWidth = utils.px2num(chartSvg.style("width"));
    const svgHeight = utils.px2num(chartSvg.style("height"));
    const marginScaleH = (marginMin, ratio = 0) => marginMin + svgHeight * ratio;
    const marginScaleW = (marginMin, ratio = 0) => marginMin + svgWidth * ratio;
    
    const conceptPropsX = this.model.marker.axis_x.getConceptprops();
    const conceptPropsY = this.model.marker.axis_y.getConceptprops();

    const profiles = {
      small: {
    
      },
      medium: {

      },
      large: {

      }
    };

    const presentationProfileChanges = {
      medium: {

      },
      large: {

      }
    };
    
    const _this = this;

    this.profileConstants = this.getprofileConstants(profiles, presentationProfileChanges);
    const layoutProfile = this.getLayoutProfile();
    const containerWH = this.root.getVizWidthHeight();
    this.profileConstants.maxRadiusPx = Math.max(
      this.profileConstants.minRadiusPx,
      this.profileConstants.maxRadiusEm * utils.hypotenuse(containerWH.width, containerWH.height)
    );

    const margin = this.profileConstants.margin;
    const infoElHeight = this.profileConstants.infoElHeight;

    //labels
    _this._labels.setCloseCrossHeight(_this.profileConstants.infoElHeight * 1.2);
    _this._labels.setTooltipFontSize(_this.profileConstants.infoElHeight + "px");
    
    //stage
    this.height = (parseInt(this.element.style("height"), 10) - margin.top - margin.bottom) || 0;
    this.width = (parseInt(this.element.style("width"), 10) - margin.left * this.profileConstants.leftMarginRatio - margin.right) || 0;

    if (this.height <= 0 || this.width <= 0) {
      this.height = 0;
      this.width = 0;
      utils.warn("Bubble chart updateSize(): vizabi container is too little or has display:none");
    }

    //graph group is shifted according to margins (while svg element is at 100 by 100%)
    this.graphAll
      .attr("transform", "translate(" + (margin.left * this.profileConstants.leftMarginRatio) + "," + margin.top + ")");

    //this.yearEl.classed("vzb-hidden", !this.ui.timeInBackground);
    //this.year.resize(this.width, this.height);
    this.eventArea
      .attr("width", this.width)
      .attr("height", Math.max(0, this.height));

    //update scales to the new range
    if (this.model.marker.axis_y.scaleType !== "ordinal") {
      this.yScale.range(this._rangeBump([this.height, 0]));
    } else {
      this.yScale.rangePoints([this.height, 0], _this.profileConstants.padding).range();
    }
    if (this.model.marker.axis_x.scaleType !== "ordinal") {
      this.xScale.range(this._rangeBump([0, this.width]));
    } else {
      this.xScale.rangePoints([0, this.width], _this.profileConstants.padding).range();
    }

    //apply scales to axes and redraw
    this.yAxis.scale(this.yScale)
      .tickSizeInner(-this.width)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-this.width, 0)
      .labelerOptions({
        scaleType: this.model.marker.axis_y.scaleType,
        toolMargin: margin,
        limitMaxTickNumber: 6,
        bump: this.profileConstants.maxRadiusPx / 2,
        viewportLength: this.height,
        formatter: this.model.marker.axis_y.getTickFormatter(!this.ui.numberFormatSIPrefix)
      });

    this.xAxis.scale(this.xScale)
      .tickSizeInner(-this.height)
      .tickSizeOuter(0)
      .tickPadding(6)
      .tickSizeMinor(-this.height, 0)
      .labelerOptions({
        scaleType: this.model.marker.axis_x.scaleType,
        toolMargin: margin,
        bump: this.profileConstants.maxRadiusPx / 2,
        viewportLength: this.width,
        formatter: this.model.marker.axis_x.getTickFormatter(!this.ui.numberFormatSIPrefix)
      });


    this.bubbleContainerCropAll
      .attr("width", this.width)
      .attr("height", Math.max(0, this.height));

    this.labelsContainerCrop
      .attr("width", this.width)
      .attr("height", Math.max(0, this.height));

    this.xAxisElContainer
      .attr("width", this.width + 1)
      .attr("height", this.profileConstants.margin.bottom + this.height)
      .attr("y", -1)
      .attr("x", -1);
    this.xAxisEl
      .attr("transform", "translate(1," + (1 + this.height) + ")");

    this.yAxisElContainer
      .attr("width", this.profileConstants.margin.left + this.width)
      .attr("height", Math.max(0, this.height))
      .attr("x", -this.profileConstants.margin.left);
    this.yAxisEl
      .attr("transform", "translate(" + (this.profileConstants.margin.left - 1) + "," + 0 + ")");

    this.yAxisEl.call(this.yAxis);
    this.xAxisEl.call(this.xAxis);

    this.projectionX.attr("y1", _this.yScale.range()[0] + this.profileConstants.maxRadiusPx / 2);
    this.projectionY.attr("x2", _this.xScale.range()[0] - this.profileConstants.maxRadiusPx / 2);


    // reduce font size if the caption doesn't fit
    this._updateSTitle();
    this.sTitleEl
      .attr("transform", "translate(" + this.width + "," + 20 + ") rotate(-90)");

    if (layoutProfile !== "SMALL") {
      this.ySubTitleEl.select("text").attr("dy", infoElHeight * 0.6).text(this.strings.subtitle.Y);
      this.xSubTitleEl.select("text").attr("dy", -infoElHeight * 0.3).text(this.strings.subtitle.X);
      
      this.yTitleEl.select("text").text(this.strings.title_short.Y + " ")
        .append("tspan")
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
      this.xTitleEl.select("text").text(this.strings.title_short.X + " ")
        .append("tspan")
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
    } else {
      this.ySubTitleEl.select("text").text("");
      this.xSubTitleEl.select("text").text("");

      const yTitleText = this.yTitleEl.select("text").text(this.strings.title.Y);
      if (yTitleText.node().getBBox().width > this.width) yTitleText.text(this.strings.title_short.Y);
    
      const xTitleText = this.xTitleEl.select("text").text(this.strings.title.X);
      if (xTitleText.node().getBBox().width > this.width - 100) xTitleText.text(this.strings.title_short.X);      
    }

    const isRTL = this.model.locale.isRTL();
    this.ySubTitleEl
      .style("font-size", (infoElHeight * 0.8) + "px")
      .attr("transform", "translate(" + 0 + "," + 0 + ") rotate(-90)");
    this.xSubTitleEl
      .style("font-size", (infoElHeight * 0.8) + "px")
      .attr("transform", "translate(" + this.width + "," + this.height + ")");
  
    this.yTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (-margin.left - this.profileConstants.yAxisTitleBottomMargin)  + "," + (this.height * 0.5) + ") rotate(-90)"
        : 
        "translate(" + (isRTL ? this.width : 10 - this.profileConstants.margin.left) + ", -" + this.profileConstants.yAxisTitleBottomMargin + ")")

    this.xTitleEl
      .style("font-size", infoElHeight + "px")
      .attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (this.width * 0.5) + "," + (this.height + margin.bottom - this.profileConstants.xAxisTitleBottomMargin) + ")"
        :
        "translate(" + (isRTL ? this.width : 0) + "," + (this.height + margin.bottom - this.profileConstants.xAxisTitleBottomMargin) + ")");
    
    this.xAxisGroupsEl
      .style("font-size", infoElHeight * 0.8 + "px");

    if (this.yInfoEl.select("svg").node()) {
      const titleBBox = this.yTitleEl.node().getBBox();
      const t = utils.transform(this.yTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);
      const vTranslate = isRTL ? (t.translateY + infoElHeight * 1.4 + titleBBox.width * 0.5) : (t.translateY - infoElHeight * 0.4 - titleBBox.width * 0.5);

      this.yInfoEl
        .classed('vzb-hidden', !conceptPropsY.description && !conceptPropsY.sourceLink || this.services.layout.projector)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      this.yInfoEl.attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (t.translateX - infoElHeight * 0.8) + "," + vTranslate + ") rotate(-90)"
        :
        "translate(" + hTranslate + "," + (t.translateY - infoElHeight * 0.8) + ")");
    }

    if (this.xInfoEl.select("svg").node()) {
      const titleBBox = this.xTitleEl.node().getBBox();
      const t = utils.transform(this.xTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);

      this.xInfoEl
        .classed('vzb-hidden', !conceptPropsX.description && !conceptPropsX.sourceLink || this.services.layout.projector)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
      this.xInfoEl.attr("transform", "translate("
        + hTranslate + ","
        + (t.translateY - infoElHeight * 0.8) + ")");
    }

    this._resizeDataWarning();

    this.ui.margin.set("left", margin.left * this.profileConstants.leftMarginRatio, false, false);
  },


  _updateDecorations(duration) {
    const _this = this;
    
    // x axis groups used for incomes
    const showxAxisGroups = this.ui.decorations.xAxisGroups 
      && this.ui.decorations.xAxisGroups[this.model.marker.axis_x.which] 
      && this.ui.decorations.enabled
      && this.getLayoutProfile() !== "SMALL";
    
    this.xAxisGroupsEl.classed("vzb-invisible", !showxAxisGroups);
    if (showxAxisGroups) {
      const axisGroupsData = this.ui.decorations.xAxisGroups[this.model.marker.axis_x.which];
      let xAxisGroups = this.xAxisGroupsEl.selectAll(".vzb-bc-x-axis-group").data(axisGroupsData);
      
      xAxisGroups.exit().remove();
      xAxisGroups = xAxisGroups.enter().append("g").attr("class", "vzb-bc-x-axis-group")
        .each(function(){
          const view = d3.select(this);
          view.append("text").attr("class", "vzb-bc-x-axis-group-line").text("◆").style("text-anchor","middle");
          view.append("text").attr("class", "vzb-bc-x-axis-group-text");
        })
        .merge(xAxisGroups);
      
      const xAxisGroups_calcs = [];
      let useShorterLabels = false;
      
      // first pass: calculate label text sizes and margins
      xAxisGroups.each(function(d, i){
        const view = d3.select(this);
        
        const text = view.select("text.vzb-bc-x-axis-group-text")
          .text(_this.localise(d.label));
        
        const calcs = {min: d.min, max: d.max};
        
        calcs.textHeight = text.node().getBBox().height;
        calcs.textWidth = text.node().getBBox().width;
        
        calcs.boundaryMinX_px = _this.xScale(d.min || d.min === 0? d.min : d3.min(_this.xScale.domain()));
        calcs.boundaryMaxX_px = _this.xScale(d.max || d.max === 0? d.max : d3.max(_this.xScale.domain()));
        
        calcs.centerX_px = (calcs.boundaryMinX_px + calcs.boundaryMaxX_px) / 2;
        calcs.marginX_px = (Math.abs(calcs.boundaryMinX_px - calcs.boundaryMaxX_px) - calcs.textWidth) / 2;
        
        if (calcs.marginX_px - calcs.textHeight < 0) useShorterLabels = true;
        
        xAxisGroups_calcs[i] = calcs;
      });
      
      // second pass: if at least one of labels doesn't fit, switch to compact mode and recalculate text sizes and margins
      if (useShorterLabels) {
        xAxisGroups.each(function(d, i){
          const view = d3.select(this);

          const text = view.select("text.vzb-bc-x-axis-group-text")
            .text(_this.localise(d.label_short));

          const calcs = xAxisGroups_calcs[i];

          calcs.textWidth = text.node().getBBox().width;
          calcs.marginX_px = (Math.abs(calcs.boundaryMinX_px - calcs.boundaryMaxX_px) - calcs.textWidth) / 2;

          xAxisGroups_calcs[i] = calcs;
        });
      }
      
      // third pass: actually put labels in places
      xAxisGroups.each(function(d, i){
        const view = d3.select(this);
        
        const isFirst = (i == 0);
        const isLast = (i == xAxisGroups_calcs.length - 1);
        const calcs = xAxisGroups_calcs[i];
        const minMargin = calcs.textHeight/4;
        let x = calcs.centerX_px;
        
        if (isFirst) x = xAxisGroups_calcs[i+1].boundaryMinX_px - Math.max(xAxisGroups_calcs[i+1].marginX_px, minMargin);
        if (isLast) x = xAxisGroups_calcs[i-1].boundaryMaxX_px + Math.max(xAxisGroups_calcs[i-1].marginX_px, minMargin);
        
        const text = view.select("text.vzb-bc-x-axis-group-text")
          .style("text-anchor", isFirst ? "end" : isLast ? "start" : "middle")
          .transition()
          .duration(duration || 0)
          .attr("dy", "-0.2em")
          .attr("y", calcs.textHeight)
          .attr("x", x);
        
        view.select("text.vzb-bc-x-axis-group-line")
          .classed("vzb-invisible", isLast)
          .transition()
          .duration(duration || 0)
          .attr("dy", "-0.2em")
          .attr("y", calcs.textHeight * 0.9)
          .attr("x", calcs.boundaryMaxX_px);
      });
      
      xAxisGroups.select("text.vzb-bc-x-axis-group-text").on("mouseenter", function(d, i) {
        const calcs = xAxisGroups_calcs[i];
        const parentView = d3.select(this.parentNode);
  
        d3.select(this).attr("font-weight", "bold");
        parentView.append("rect").lower()
          .attr("x", calcs.boundaryMinX_px)
          .attr("width", calcs.boundaryMaxX_px - calcs.boundaryMinX_px)
          .attr("y", -_this.profileConstants.margin.top)
          .attr("height", _this.height + _this.profileConstants.margin.top)
  
        if (calcs.min || calcs.min === 0) parentView.append("line").lower()
          .attr("x1", calcs.boundaryMinX_px)
          .attr("x2", calcs.boundaryMinX_px)
          .attr("y1", -_this.profileConstants.margin.top)
          .attr("y2", _this.height)
  
        if (calcs.max || calcs.max === 0) parentView.append("line").lower()
          .attr("x1", calcs.boundaryMaxX_px)
          .attr("x2", calcs.boundaryMaxX_px)
          .attr("y1", -_this.profileConstants.margin.top)
          .attr("y2", _this.height)
  
      }).on("mouseleave", function(d, i) {
        const parentView = d3.select(this.parentNode);
  
        d3.select(this).attr("font-weight", null);
        parentView.selectAll("rect").remove();
        parentView.selectAll("line").remove();
      });
    }    
    
    // diagonal line that is used when the same idicator ID is used for both axis X and Y
    const showLineEqualXY = 
      this.model.marker.axis_x.which == this.model.marker.axis_y.which 
      && this.ui.decorations.enabled
      && this.getLayoutProfile() !== "SMALL";
    
    this.lineEqualXY.classed("vzb-invisible", !showLineEqualXY);
    if (showLineEqualXY) {
      const min = d3.min(this.yScale.domain().concat(this.xScale.domain()));
      const max = d3.max(this.yScale.domain().concat(this.xScale.domain()));

      this.lineEqualXY
        .transition()
        .duration(duration || 0)
        .attr("y1", this.yScale(min))
        .attr("y2", this.yScale(max))
        .attr("x1", this.xScale(min))
        .attr("x2", this.xScale(max));
    }
  },



  redrawDataPointsOnlyColors() {
    const _this = this;
    if (!this.entityBubbles) return utils.warn("redrawDataPointsOnlyColors(): no entityBubbles defined. likely a premature call, fix it!");

    let valuesNow;
    const dataKeys = this.dataKeys = this.model.marker.getDataKeysPerHook();
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    

    let time = this.model.time.value;

    if (this.ui.lockNonSelected && this.someSelected) {
      time = this.model.time.parse("" + this.ui.lockNonSelected);
    }
    this.model.marker.getFrame(time, valuesLocked => {
      if (!_this._frameIsValid(valuesLocked)) return utils.warn("redrawDataPointsOnlyColor: empty data received from marker.getFrame(). doing nothing");

      valuesNow = _this.frame;
      _this.entityBubbles.each(function(d, index) {

        const selected = d.isSelected;

        const valueC = selected ? valuesNow.color[utils.getKey(d, dataKeys.color)] : valuesLocked.color[utils.getKey(d, dataKeys.color)];

        const scaledC = valueC != null ? _this.cScale(valueC) : _this.COLOR_WHITEISH;

        d3.select(this).style("fill", scaledC);

        //update lines of labels
        if (selected) {

          const select = utils.find(_this.model.marker.select, f => utils.getKey(f, KEYS) == d[KEY]);

          const trailStartTime = _this.model.time.parse("" + select.trailStartTime);

          _this.model.marker.getFrame(trailStartTime, valuesTrailStart => {
            if (!valuesTrailStart) return utils.warn("redrawDataPointsOnlyColor: empty data received from marker.getFrames(). doing nothing");

            const cache = {};
            if (!_this.ui.trails || trailStartTime - _this.time == 0) {
              cache.scaledC0 = scaledC;
            } else {
              const valueC = valuesTrailStart.color[utils.getKey(d, dataKeys.color)];
              cache.scaledC0 = valueC != null ? _this.cScale(valueC) : _this.COLOR_WHITEISH;
            }

            _this._labels.updateLabelOnlyColor(d, index, cache);

          });
        }
      });
    });

  },

  redrawDataPointsOnlySize() {
    const _this = this;

    let valuesNow;
    const dataKeys = this.dataKeys = this.model.marker.getDataKeysPerHook();
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    

    let time = this.model.time.value;

    if (this.ui.lockNonSelected && this.someSelected) {
      time = this.model.time.parse("" + this.ui.lockNonSelected);
    }
    this.model.marker.getFrame(time, valuesLocked => {
      if (!_this._frameIsValid(valuesLocked)) return utils.warn("redrawDataPointsOnlySize: empty data received from marker.getFrame(). doing nothing");

      valuesNow = _this.frame;
      _this.entityBubbles.each(function(d, index) {

        const selected = d.isSelected;

        const valueS = selected ? valuesNow.size[utils.getKey(d, dataKeys.size)] : valuesLocked.size[utils.getKey(d, dataKeys.size)];
        if (valueS == null) return;

        const scaledS = utils.areaToRadius(_this.sScale(valueS));
        d3.select(this).attr("r", scaledS);

        //update lines of labels
        if (selected) {

          const select = utils.find(_this.model.marker.select, f => utils.getKey(f, KEYS) == d[KEY]);

          const trailStartTime = _this.model.time.parse("" + select.trailStartTime);

          _this.model.marker.getFrame(trailStartTime, valuesTrailStart => {
            if (!valuesTrailStart) return utils.warn("redrawDataPointsOnlySize: empty data received from marker.getFrames(). doing nothing");

            const cache = {};
            if (!_this.ui.trails || trailStartTime - _this.time == 0) {
              cache.scaledS0 = scaledS;
            } else {
              cache.scaledS0 = utils.areaToRadius(_this.sScale(valuesTrailStart.size[utils.getKey(d, dataKeys.size)]));
            }

            _this._labels.updateLabelOnlyPosition(d, index, cache);

          });
        }
      });
    });
  },

  /*
   * REDRAW DATA POINTS:
   * Here plotting happens
   * debouncing to improve performance: events might trigger it more than 1x
   */
  redrawDataPoints(duration) {
    const _this = this;
    const KEY = this.KEY;
    if (duration == null) duration = _this.duration;

    if (this.ui.lockNonSelected && this.someSelected) {
      const time = this.model.time.parse("" + this.ui.lockNonSelected);

      //get values for locked frames
      this.model.marker.getFrame(time, lockedFrame => {
        if (!lockedFrame) return utils.warn("redrawDataPoints: empty data received from marker.getFrames(). doing nothing");

        // each bubble
        _this.entityBubbles.each(function(d, index) {
          const frame = d.isSelected ? _this.frame : lockedFrame;
          _this._updateBubble(d, frame, index, d3.select(this), duration);
        });
      });
    } else {
      // each bubble
      _this.entityBubbles.each(function(d, index) {
        _this._updateBubble(d, _this.frame, index, d3.select(this), duration);
      });
    }

    this._updateDecorations(duration);
  },

  //redraw Data Points
  _updateBubble(d, values, index, view, duration) {
    const _this = this;
    const dataKeys = this.dataKeys;
    
    let showhide = false;

    const valueY = values.axis_y[utils.getKey(d, dataKeys.axis_y)];
    const valueX = values.axis_x[utils.getKey(d, dataKeys.axis_x)];
    const valueS = values.size[utils.getKey(d, dataKeys.size)];
    const valueL = values.label[utils.getKey(d, dataKeys.label)];
    const valueC = values.color[utils.getKey(d, dataKeys.color)];
    const valueLST = values.size_label[utils.getKey(d, dataKeys.size_label)];

    // check if fetching data succeeded
    if (!valueY && valueY !== 0 || !valueX && valueX !== 0 || !valueS && valueS !== 0) {
      // if entity is missing data it should hide
      if (!d.hidden) {
        d.hidden = true;
        showhide = true;
      }

      if (showhide) {
        if (duration) {
          const opacity = view.style("opacity");
          view.transition().duration(duration).ease(d3.easeExp)
            .style("opacity", 0)
            .on("end", () => {
              //to avoid transition from null state add class with a delay
              view.classed("vzb-invisible", d.hidden);
              view.style("opacity", opacity);
            })
            .on("interrupt", () => {
              view.classed("vzb-invisible", d.hidden);
              view.style("opacity", opacity);
            });
        } else {
          //immediately hide the bubble
          view.classed("vzb-invisible", d.hidden);
        }
      }
    } else {
      if (d.hidden || view.classed("vzb-invisible")) {
        d.hidden = false;
        showhide = true;
      }


      // if entity has all the data we update the visuals
      const scaledS = utils.areaToRadius(_this.sScale(valueS));

      view.style("fill", valueC != null ? _this.cScale(valueC) : _this.COLOR_WHITEISH);

      if (duration) {
        if (showhide) {
          const opacity = view.style("opacity");
          view.classed("vzb-invisible", d.hidden);
          view.style("opacity", 0)
            .attr("cy", _this.yScale(valueY))
            .attr("cx", _this.xScale(valueX))
            .attr("r", scaledS)
            .transition().duration(duration).ease(d3.easeExp)
            .style("opacity", opacity)
            .on("interrupt", () => {
              view.style("opacity", opacity);
            });
        } else {
          view.transition().duration(duration).ease(d3.easeLinear)
            .attr("cy", _this.yScale(valueY))
            .attr("cx", _this.xScale(valueX))
            .attr("r", scaledS);
        }

      } else {

        //interrupt the ongoing transition and immediately do the visual updates
        view.interrupt()
          .attr("cy", _this.yScale(valueY))
          .attr("cx", _this.xScale(valueX))
          .attr("r", scaledS)
          .transition();

        //show entity if it was hidden
        if (showhide) view.classed("vzb-invisible", d.hidden);
      }

      if (this.model.time.record) _this._export.write({
        type: "circle",
        id: d[KEY],
        time: this.model.time.value.getUTCFullYear(),
        fill: valueC != null ? _this.cScale(valueC) : _this.COLOR_WHITEISH,
        cx: _this.xScale(valueX),
        cy: _this.yScale(valueY),
        r: scaledS
      });

    } // data exists
    _this._updateLabel(d, index, values, valueX, valueY, valueS, valueC, valueL, valueLST, duration, showhide);
  },

  _updateLabel(d, index, values, valueX, valueY, valueS, valueC, valueL, valueLST, duration, showhide) {
    const _this = this;
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    
    // only for selected markers
    if (d.isSelected) {

      const cache = {};

      const select = utils.find(_this.model.marker.select, f => utils.getKey(f, KEYS) == d[KEY]);

      const time = _this.model.time.formatDate(_this.time);
      if (!this.ui.trails || select.trailStartTime == time || select.trailStartTime == null) {
        if (this.ui.trails && select.trailStartTime == null) select.trailStartTime = time; // need only when trailStartTime == null

        cache.labelX0 = valueX;
        cache.labelY0 = valueY;
        cache.scaledC0 = valueC != null ? _this.cScale(valueC) : _this.COLOR_WHITEISH,
        cache.scaledS0 = (valueS || valueS === 0) ? utils.areaToRadius(_this.sScale(valueS)) : null;
      }

      const trailStartTime = _this.model.time.parse("" + select.trailStartTime);

      const labelText = _this._getLabelText(values, d, select.trailStartTime);

      if (showhide && d.hidden && _this.ui.trails && trailStartTime && (trailStartTime < _this.time)) showhide = false;
      if (d.hidden && !_this.ui.trails) showhide = true;

      this._labels.updateLabel(d, index, cache, valueX, valueY, valueS, valueC, labelText, valueLST, duration, showhide);

    }
  },

  _getLabelText(values, d, time) {
    return this.model.marker.getCompoundLabelText(d, values)
      + (this.ui.timeInTrails && time && (this.model.time.start - this.model.time.end !== 0) ? " " + time : "");
  },
  
  _updateForecastOverlay() {
    this.forecastOverlay.classed("vzb-hidden", (this.model.time.value <= this.model.time.endBeforeForecast) || !this.model.time.endBeforeForecast || !this.ui.showForecastOverlay);
  },

  _setTooltip(tooltipText, x, y, s, c, d) {
    if (tooltipText) {
      const labelValues = {};
      if (d) {
        const dataKeys = this.dataKeys;
        const values = this.frame;
        labelValues.valueY = values.axis_y[utils.getKey(d, dataKeys.axis_y)];
        labelValues.valueX = values.axis_x[utils.getKey(d, dataKeys.axis_x)];
        labelValues.valueS = values.size[utils.getKey(d, dataKeys.size)];
        labelValues.valueC = values.color[utils.getKey(d, dataKeys.color)];
        labelValues.valueLST = values.size_label[utils.getKey(d, dataKeys.size_label)];
        labelValues.labelText = this._getLabelText(values, d, this.model.time.formatDate(this.time));
      }

      const tooltipCache = {};
      tooltipCache.labelX0 = this.xScale.invert(x);
      tooltipCache.labelY0 = this.yScale.invert(y);
      tooltipCache.scaledS0 = s;
      tooltipCache.scaledC0 = null;

      this._labels.setTooltip(d, tooltipText, tooltipCache, labelValues);
    } else {
      this._labels.setTooltip();
    }
  },

  _formatSTitleValues(titleS, titleC) {
    const _this = this;
    const unitS = this.strings.unit.S;
    const unitC = this.strings.unit.C;

    const formatterS = this.model.marker.size.getTickFormatter(!this.ui.numberFormatSIPrefix);
    const formatterC = this.model.marker.color.getTickFormatter(!this.ui.numberFormatSIPrefix);

    //resolve labels for colors via the color legend
    if (this.model.marker.color.isDiscrete() && this.model.marker.color.use !== "constant" && titleC && this.model.marker.color.getColorlegendMarker()) {
      titleC = this.model.marker.color.getColorlegendMarker().label.getItems()[titleC] || "";
    }

    return [formatterS(titleS) + " " + unitS,
      titleC || titleC === 0 ? formatterC(titleC) + " " + unitC : this.localise("hints/nodata")];
  },


  selectDataPoints() {
    const _this = this;
    const KEY = this.KEY;

    if (utils.isTouchDevice()) {
      _this.model.marker.clearHighlighted();
      _this._labels.showCloseCross(null, false);
    } else {
      //hide tooltip
      _this._setTooltip();
      _this._setBubbleCrown();
    }

    utils.forEach(_this.entityBubbles.data(), d => {
      d.isSelected = _this.model.marker.isSelected(d);
    });

    _this.someSelected = (_this.model.marker.select.length > 0);
    _this.nonSelectedOpacityZero = false;
  },

  _setBubbleCrown(x, y, r, glow, skipInnerFill) {
    if (x != null) {
      this.bubbleCrown.classed("vzb-hidden", false);
      this.bubbleCrown.select(".vzb-crown")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", r)
        .attr("fill", skipInnerFill ? "none" : glow);
      this.bubbleCrown.selectAll(".vzb-crown-glow")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", r + 10)
        .attr("stroke", glow);

    } else {
      this.bubbleCrown.classed("vzb-hidden", true);
    }

  },

  /*
   * Shows and hides axis projections
   */
  _axisProjections(d) {
    const _this = this;
    const TIMEDIM = this.TIMEDIM;
    const dataKeys = this.dataKeys;

    if (d != null) {

      this.model.marker.getFrame(d[TIMEDIM], values => {
        const valueY = values.axis_y[utils.getKey(d, dataKeys.axis_y)];
        const valueX = values.axis_x[utils.getKey(d, dataKeys.axis_x)];
        const valueS = values.size[utils.getKey(d, dataKeys.size)];
        const radius = utils.areaToRadius(_this.sScale(valueS));

        if (!valueY && valueY !== 0 || !valueX && valueX !== 0 || !valueS && valueS !== 0) return;

        if (_this.ui.whenHovering.showProjectionLineX
          && _this.xScale(valueX) > 0 && _this.xScale(valueX) < _this.width
          && (_this.yScale(valueY) + radius) < _this.height) {
          _this.projectionX
            .style("opacity", 1)
            .attr("y2", _this.yScale(valueY) + radius)
            .attr("x1", _this.xScale(valueX))
            .attr("x2", _this.xScale(valueX));
        }

        if (_this.ui.whenHovering.showProjectionLineY
          && _this.yScale(valueY) > 0 && _this.yScale(valueY) < _this.height
          && (_this.xScale(valueX) - radius) > 0) {
          _this.projectionY
            .style("opacity", 1)
            .attr("y1", _this.yScale(valueY))
            .attr("y2", _this.yScale(valueY))
            .attr("x1", _this.xScale(valueX) - radius);
        }

        if (_this.ui.whenHovering.higlightValueX) _this.xAxisEl.call(
          _this.xAxis.highlightValue(valueX)
        );

        if (_this.ui.whenHovering.higlightValueY) _this.yAxisEl.call(
          _this.yAxis.highlightValue(valueY)
        );
      });

    } else {

      this.projectionX.style("opacity", 0);
      this.projectionY.style("opacity", 0);
      this.xAxisEl.call(this.xAxis.highlightValue("none"));
      this.yAxisEl.call(this.yAxis.highlightValue("none"));

    }

  },

  /*
   * Highlights all hovered bubbles
   */
  highlightDataPoints() {
    const _this = this;
    const TIMEDIM = this.TIMEDIM;
    const dataKeys = this.dataKeys;
    const KEYS = this.KEYS;
    const KEY = this.KEY;
    
    this.someHighlighted = (this.model.marker.highlight.length > 0);

    this.updateBubbleOpacity();

    if (this.model.marker.highlight.length === 1) {
      const d = utils.clone(this.model.marker.highlight[0]);
      d[KEY] = utils.getKey(d, KEYS);
      d.isSelected = _this.model.marker.isSelected(d);

      if (_this.ui.lockNonSelected && _this.someSelected && !d.isSelected) {
        d[TIMEDIM] = _this.model.time.parse("" + _this.ui.lockNonSelected);
      } else {
        d[TIMEDIM] = _this.model.time.parse("" + d.trailStartTime) || _this.time;
      }

      _this.model.marker.getFrame(d[TIMEDIM], values => {
        if (!values) return;
        const x = _this.xScale(values.axis_x[utils.getKey(d, dataKeys.axis_x)]);
        const y = _this.yScale(values.axis_y[utils.getKey(d, dataKeys.axis_y)]);
        const s = utils.areaToRadius(_this.sScale(values.size[utils.getKey(d, dataKeys.size)]));
        const c = values.color[utils.getKey(d, dataKeys.color)] != null ? _this.cScale(values.color[utils.getKey(d, dataKeys.color)]) : _this.COLOR_WHITEISH;
        let entityOutOfView = false;

        const titles = _this._formatSTitleValues(values.size[utils.getKey(d, dataKeys.size)], values.color[utils.getKey(d, dataKeys.color)]);
        _this._updateSTitle(titles[0], titles[1]);
        if (x + s < 0 || x - s > _this.width || y + s < 0 || y - s > _this.height) {
          entityOutOfView = true;
        }

        //show tooltip
        let text = "";
        let hoverTrail = false;
        if (d.isSelected && _this.ui.trails) {
          text = _this.model.time.formatDate(_this.time);
          const selectedData = utils.find(_this.model.marker.select, f => utils.getKey(f, KEYS) == d[KEY]);
          hoverTrail = text !== selectedData.trailStartTime && !d3.select(d3.event.target).classed("bubble-" + d[KEY]);
          text = text !== selectedData.trailStartTime && _this.time === d[TIMEDIM] ? text : "";
        } else {
          text = d.isSelected ? "" : _this._getLabelText(values, d);
        }

        _this._labels.highlight(null, false);
        _this._labels.highlight(d, true);
        if (d.isSelected) {
          const skipCrownInnerFill = !d.trailStartTime || d.trailStartTime == _this.model.time.formatDate(_this.time);
          _this._setBubbleCrown(x, y, s, c, skipCrownInnerFill);
        }

        if (!entityOutOfView && !hoverTrail) {
          _this._axisProjections(d);
        }

        //set tooltip and show axis projections
        if (text && !entityOutOfView && !hoverTrail) {
          _this._setTooltip(text, x, y, s + 3, c, d);
        }

        const selectedData = utils.find(_this.model.marker.select, f => utils.getKey(f, KEYS) == d[KEY]);
        if (selectedData) {
          const clonedSelectedData = utils.clone(selectedData);
          //change opacity to OPACITY_HIGHLT = 1.0;
          clonedSelectedData.opacity = 1.0;
          _this._trails.run(["opacityHandler"], clonedSelectedData);
        }
      });
    } else {
      this._axisProjections();
      this._trails.run(["opacityHandler"]);
      //hide tooltip
      _this._updateSTitle();
      this._setTooltip();
      this._setBubbleCrown();
      this._labels.highlight(null, false);
    }

  },

  _blinkSuperHighlighted() {
    this.entityBubbles
      .classed("vzb-super-highlighted", d => this.model.marker.isSuperHighlighted(d));
  },

  updateBubbleOpacity(duration) {
    const _this = this;
    //if(!duration)duration = 0;

    const OPACITY_HIGHLT = 1.0;
    const OPACITY_HIGHLT_DIM = this.model.marker.opacityHighlightDim;
    const OPACITY_SELECT = 1.0;
    const OPACITY_REGULAR = this.model.marker.opacityRegular;
    const OPACITY_SELECT_DIM = this.model.marker.opacitySelectDim;

    this.entityBubbles
    //.transition().duration(duration)
      .style("opacity", d => {

        if (_this.someHighlighted) {
          //highlight or non-highlight
          if (_this.model.marker.isHighlighted(d)) return OPACITY_HIGHLT;
        }

        if (_this.someSelected) {
          //selected or non-selected
          return d.isSelected ? OPACITY_SELECT : OPACITY_SELECT_DIM;
        }

        if (_this.someHighlighted) return OPACITY_HIGHLT_DIM;

        return OPACITY_REGULAR;
      });


    const nonSelectedOpacityZero = _this.model.marker.opacitySelectDim < 0.01;

    // when pointer events need update...
    if (nonSelectedOpacityZero != this.nonSelectedOpacityZero) {
      this.entityBubbles.style("pointer-events", d => (!_this.someSelected || !nonSelectedOpacityZero || d.isSelected) ?
        "visible" : "none");
    }

    this.nonSelectedOpacityZero = _this.model.marker.opacitySelectDim < 0.01;
  }

};

//export default BubbleChart;


export const VizabiBubbleChart = decorate(_VizabiBubbleChart, {
  "MDL": computed
});