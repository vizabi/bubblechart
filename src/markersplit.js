import {
  LegacyUtils as utils,
  BaseComponent,
} from "@vizabi/shared-components";
import * as d3 from "d3";
  

import { dodgeY } from "./plot/dodge.js";

import {
  computed,
  decorate
} from "mobx";

class MarkerSplit extends BaseComponent {

  constructor(config) {
    config.template = `
    `;
    super(config);
  }

  setup() {
    this.DOM = {
    };

    this.splitDone = new Set();

    const COLOR_WHITEISH = "rgb(253, 253, 253)";
    this.parent.__getColor = (function(key, valueC, d) {
      return valueC != null && !utils.isNaN(valueC) 
        ? (this.MDL.color.scale.isPattern && (d.decile && d.r > 5 || !d.decile && d.r > 1.5) 
          ? `url(#flag-${d.geo}-${this.id})` 
          : this.cScale(valueC)) 
        : COLOR_WHITEISH;
    });

    const _this = this;
    this.parent.___redrawData = this.parent.redrawData;
    this.parent.redrawData = (function(duration) {
      this.___redrawData(duration);
      _this.redrawTotals(duration);
    })
  }

  get MDL() {
    return {
      frame: this.model.encoding.frame,
      y: this.model.encoding.y,
    };
  }

  draw() {
    this.localise = this.services.locale.auto();
    
    this.addReaction(this.redraw);
  }

  redraw() {
    if(!this.model.data.space.includes("decile")) return;

    const _this = this;
    const KEY = Symbol.for("key");
    const xScale = this.parent.xScale;
    const yScale = this.parent.yScale;
    const sScale = this.parent.sScale;
    const duration = this.parent._getDuration();

    const aggregatedData = d3.rollup(
      this.model.dataArray,
      v => (Object.assign({}, v[0], {
        x: v[0].x_total,
        y: this.MDL.y.scale.type === "rank" ? v[0].y : v[0].y_total,
        size: v[0].size_total || 0,
        label: { geo: v[0].geo },
        [KEY]: v[0].geo,
        derivedFrom: v[0][KEY],
        decile: undefined,
        x_total: undefined,
        y_total: undefined,
        [Symbol.for("opacity")]: v[0][Symbol.for("opacity")]
      })),
      d => d.geo
    );  

    this.bubbles = this.element.selectAll(".vzb-bc-markersplit-entity")
      .data([...aggregatedData.values()].filter(f => !this.splitDone.has(f.geo)), d => d[KEY])
      .join(
        enter => enter.insert("circle", d => d3.select("#" + `vzb-bc-bubble-${d.derivedFrom}-${this.parent.id}`).node())
          .attr("class", "vzb-bc-markersplit-entity")
          .attr("id", d => `vzb-bc-bubble-${d[Symbol.for("key")]}-${this.id}`)
          .attr("cx", d => xScale(d.x))
          .attr("cy", d => yScale(d.y))
          .attr("fill", d => _this.parent.__getColor(d[KEY], d.color, d))
          .call(selection => {
            if (duration) {
              selection
                .style("opacity", 0)
                .transition().duration(duration*0.9)
                .style("opacity", d => d[Symbol.for("opacity")]);
            }
          })
      )
      .call(selection => {
        if (duration) {
          selection.transition(this.parent._getTransition(duration))
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", d => utils.areaToRadius(sScale(d.size)))  
        } else {
          selection.interrupt()
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", d => utils.areaToRadius(sScale(d.size)))
        }
      })
      .style("stroke", "#333")
      .style("opacity", 0.8)
      .on("click", function(event, d) { 
        const decileBubbles = _this.parent.bubbles.selectAll("circle")
          .filter(f => _this.splitDone.has(f.geo))
          .style("opacity", 0.2);
        const totalBubbles = _this.bubbles
          .filter(f => f.geo != d.geo)
          .style("opacity", 0.2);
        _this.splitBubble(d, d3.select(this), 0).then(() => {
          decileBubbles.style("opacity", 0.8);
          totalBubbles.style("opacity", 0.8);
        });
      });


    this.parent.bubbles.merge(this.bubbles).sort((b,a) => a.order - b.order);

    if (!this.splitDone.size)
      this.parent.bubbles.selectAll("circle")
        .style("opacity", 0)
        .style("pointer-events", "none");

  }

  redrawTotals(duration) {
    const xScale = this.parent.xScale;
    const yScale = this.parent.yScale;
    const sScale = this.parent.sScale;

    if (!this.bubbles) return;

    if (duration) {
      this.bubbles.transition(this.parent._getTransition(duration))
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", d => utils.areaToRadius(sScale(d.size)))  
    } else {
      this.bubbles.interrupt()
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", d => utils.areaToRadius(sScale(d.size)))
    }
  }

