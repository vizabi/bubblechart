import {
  Chart,
  Icons,
  Utils,
  LegacyUtils as utils,
  axisSmart,
  Labels,
  DynamicBackground
} from "VizabiSharedComponents";
import PanZoom from "./panzoom";

import BCDecorations from "./decorations.js";

import {
  runInAction
} from "mobx";

import {decorate, computed, observable, action} from "mobx";

const {ICON_QUESTION} = Icons;
const COLOR_WHITEISH = "rgb(253, 253, 253)";

const marginScaleH = (marginMin, ratio = 0) => height => marginMin + height * ratio;
const marginScaleW = (marginMin, ratio = 0) => width => marginMin + width * ratio;

function isTrailBubble(d){
  return !!d[Symbol.for("trailHeadKey")];
}

const MAX_RADIUS_EM = 0.05;

const PROFILE_CONSTANTS = (width, height) => ({
  SMALL: {
    margin: { top: 30, bottom: 35, left: 30, right: 10},
    leftMarginRatio: 1,
    padding: 2,
    minRadiusPx: 0.5,
    maxRadiusPx: Math.max(0.5, MAX_RADIUS_EM * utils.hypotenuse(width, height)),
    infoElHeight: 16,
    yAxisTitleBottomMargin: 6,
    xAxisTitleBottomMargin: 4
  },
  MEDIUM: {
    margin: { top: 15, bottom: 40, left: 40, right: 15},
    leftMarginRatio: 1.6,
    padding: 2,
    minRadiusPx: 1,
    maxRadiusPx: Math.max(0.5, MAX_RADIUS_EM * utils.hypotenuse(width, height)),
    infoElHeight: 20,
    yAxisTitleBottomMargin: 3,
    xAxisTitleBottomMargin: 4
  },
  LARGE: {
    margin: { top: 15, bottom: marginScaleH(30, 0.03)(height), left: marginScaleW(31, 0.015)(width), right: 20},
    leftMarginRatio: 1.8,
    padding: 2,
    minRadiusPx: 1,
    maxRadiusPx: Math.max(0.5, MAX_RADIUS_EM * utils.hypotenuse(width, height)),
    infoElHeight: 22,
    yAxisTitleBottomMargin: 3,//marginScaleH(4, 0.01)(height),
    xAxisTitleBottomMargin: marginScaleH(0, 0.01)(height),
    hideSTitle: true
  }
});

