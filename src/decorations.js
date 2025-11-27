import {
  Utils
} from "@vizabi/shared-components";
import * as d3 from "d3";

export default class BCDecorations{
  constructor(){
  }
  
  update(duration) {
    const _this = this;

    const uiSetting = this.ui.decorations;
    const layoutProfile = this.services.layout.profile;
    const margin = this.profileConstants.margin;
    
    // x axis groups used for incomes
    const showxAxisGroups = uiSetting.xAxisGroups 
      && uiSetting.xAxisGroups[this.MDL.x.data.concept] 
      && uiSetting.enabled
      && layoutProfile !== "SMALL";
    
    this.DOM.xAxisGroupsEl.classed("vzb-invisible", !showxAxisGroups);
    if (showxAxisGroups) {
      const axisGroupsData = Utils.injectIndexes(uiSetting.xAxisGroups[this.MDL.x.data.concept]);
      let xAxisGroups = this.DOM.xAxisGroupsEl.selectAll(".vzb-bc-x-axis-group").data(axisGroupsData);
      
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
        
        calcs.boundaryMinX_px = _this.xScale(d.min || d.min === 0? d.min : d3.min(_this.xScale.domain())) || 0;
        calcs.boundaryMaxX_px = _this.xScale(d.max || d.max === 0? d.max : d3.max(_this.xScale.domain())) || 0;
        
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
        
        view.select("text.vzb-bc-x-axis-group-text")
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
      
      xAxisGroups.select("text.vzb-bc-x-axis-group-text").on("mouseenter", function(event, d) {
        const calcs = xAxisGroups_calcs[d.i];
        const parentView = d3.select(this.parentNode);
  
        d3.select(this).attr("font-weight", "bold");
        parentView.append("rect").lower()
          .attr("x", calcs.boundaryMinX_px)
          .attr("width", calcs.boundaryMaxX_px - calcs.boundaryMinX_px)
          .attr("y", - margin.top)
          .attr("height", _this.height + margin.top);
  
        if (calcs.min || calcs.min === 0) parentView.append("line").lower()
          .attr("x1", calcs.boundaryMinX_px)
          .attr("x2", calcs.boundaryMinX_px)
          .attr("y1", - margin.top)
          .attr("y2", _this.height);
  
        if (calcs.max || calcs.max === 0) parentView.append("line").lower()
          .attr("x1", calcs.boundaryMaxX_px)
          .attr("x2", calcs.boundaryMaxX_px)
          .attr("y1", - margin.top)
          .attr("y2", _this.height);
  
      }).on("mouseleave", function() {
        const parentView = d3.select(this.parentNode);
  
        d3.select(this).attr("font-weight", null);
        parentView.selectAll("rect").remove();
        parentView.selectAll("line").remove();
      });
    }    
    
    // diagonal line that is used when the same idicator ID is used for both axis X and Y
    const showLineEqualXY = 
      this.MDL.x.data.concept == this.MDL.y.data.concept 
      && uiSetting.enabled
      && layoutProfile !== "SMALL";
    
    this.DOM.lineEqualXY.classed("vzb-invisible", !showLineEqualXY);

    if (showLineEqualXY) {
      this.MDL.x.scale.type; //watch
      this.MDL.y.scale.type; //watch

      const domains = this.yScale.domain().concat(this.xScale.domain()),
        min = d3.min(domains), 
        max = d3.max(domains), 
        step = (max-min)/100;

      const sequence = d3.range(min, max, step).concat(max);

      const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => this.xScale(d))
        .y(d => this.yScale(d));

      this.DOM.lineEqualXY
        .transition()
        .duration(duration || 0)
        .attr("d", line(sequence));
    }
  }
}