  unsplitAll(){
    this.splitDone.clear();
  }

  splitBubble(d, view, delay = 0, allbubbles = false) {
    const xScale = this.parent.xScale;
    const yScale = this.parent.yScale;
    const sScale = this.parent.sScale;

    const baseDuration = d.r > 5 || !allbubbles ? this.MDL.frame.speed : 0;

    let endPromise = null;

    if (baseDuration) {
      endPromise = this.parent.bubbles.selectAll("circle")
        .filter(f => f.geo == d.geo)
        .each(function(e){ 
          e.cx = d3.select(this).attr("cx"); 
          e.cy = d3.select(this).attr("cy"); 
          e.cr = d3.select(this).attr("r"); 
        })
        .attr("cx", xScale(d.x) )
        .attr("cy", yScale(d.y) )
        .attr("r", 0 )
        .transition()
        .delay(delay)
        .duration(0).ease(d3.easeLinear)
        .style("opacity", 0.8)
        .style("pointer-events", "visible")
        .attr("cx", () => {
          const offcenterX = (Math.random() - 0.5) * utils.areaToRadius(sScale(d.size));
          return (xScale(d.x) || 0) + offcenterX;
        })
        .attr("cy", () => {
          const offcenterY = (Math.random() - 0.5) * utils.areaToRadius(sScale(d.size));
          return (yScale(d.y) || 0) + offcenterY;
        })
        .attr("r", e => +e.cr)
        .transition().duration(baseDuration * 20).ease(d3.easeExpOut)
        .attr("cx", e => +e.cx)
        .attr("cy", e => +e.cy)
        .end();

      view.transition().delay(delay).duration(baseDuration * 2).ease(d3.easeExpOut)
        .attr("r", 0)
        .style("opacity", 0);
    } else {

      endPromise = this.parent.bubbles.selectAll("circle")
        .filter(f => f.geo == d.geo)
        .transition()
        .delay(delay)
        .duration(0)
        .style("opacity", 0.8)
        .style("pointer-events", "visible")
        .end();

      view.transition().delay(delay)
        .duration(0)
        .style("opacity", 0);
    }

    this.splitDone.add(d.geo);
    return endPromise;
  }

  splitAll() {
    const _this = this;
    this.bubbles.filter(f => !this.splitDone.has(f.geo))
      .each( function(d, i) {
        //_this.splitBubble(d, d3.select(this), i == 0 ? 0 : Math.max(0.03 * i + 1, Math.log(i) + 1) * 1000, true);
        _this.splitBubble(d, d3.select(this), i == 0 ? 0 : (i < 10 ? (Math.log(i) + 1) * 1000 : i * 100), true);
        //_this.splitBubble(d, d3.select(this), i * 100, true);
      });

  }

  resetZoom() {
    this.parent._panZoom.reset(null, this.MDL.frame.speed * 2);
  }


  makePiles() {
    const swimLaneEnc = this.MDL.y;
    
    const data = this.parent.model.dataArray.concat().map((m,i) => ({index: i, ...m}));
    const x = data.map(m => m.x);
    const r = data.map(m => m.size);

    const facets = d3.rollups(data, v => v.map(m => m.index), d => d[swimLaneEnc.data.concept])
      .sort(([a],[b]) => swimLaneEnc.comparator(a,b))
      .map(([k,v]) => v);

    const dodge = dodgeY({x, r, padding: 2})({
      data: data.map( () => undefined ),
      facets,
      channels: {
        r: {scale: "r", value: r},
        x: {scale: "x", value: x}
      },
      scales: {
        r: (v) => utils.areaToRadius(this.parent.sScale(v || 0)), //d3.scalePow().exponent(0.5).domain(d3.extent(R)).range([0, 60]),
        x: this.parent.xScale,
      },
      baseline: this.parent.height,
      context: {projection: undefined}
    });

    const y = dodge.channels.y.value;

    const facetHeights = facets.map(facet => d3.max(facet, i => y[i]) - d3.min(facet, i => y[i]) );
    const padding = (this.parent.height - d3.sum(facetHeights)) / (facets.length - 1) * 0.9;

    let acc = 0;
    const shift = facetHeights.map(height => {
      const acc_1 = acc; 
      acc += (height + padding); 
      return acc_1;
    } );

    facets.forEach((facet, i) => facet.map(indexInFacet => y[indexInFacet] -= shift[i]));

    const _this = this;

    this.parent.bubbles
      .each( function(d,i) {
        d3.select(this).select("circle")
          .transition().duration(_this.MDL.frame.speed * 20).ease(d3.easeBounce)
          .attr("cy", y[i]);
      });
  }





}

const decorated = decorate(MarkerSplit, {
  "MDL": computed
});
export { decorated as MarkerSplit };