const PROFILE_CONSTANTS_FOR_PROJECTOR = (width, height) => ({
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
class _VizabiBubbleChart extends Chart {

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
          </g>
      </svg>
      <svg class="vzb-bubblechart-svg vzb-bubblechart-svg-main vzb-export">
          <g class="vzb-bc-graph">
              <g class="vzb-bc-axis-x-title"><text></text></g>
              <g class="vzb-bc-axis-x-info vzb-noexport"></g>

              <g class="vzb-bc-axis-y-title"><text></text></g>
              <g class="vzb-bc-axis-y-info vzb-noexport"></g>
              <svg class="vzb-bc-bubbles-crop">
                  <g class="vzb-zoom-selection"></g>
                  <rect class="vzb-bc-eventarea"></rect>
                  <g class="vzb-bc-trails"></g>
                  <g class="vzb-bc-bubbles"></g>
                  <rect class="vzb-bc-forecastoverlay vzb-hidden" x="0" y="0" width="100%" height="100%" fill="url(#vzb-bc-pattern-lines)" pointer-events='none'></rect>
              </svg>

              <g class="vzb-bc-axis-y-subtitle"><text></text></g>
              <g class="vzb-bc-axis-x-subtitle"><text></text></g>
              <g class="vzb-bc-axis-s-title"><text></text></g>
              <g class="vzb-bc-axis-c-title"><text></text></g>

              <rect class="vzb-bc-zoom-rect"></rect>
          </g>
          <g class="vzb-datawarning-button vzb-noexport"></g>
      </svg>
      <svg class="vzb-bubblechart-svg vzb-bubblechart-svg-front vzb-export">
          <g class="vzb-bc-graph">
              <svg class="vzb-bc-bubbles-crop">
                  <g class="vzb-bc-decorations">
                      <line class="vzb-bc-line-equal-xy vzb-invisible"></line>
                      <g class="vzb-bc-x-axis-groups"></g>
                  </g>   
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
        trailsContainer: graph.select(".vzb-bc-trails"),
        bubbleContainer: graph.select(".vzb-bc-bubbles"),
        bubbleContainerCrop: graph.select(".vzb-bc-bubbles-crop"),
        zoomSelection: graph.select(".vzb-zoom-selection"),
      })
    );
    this.DOM.chartSvgFront.select(".vzb-bc-graph").call(graphFront => {
      Object.assign(this.DOM, {
        graphFront: graphFront,
        labelsContainer: graphFront.select(".vzb-bc-labels"),
        labelsContainerCrop: graphFront.select(".vzb-bc-labels-crop"),
        linesContainer: graphFront.select(".vzb-bc-lines"),
        bubbleCrown: graphFront.select(".vzb-bc-bubble-crown"),
        decorationsEl: graphFront.select(".vzb-bc-decorations"),
      });
      this.DOM.lineEqualXY = this.DOM.decorationsEl.select(".vzb-bc-line-equal-xy");
      this.DOM.xAxisGroupsEl = this.DOM.decorationsEl.select(".vzb-bc-x-axis-groups");
    });
    this.DOM.chartSvgBack.select(".vzb-bc-graph").call(graphBack => {
      Object.assign(this.DOM, {
        yAxisElContainer: graphBack.select(".vzb-bc-axis-y"),
        xAxisElContainer: graphBack.select(".vzb-bc-axis-x"),
        yearEl: graphBack.select(".vzb-bc-year"),
        projectionX: graphBack.select(".vzb-bc-projection-x"),
        projectionY: graphBack.select(".vzb-bc-projection-y"),
      });
      this.DOM.yAxisEl = this.DOM.yAxisElContainer.select("g");
      this.DOM.xAxisEl = this.DOM.xAxisElContainer.select("g");
    });

    //set filter
    this.DOM.bubbleCrown.selectAll(".vzb-crown-glow")
      .attr("filter", "url(" + location.pathname + "#vzb-glow-filter)");

    this._year = this.findChild({type: "DynamicBackground"});
    this._labels = this.findChild({type: "Labels"});
    this._panZoom = new PanZoom(this);    
    this.decorations = new BCDecorations(this);
    this._initInfoElements();
  
    this.scrollableAncestor = utils.findScrollableAncestor(this.element);

    this.xAxis = axisSmart("bottom");
    this.yAxis = axisSmart("left");

    this.axisTitleComplimentStrings = {Y: "", X: "", S: "", C: ""};

    this.isCanvasPreviouslyExpanded = false;
    this.draggingNow = null;

    this.hoverBubble = false;

    const _this = this;
    //keyboard listeners
    d3.select("body")
      .on("keydown", (event) => {
        if (_this.ui.cursorMode !== "arrow" && _this.ui.cursorMode !== "hand") return;
        if (event.metaKey || event.ctrlKey) _this.DOM.chartSvgAll.classed("vzb-zoomin", true);
      })
      .on("keyup", (event) => {
        if (_this.ui.cursorMode !== "arrow" && _this.ui.cursorMode !== "hand") return;
        if (!event.metaKey && !event.ctrlKey) _this.DOM.chartSvgAll.classed("vzb-zoomin", false);
      })
      //this is for the case when user would press ctrl and move away from the browser tab or window
      //keyup event would happen somewhere else and won't be captured, so zoomin class would get stuck
      .on("mouseenter", (event) => {
        if (_this.ui.cursorMode !== "arrow" && _this.ui.cursorMode !== "hand") return;
        if (!event.metaKey && !event.ctrlKey) _this.DOM.chartSvgAll.classed("vzb-zoomin", false);
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
      .on("click", (event) => {
        const cursor = _this.ui.cursorMode;
        if (!event.defaultPrevented && cursor !== "arrow" && cursor !== "hand") {
          _this._panZoom.zoomByIncrement(event, cursor, 500);
        }
      });

  }

  _initInfoElements() {
    const _this = this;
    const dataNotesDialog = () => this.root.findChild({type: "DataNotes"});
    const timeSlider = () => this.root.findChild({type: "TimeSlider"});

    utils.setIcon(this.DOM.yInfoEl, ICON_QUESTION)
      .on("click", () => {
        dataNotesDialog().pin();
      })
      .on("mouseover", function() {
        if (timeSlider().ui.dragging) return;
        const rect = this.getBBox();
        const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
        const toolRect = _this.root.element.node().getBoundingClientRect();
        const chartRect = _this.element.node().getBoundingClientRect();
        dataNotesDialog()
          .setEncoding(_this.MDL.y)
          .show()
          .setPos(coord.x + chartRect.left - toolRect.left, coord.y);
      })
      .on("mouseout", () => {
        if (timeSlider().ui.dragging) return;
        dataNotesDialog().hide();
      });

    utils.setIcon(this.DOM.xInfoEl, ICON_QUESTION)
      .on("click", () => {
        dataNotesDialog().pin();
      })
      .on("mouseover", function() {
        if (timeSlider().ui.dragging) return;
        const rect = this.getBBox();
        const coord = utils.makeAbsoluteContext(this, this.farthestViewportElement)(rect.x - 10, rect.y + rect.height + 10);
        const toolRect = _this.root.element.node().getBoundingClientRect();
        const chartRect = _this.element.node().getBoundingClientRect();
        dataNotesDialog()
          .setEncoding(_this.MDL.x)
          .show()
          .setPos(coord.x + chartRect.left - toolRect.left, coord.y);
      })
      .on("mouseout", () => {
        if (timeSlider().ui.dragging) return;
        dataNotesDialog().hide();
      });
  }

  get MDL(){
    return {
      frame: this.model.encoding.frame,
      selected: this.model.encoding.selected,
      highlighted: this.model.encoding.highlighted,
      superHighlighted: this.model.encoding.superhighlighted,
      y: this.model.encoding[this.state.alias.y || "y"],
      x: this.model.encoding[this.state.alias.x || "x"],
      size: this.model.encoding.size,
      color: this.model.encoding.color,
      label: this.model.encoding.label,
      trail: this.model.encoding.trail
    };
  }

  draw() {
    this.localise = this.services.locale.auto();

    //this.MDL.trail.config.show = false;
    //this.ui.cursorMode = "plus";
    this.sScale = this.MDL.size.scale.d3Scale;

    this.TIMEDIM = this.MDL.frame.data.concept;
    this.KEYS = this.model.data.space.filter(dim => dim !== this.TIMEDIM);

    if (this._updateLayoutProfile()) return; //return if exists with error
    this.addReaction(this._updateScales);
    this.addReaction(this.updateUIStrings);
    this.addReaction(this.updateTreemenu);
    this.addReaction(this._updateSize);
    this.addReaction(this.updateInfoElements);
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
    this.addReaction(this._drawForecastOverlay);
    this.addReaction(this._setupCursorMode);
    this.addReaction(this.updateDecorations);
  }

  drawData() {
    this.processFrameData();
    this._updateMarkerSizeLimits();
    this._createAndDeleteBubbles();
    //this.redrawData();
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
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const trailLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            const diagonalLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
            trailLine.classList.add("vzb-trail-line");
            diagonalLine.classList.add("vzb-diagonal-line");
            g.appendChild(circle);
            g.appendChild(diagonalLine);
            if (isTrailBubble(d)) g.appendChild(trailLine);
            return g;
          })
          .attr("class", "vzb-bc-entity")
          .attr("id", d => `vzb-bc-bubble-${d[Symbol.for("key")]}-${this.id}`)
          .style("opacity", d => d[Symbol.for("opacity")] = this._getBubbleOpacity(d))
          .call(selection => {
            if(!utils.isTouchDevice()){
              selection
                .on("mouseover", (event, d) => {
                  if (this.ui.cursorMode !== "arrow" && this.ui.cursorMode !== "hand") return;
                  if (this._labels.dragging) return;
                  this._bubblesInteract().mouseover(event, d);
                })
                .on("mouseout", (event, d) => {
                  if (this.ui.cursorMode !== "arrow" && this.ui.cursorMode !== "hand") return;
                  if (this._labels.dragging) return;
                  this._bubblesInteract().mouseout(event, d);
                })
                .on("click", (event, d) => {
                  if (this.ui.cursorMode !== "arrow" && this.ui.cursorMode !== "hand") return;
                  this._bubblesInteract().click(event, d);
                });
            } else {
              selection
                .onTap((event, d) => {
                  event.stopPropagation();
                  this._bubblesInteract().click(event, d);
                })
                .onLongTap(() => {});
            }
          })
          .each(function(d, index) {
            const dataNext = data[index + 1] || {};
            const isTrail = isTrailBubble(d);
            const isExtrapolated = d[Symbol.for("extrapolated")];
            const headTrail = isTrail && !dataNext[Symbol.for("trailHeadKey")];
            const view = d3.select(this);
            const circle = view.select("circle");
            const diagonalLine = view.select(".vzb-diagonal-line");
      
            const valueX = d[_this._alias("x")];
            const valueY = d[_this._alias("y")];
            const valueS = d.size;
            const valueC = d.color;
      
            //d.hidden = (!valueS && valueS !== 0) || valueX == null || valueY == null;
      
            //view.classed("vzb-hidden", d.hidden);
            d.r = utils.areaToRadius(_this.sScale(valueS || 0));
            const scaledX = _this.xScale(valueX);
            const scaledY = _this.yScale(valueY);
            const scaledC = valueC != null ? _this.cScale(valueC) : COLOR_WHITEISH;
      
            if (!duration || !headTrail) {
              circle
                .attr("r", d.r)
                .attr("fill", scaledC)
                .attr("cy", scaledY)
                .attr("cx", scaledX);
              //.transition(transition)

              if(isExtrapolated)
                diagonalLine
                  .attr("x1", scaledX + d.r/Math.sqrt(2))
                  .attr("y1", scaledY + d.r/Math.sqrt(2))
                  .attr("x2", scaledX - d.r/Math.sqrt(2))
                  .attr("y2", scaledY - d.r/Math.sqrt(2));
              diagonalLine
                .classed("vzb-hidden", !isExtrapolated);
      
              //trail line
              if (isTrail) {
                const trailLine = view.select(".vzb-trail-line");

                const scaledX0 = _this.xScale(dataNext[_this._alias("x")]);
                const scaledY0 = _this.yScale(dataNext[_this._alias("y")]);
                
                trailLine
                  .attr("x1", scaledX)
                  .attr("y1", scaledY)
                  .attr("x2", scaledX0)
                  .attr("y2", scaledY0)
                  .style("stroke", scaledC)
                  .attr("stroke-dasharray", Math.abs(scaledX - scaledX0) + Math.abs(scaledY - scaledY0))
                  .attr("stroke-dashoffset", -d.r);
              }
            }
      
            if (duration && !isTrail) {
              view
                .style("opacity", 0)
                .transition().duration(duration*0.9)
                .style("opacity", d[Symbol.for("opacity")]);
            }
      
            if (!isTrail) {
              _this._updateLabel(d, valueX, valueY, duration, true, false);
            }
          }),

        update => update
          .each(function(d, index) {
            
            const isTrail = isTrailBubble(d);
            const isExtrapolated = d[Symbol.for("extrapolated")];
            const dataNext = data[index + 1] || {};
            const dataNext2 = data[index + 2] || {};
            const headTrail = isTrail && !dataNext[Symbol.for("trailHeadKey")];
            const headTrail2 = isTrail && !dataNext2[Symbol.for("trailHeadKey")];
      
            const valueS = d.size;
            d.r = utils.areaToRadius(_this.sScale(valueS || 0));
            if (isTrail && !headTrail && !headTrail2) return;
      
            const valueX = d[_this._alias("x")];
            const valueY = d[_this._alias("y")];
            const valueC = d.color;
      
            //d.hidden = (!valueS && valueS !== 0) || valueX == null || valueY == null;
      
            //view.classed("vzb-hidden", d.hidden);
            const scaledX = _this.xScale(valueX);
            const scaledY = _this.yScale(valueY);
            const scaledC = valueC != null ? _this.cScale(valueC) : COLOR_WHITEISH;
      
            if (!duration || !headTrail) {
              const view = duration && !isTrail ?
                d3.select(this).transition(transition)
                :
                d3.select(this).interrupt();

              view.select("circle")
                .attr("r", d.r)
                .attr("fill", scaledC)
                .attr("cy", scaledY)
                .attr("cx", scaledX);
                
              const diagonalLine = d3.select(this).select(".vzb-diagonal-line");
              diagonalLine
                .classed("vzb-hidden", !isExtrapolated);
              if(isExtrapolated){
                if (duration && !isTrail){
                  diagonalLine.transition(transition)
                    .attr("x1", scaledX + d.r/Math.sqrt(2))
                    .attr("y1", scaledY + d.r/Math.sqrt(2))
                    .attr("x2", scaledX - d.r/Math.sqrt(2))
                    .attr("y2", scaledY - d.r/Math.sqrt(2));
                } else {
                  diagonalLine.interrupt()
                    .attr("x1", scaledX + d.r/Math.sqrt(2))
                    .attr("y1", scaledY + d.r/Math.sqrt(2))
                    .attr("x2", scaledX - d.r/Math.sqrt(2))
                    .attr("y2", scaledY - d.r/Math.sqrt(2));
                }
              }
              
              //trail line
              if (isTrail) {
                const trailLine = d3.select(this).select(".vzb-trail-line");
                const scaledX0 = _this.xScale(dataNext[_this._alias("x")]);
                const scaledY0 = _this.yScale(dataNext[_this._alias("y")]);
                
                trailLine
                  .attr("x1", scaledX)
                  .attr("y1", scaledY);
                if (duration && !data[index + 2][Symbol.for("trailHeadKey")]) {
                  trailLine
                    .attr("x2", scaledX)
                    .attr("y2", scaledY)
                    .transition(transition)
                    .attr("x2", scaledX0)
                    .attr("y2", scaledY0);
                } else {
                  trailLine.interrupt()
                    .attr("x2", scaledX0)
                    .attr("y2", scaledY0);
                }
      
                trailLine
                  .style("stroke", scaledC)
                  .attr("stroke-dasharray", Math.abs(scaledX - scaledX0) + Math.abs(scaledY - scaledY0))
                  .attr("stroke-dashoffset", -d.r);
              }
            }
            
            if (!isTrail)
              _this._updateLabel(d, valueX, valueY, duration, false, false);    
          }),    

        exit => exit
          .each(function(d) {
            const isTrail = isTrailBubble(d);
            
            const view = duration && !isTrail ?
              d3.select(this).transition(transition)
                .duration(duration*0.9)
                .style("opacity", 0)
              :
              d3.select(this).interrupt();
      
            view
              .remove();
            
            if (!isTrail) 
              _this._updateLabel(d, d[_this._alias("x")], d[_this._alias("y")], duration, true, true);
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
      const isTrail = isTrailBubble(d);
      const isExtrapolated = d[Symbol.for("extrapolated")];

      const valueX = d[_this._alias("x")];
      const valueY = d[_this._alias("y")];
      const valueS = d.size;
      const valueC = d.color;

      d.r = utils.areaToRadius(_this.sScale(valueS || 0));
      const scaledX = _this.xScale(valueX);
      const scaledY = _this.yScale(valueY);
      const scaledC = valueC != null ? _this.cScale(valueC) : COLOR_WHITEISH;

      const view = duration ? 
        d3.select(this)
          .transition()
          .duration(duration)
        : d3.select(this).interrupt();

      view.select("circle")
        .attr("r", d.r)
        .attr("fill", scaledC)
        .attr("cy", scaledY)
        .attr("cx", scaledX);

      const diagonalLine = d3.select(this).select(".vzb-diagonal-line");
      diagonalLine
        .classed("vzb-hidden", !isExtrapolated);
      if(isExtrapolated){
        if (duration){
          diagonalLine.transition().duration(duration)
            .attr("x1", scaledX + d.r/Math.sqrt(2))
            .attr("y1", scaledY + d.r/Math.sqrt(2))
            .attr("x2", scaledX - d.r/Math.sqrt(2))
            .attr("y2", scaledY - d.r/Math.sqrt(2));
        } else {
          diagonalLine.interrupt()
            .attr("x1", scaledX + d.r/Math.sqrt(2))
            .attr("y1", scaledY + d.r/Math.sqrt(2))
            .attr("x2", scaledX - d.r/Math.sqrt(2))
            .attr("y2", scaledY - d.r/Math.sqrt(2));
        }
      }
      

      if (isTrail) {
        const trailLine = duration ? 
          d3.select(this).select(".vzb-trail-line")
            .transition()
            .duration(duration)
          : d3.select(this).select(".vzb-trail-line").interrupt();

        const dataNext = data[index + 1];
        const scaledX0 = _this.xScale(dataNext[_this._alias("x")]);
        const scaledY0 = _this.yScale(dataNext[_this._alias("y")]);

        trailLine
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
      !this.ui.showForecast || 
      !this.ui.showForecastOverlay || 
      !this.ui.endBeforeForecast || 
        (this.MDL.frame.value <= this.MDL.frame.parseValue(this.ui.endBeforeForecast))
    );
  }

  _updateLayoutProfile(){
    this.services.layout.size;

    this.elementHeight = (this.element.node().clientHeight) || 0;
    this.elementWidth = (this.element.node().clientWidth) || 0;

    this.profileConstants = this.services.layout.getProfileConstants(
      PROFILE_CONSTANTS(this.elementWidth, this.elementHeight), 
      PROFILE_CONSTANTS_FOR_PROJECTOR(this.elementWidth, this.elementHeight)
    );

    if (!this.elementHeight || !this.elementWidth) return utils.warn("Chart _updateProfile() abort: container is too little or has display:none");
  }

  _getDuration() {
    return this.MDL.frame.playing ? this.MDL.frame.speed || 0 : 0;
  }

  _updateScales() {
    this.yScale = this.MDL.y.scale.d3Scale.copy();
    this.xScale = this.MDL.x.scale.d3Scale.copy();
    this._labels.setScales(this.xScale, this.yScale);
  }

  get cScale() {
    return this.MDL.color.scale.d3Scale;
  }
  
  updateUIStrings() {
    const {
      y, x, size, color
    } = this.MDL;

    this.strings = {
      title: {
        Y: Utils.getConceptName(y, this.localise),
        X: Utils.getConceptName(x, this.localise),
        S: Utils.getConceptName(size, this.localise),
        C: Utils.getConceptName(color, this.localise)
      },
      title_short: {
        Y: Utils.getConceptShortName(y, this.localise),
        X: Utils.getConceptShortName(x, this.localise),
        S: Utils.getConceptShortName(size, this.localise),
        C: Utils.getConceptShortName(color, this.localise)
      },
      subtitle: {
        Y: Utils.getConceptNameMinusShortName(y, this.localise),
        X: Utils.getConceptNameMinusShortName(x, this.localise)
      },
      unit: {
        Y: Utils.getConceptUnit(y),
        X: Utils.getConceptUnit(x),
        S: Utils.getConceptUnit(size),
        C: Utils.getConceptUnit(color)
      }
    };

    Promise.all([
      Utils.getConceptNameCompliment(y),
      Utils.getConceptNameCompliment(x),
      Utils.getConceptNameCompliment(size),
      Utils.getConceptNameCompliment(color)
    ]).then(action(response => {        
      [ 
        this.axisTitleComplimentStrings.Y,
        this.axisTitleComplimentStrings.X,
        this.axisTitleComplimentStrings.S,
        this.axisTitleComplimentStrings.C
      ] = response;
    }));
  }

  updateTreemenu(){
    const treemenu = this.root.findChild({type: "TreeMenu"});

    this.DOM.yTitleEl
      .classed("vzb-disabled", treemenu.state.ownReadiness !== Utils.STATUS.READY)
      .on("click", () => {
        treemenu
          .encoding(this._alias("y"))
          .alignX(this.services.locale.isRTL() ? "right" : "left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    this.DOM.xTitleEl
      .classed("vzb-disabled", treemenu.state.ownReadiness !== Utils.STATUS.READY)
      .on("click", () => {
        treemenu
          .encoding(this._alias("x"))
          .alignX(this.services.locale.isRTL() ? "right" : "left")
          .alignY("bottom")
          .updateView()
          .toggle();
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
    } = this.DOM;

    const _this = this;

    const layoutProfile = this.services.layout.profile;

    const margin = this.profileConstants.margin;
    const infoElHeight = this.profileConstants.infoElHeight;
    const xAxisTitleBottomMargin = this.profileConstants.xAxisTitleBottomMargin;

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

    const rangeBump = this.profileConstants.maxRadiusPx;
    projectionX.attr("y1", _this.yScale.range()[0] + rangeBump);
    projectionY.attr("x2", _this.xScale.range()[0] - rangeBump);


    // reduce font size if the caption doesn't fit
    this._updateSTitle();
    sTitleEl
      .attr("text-anchor", "end")
      .attr("transform", "translate(" + width + "," + 20 + ") rotate(-90)");

    const compl = this.axisTitleComplimentStrings;
    if (layoutProfile !== "SMALL") {
      ySubTitleEl.select("text").attr("dy", infoElHeight * 0.6).text(this.strings.subtitle.Y);
      xSubTitleEl.select("text").attr("dy", -infoElHeight * 0.3).text(this.strings.subtitle.X);
      
      yTitleEl.select("text").text(this.strings.title_short.Y + (compl.Y ? " · " + compl.Y : "") + " ")
        .append("tspan")
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
      xTitleEl.select("text").text(this.strings.title_short.X + (compl.X ? " · " + compl.X : "") + " ")
        .append("tspan")
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
    } else {
      ySubTitleEl.select("text").text("");
      xSubTitleEl.select("text").text("");

      const yTitleText = yTitleEl.select("text").text(this.strings.title.Y + (compl.Y ? " · " + compl.Y : ""));
      if (yTitleText.node().getBBox().width > width) yTitleText.text(this.strings.title_short.Y + (compl.Y ? " · " + compl.Y : ""));
    
      const xTitleText = xTitleEl.select("text").text(this.strings.title.X + (compl.X ? " · " + compl.X : ""));
      if (xTitleText.node().getBBox().width > width - 100) xTitleText.text(this.strings.title_short.X) + (compl.X ? " · " + compl.X : "");      
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
        "translate(" + (width * 0.5) + "," + (height + margin.bottom - xAxisTitleBottomMargin) + ")"
        :
        "translate(" + (isRTL ? width : 0) + "," + (height + margin.bottom - xAxisTitleBottomMargin) + ")");
    
    xAxisGroupsEl
      .style("font-size", infoElHeight * 0.8 + "px");

    this.root.findChild({type: "_DataWarning"}).setOptions({
      width: this.elementWidth,
      height: this.elementHeight,
      vertical: "bottom", 
      horizontal: "right", 
      right: margin.right,
      bottom: xAxisTitleBottomMargin,
      wLimit: (layoutProfile !== "SMALL" ? 0.5 : 1) *
        (this.elementWidth - xTitleEl.node().getBBox().width - infoElHeight * 3)
    });

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

  updateInfoElements() {
    this.services.layout.size;
    this.axisTitleComplimentStrings.X;
    this.axisTitleComplimentStrings.Y;

    const {xInfoEl, yInfoEl, xTitleEl, yTitleEl} = this.DOM;
    const {x, y} = this.MDL;
    const isRTL = this.services.locale.isRTL();
    const infoElHeight = this.profileConstants.infoElHeight;
    const layoutProfile = this.services.layout.profile;

    if (yInfoEl.select("svg").node()) {
      const titleBBox = yTitleEl.node().getBBox();
      const t = utils.transform(yTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);
      const vTranslate = isRTL ? (t.translateY + infoElHeight * 1.4 + titleBBox.width * 0.5) : (t.translateY - infoElHeight * 0.4 - titleBBox.width * 0.5);
      const conceptPropsY = y.data.conceptProps;

      yInfoEl
        .classed("vzb-hidden", !conceptPropsY.description && !conceptPropsY.sourceLink || this.services.layout.projector)
        .attr("transform", layoutProfile !== "SMALL" ?
          `translate(${ t.translateX - infoElHeight * 0.8 }, ${ vTranslate }) rotate(-90)` :
          `translate(${ hTranslate },${ t.translateY - infoElHeight * 0.8 })`)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
    }

    if (xInfoEl.select("svg").node()) {
      const titleBBox = xTitleEl.node().getBBox();
      const t = utils.transform(xTitleEl.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);
      const conceptPropsX = x.data.conceptProps;

      xInfoEl
        .classed("vzb-hidden", !conceptPropsX.description && !conceptPropsX.sourceLink || this.services.layout.projector)
        .attr("transform", `translate(${ hTranslate }, ${ t.translateY - infoElHeight * 0.8 })`)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
    }
  }

  _rangeBump(arg, undo) {
    const bump = this.profileConstants.maxRadiusPx;
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
    const compl = this.axisTitleComplimentStrings;
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
        (compl.S ? " · " + compl.S : "") +
        (sTitleContentON && cTitleContentON ? ", " : "") +
        (cTitleContentON ? this.localise("buttons/colors") + ": " + (titleC ? titleC : this.strings.title.C) : "") +
        (compl.C ? " · " + compl.C : "")
      );
    const sTitleWidth = sTitleText.node().getBBox().width;
    const remainigHeight = this.height - 30;
    const font = parseInt(sTitleText.style("font-size")) * remainigHeight / sTitleWidth;
    sTitleText.style("font-size", sTitleWidth > remainigHeight ? font + "px" : null);
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
      mouseover(event, d) {
        _this.hoverBubble = true;
        _this.MDL.highlighted.data.filter.set(d);
        _this._labels.showCloseCross(d, true);
      },

      mouseout(event, d) {
        _this.hoverBubble = false;
        _this.MDL.highlighted.data.filter.delete(d);
        //_this._setTooltip();
        _this._labels.showCloseCross(d, false);
      },

      click(event, d) {
        if (_this.draggingNow) return;
        // // const isSelected = d.isSelected;
        if (!isTrailBubble(d)) _this.MDL.selected.data.filter.toggle(d);
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

    const {
      minRadiusPx,
      maxRadiusPx
    } = this.profileConstants;

    //transfer min max radius to size dialog via root ui observable (probably a cleaner way is possible)
    this.root.ui.minMaxRadius = {min: minRadiusPx, max: maxRadiusPx};
    
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
        labelValues.valueY = d[this._alias("y")];
        labelValues.valueX = d[this._alias("x")];
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
    if (isTrailBubble(d)) return ui.opacityRegular;
    if (this.__selectedMarkers.has(d[Symbol.for("key")])) return ui.opacitySelect;

    if (this.__someSelected) return ui.opacitySelectDim;
    if (this.__someHighlighted) return ui.opacityHighlightDim;

    return ui.opacityRegular;
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

      const valueY = d[this._alias("y")];
      const valueX = d[this._alias("x")];
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
      const d = Object.assign(this.model.dataMap.getByStr(highlightedKey));
      const x = _this.xScale(d[_this._alias("x")]);
      const y = _this.yScale(d[_this._alias("y")]);
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
      const isTrail = isTrailBubble(d);

      let text = "";
      
      text = isSelected ? 
        !trailShow || isTailTrail || (!isTrail && !this.hoverBubble) ? "": this.localise(d.label[trailGroupDim])
        : 
        this.__labelWithoutFrame(d);
      
      _this._labels.highlight(null, false);
      _this._labels.highlight({ [Symbol.for("key")]: selectedKey }, true);
      if (isSelected) {
        const skipCrownInnerFill = !isTrail;
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
      _this.MDL.highlighted.data.filter.clear();
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

  _setupCursorMode() {
    const svg = this.DOM.chartSvgAll;
    if (this.ui.cursorMode === "plus") {
      svg.classed("vzb-zoomin", true);
      svg.classed("vzb-zoomout", false);
      svg.classed("vzb-panhand", false);
    } else if (this.ui.cursorMode === "minus") {
      svg.classed("vzb-zoomin", false);
      svg.classed("vzb-zoomout", true);
      svg.classed("vzb-panhand", false);
    } else if (this.ui.cursorMode === "hand") {
      svg.classed("vzb-zoomin", false);
      svg.classed("vzb-zoomout", false);
      svg.classed("vzb-panhand", true);
    } else {
      svg.classed("vzb-zoomin", false);
      svg.classed("vzb-zoomout", false);
      svg.classed("vzb-panhand", false);
    }
  }

  updateDecorations(){
    this.services.layout.size;
    this.MDL.x.scale.zoomed;
    this.MDL.y.scale.zoomed;
    this.decorations.update.bind(this)(this._getDuration());
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

      if (trail.show && key in trail.starts) {
        const trailStart = trail.starts[key];
        //console.log("trailstart", trailStart)
        // if this bubble is trail start bubble
        if (trailStart >= this.MDL.frame.value || showhide) {
          const trailData = this.model.getDataMapByFrameValue(trailStart).getByStr(key);
          
          cache.labelText = labelText = this.__labelWithFrame(trailData);
          cache.labelX0 = trailData[this._alias("x")];
          cache.labelY0 = trailData[this._alias("y")];
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
      if (!(key in trail.starts))
        continue;

      if (!this._labels.cached[key]) this._labels.cached[key] = {};
      const cache = this._labels.cached[key];

      const datamap = (trail.show ? this.model.getDataMapByFrameValue(trail.starts[key]) : this.model.dataMap);
      if (!datamap.hasByStr(key))
        continue;

      const d = datamap.getByStr(key);
      
      cache.labelText = this[(trail.show && this.ui.timeInTrails ? "__labelWithFrame" : "__labelWithoutFrame")](d);
      cache.labelX0 = d[this._alias("x")];
      cache.labelY0 = d[this._alias("y")];
      cache.scaledC0 = d.color != null ? this.cScale(d.color) : COLOR_WHITEISH,
      cache.scaledS0 = (d.size || d.size === 0) ? utils.areaToRadius(this.sScale(d.size)) : null;
      cache.valueS0 = d.size;
      cache.initTextBBox = null;
      cache.initFontSize = null;
      this._labels.updateLabel({ [Symbol.for("key")]: key }, null, null, null, null, null, null, d.size_label);
    }
  }

  __labelWithoutFrame(d) {
    if (typeof d.label == "object") 
      return Object.entries(d.label)
        .filter(entry => entry[0] != this.MDL.frame.data.concept)
        .map(entry => entry[1])
        .join(", ");
    if (d.label != null) return "" + d.label;
    return d[Symbol.for("key")];
  }

  __labelWithFrame(d) {
    const frameConcept = this.MDL.frame.data.concept;
    return this.__labelWithoutFrame(d) + " " + this.localise(d && d.label && d.label[frameConcept] || d && d.frame || this.MDL.frame.value);
  }

  _alias(enc) {
    return this.state.alias[enc] || enc;
  }
}

_VizabiBubbleChart.DEFAULT_UI = {
  show_ticks: true,
  showForecast: false,
  showForecastOverlay: true,
  pauseBeforeForecast: true,
  opacityHighlight: 1.0,
  opacitySelect: 1.0,
  opacityHighlightDim: 0.1,
  opacitySelectDim: 0.3,
  opacityRegular: 0.5,
  timeInBackground: true,
  timeInTrails: true,
  lockNonSelected: 0,
  numberFormatSIPrefix: true,
  panWithArrow: false,
  adaptMinMaxZoom: false,
  cursorMode: "arrow",
  zoomOnScrolling: true,
  decorations: {
    enabled: true,
    xAxisGroups: null //left to be set by external page
  },
  superhighlightOnMinimapHover: true,
  whenHovering: {
    showProjectionLineX: true,
    showProjectionLineY: true,
    higlightValueX: true,
    higlightValueY: true
  },
  labels: {
    enabled: true,
    dragging: true,
    removeLabelBox: false
  },
  margin: {
    left: 0,
    top: 0
  }
};

//export default BubbleChart;
export const VizabiBubbleChart = decorate(_VizabiBubbleChart, {
  "MDL": computed,
  "axisTitleComplimentStrings": observable,
  "cScale": computed
});

Chart.add("bubblechart", VizabiBubbleChart);
