import {
  Utils,
  Icons,
  LegacyUtils as utils,
  BaseComponent,
} from "@vizabi/shared-components";

import {
  decorate, computed, action, observable
} from "mobx";
  
const {ICON_QUESTION} = Icons;

class BCAxisTitles extends BaseComponent {

  constructor(config) {
    config.template = `
      <g class="vzb-bc-axis-x-title"><text></text></g>
      <g class="vzb-bc-axis-y-title"><text></text></g>
      <g class="vzb-bc-axis-s-title"><text></text></g>
      <g class="vzb-bc-axis-x-subtitle"><text></text></g>
      <g class="vzb-bc-axis-y-subtitle"><text></text></g>
      <g class="vzb-bc-axis-x-info vzb-noexport"></g>
      <g class="vzb-bc-axis-y-info vzb-noexport"></g>
    `;
    super(config);
  }

  setup(){
    this.DOM = {
      xTitle: this.element.select(".vzb-bc-axis-x-title"),
      yTitle: this.element.select(".vzb-bc-axis-y-title"),
      sTitle: this.element.select(".vzb-bc-axis-s-title"),
      xSubTitle: this.element.select(".vzb-bc-axis-x-subtitle"),
      ySubTitle: this.element.select(".vzb-bc-axis-y-subtitle"),
      xInfo: this.element.select(".vzb-bc-axis-x-info"),
      yInfo: this.element.select(".vzb-bc-axis-y-info")
    };

    this.axisTitleComplimentStrings = {Y: "", X: "", S: "", C: ""};
    this.strings = { title: {Y: "", X: "", S: "", C: ""}, title_short: {Y: "", X: "", S: "", C: ""}, subtitle: {Y:"", X: ""}};

    this._initInfoElements();
  }

  draw(){
    this.localise = this.services.locale.auto();

    this.addReaction(this.updateUIStrings);
    this.addReaction(this.updateTreemenu);
    this.addReaction(this.updateSize);
    this.addReaction(this.updateInfoElements);
  }

  get MDL(){
    return {
      y: this.model.encoding[this.parent.state.alias?.y || "y"],
      x: this.model.encoding[this.parent.state.alias?.x || "x"],
      size: this.model.encoding.size,
      color: this.model.encoding.color
    };
  }

  updateTreemenu(){
    const treemenu = this.root.findChild({type: "TreeMenu"});

    this.DOM.yTitle
      .classed("vzb-disabled", treemenu.state.ownReadiness !== Utils.STATUS.READY)
      .on("click", () => {
        treemenu
          .encoding(this.parent._alias("y"))
          .alignX(this.services.locale.isRTL() ? "right" : "left")
          .alignY("top")
          .updateView()
          .toggle();
      });

    this.DOM.xTitle
      .classed("vzb-disabled", treemenu.state.ownReadiness !== Utils.STATUS.READY)
      .on("click", () => {
        treemenu
          .encoding(this.parent._alias("x"))
          .alignX(this.services.locale.isRTL() ? "right" : "left")
          .alignY("bottom")
          .updateView()
          .toggle();
      });    
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


  _initInfoElements() {
    const _this = this;
    const dataNotesDialog = () => this.root.findChild({type: "DataNotes"});
    const timeSlider = () => this.root.findChild({type: "TimeSlider"});

    utils.setIcon(this.DOM.yInfo, ICON_QUESTION)
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

    utils.setIcon(this.DOM.xInfo, ICON_QUESTION)
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

  updateInfoElements() {
    this.services.layout.size;
    this.strings.title.X,
    this.strings.title.Y,
    this.axisTitleComplimentStrings.X;
    this.axisTitleComplimentStrings.Y;

    const {xInfo, yInfo, xTitle, yTitle} = this.DOM;
    const {x, y} = this.MDL;
    const isRTL = this.services.locale.isRTL();
    const infoElHeight = this.parent.profileConstants.infoElHeight;
    const layoutProfile = this.services.layout.profile;

    if (yInfo.select("svg").node()) {
      const titleBBox = yTitle.node().getBBox();
      const t = utils.transform(yTitle.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);
      const vTranslate = isRTL ? (t.translateY + infoElHeight * 1.4 + titleBBox.width * 0.5) : (t.translateY - infoElHeight * 0.4 - titleBBox.width * 0.5);
      const conceptPropsY = y.data.conceptProps;

      yInfo
        .classed("vzb-hidden", !conceptPropsY.description && !conceptPropsY.sourceLink || this.services.layout.projector)
        .attr("transform", layoutProfile !== "SMALL" ?
          `translate(${ t.translateX - infoElHeight * 0.8 }, ${ vTranslate }) rotate(-90)` :
          `translate(${ hTranslate },${ t.translateY - infoElHeight * 0.8 })`)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
    }

    if (xInfo.select("svg").node()) {
      const titleBBox = xTitle.node().getBBox();
      const t = utils.transform(xTitle.node());
      const hTranslate = isRTL ? (titleBBox.x + t.translateX - infoElHeight * 1.4) : (titleBBox.x + t.translateX + titleBBox.width + infoElHeight * 0.4);
      const conceptPropsX = x.data.conceptProps;

      xInfo
        .classed("vzb-hidden", !conceptPropsX.description && !conceptPropsX.sourceLink || this.services.layout.projector)
        .attr("transform", `translate(${ hTranslate }, ${ t.translateY - infoElHeight * 0.8 })`)
        .select("svg")
        .attr("width", infoElHeight + "px")
        .attr("height", infoElHeight + "px");
    }
  }


  _updateSTitle(width = this.parent.width, height = this.parent.height) {
    const { sTitle } = this.DOM;
    const { size, color } = this.MDL;
    const compl = this.axisTitleComplimentStrings;
    
    // vertical text about size and color
    const invisible = this.parent.profileConstants.hideSTitle
      && this.root.ui.dialogs.dialogs.sidebar.includes("colors")
      && this.root.ui.dialogs.dialogs.sidebar.includes("size");

    sTitle.classed("vzb-invisible", invisible);
    if (invisible) return;

    const sTitleContent = !size.data.constant 
      ? this.localise("buttons/size") + ": " + this.strings.title.S + (compl.S ? " · " + compl.S : "")
      : "";
    const cTitleContent = !color.data.constant 
      ? this.localise("buttons/colors") + ": " + this.strings.title.C + (compl.C ? " · " + compl.C : "") 
      : "";

    const sTitleText = sTitle
      .attr("text-anchor", "end")
      .attr("transform", "translate(" + width + "," + 20 + ") rotate(-90)")
      .select("text")
      .style("font-size", null) // reset font size to remove jumpy measurement
      .text(sTitleContent + (sTitleContent && cTitleContent ? ", " : "") + cTitleContent);

    // reduce font size if the caption doesn't fit
    const sTitleWidth = sTitleText.node().getBBox().width;
    const padding = 30;
    const font = parseInt(sTitleText.style("font-size")) * (height - padding) / sTitleWidth;
    sTitleText.style("font-size", sTitleWidth > (height - padding) ? font + "px" : null);
  }


  _updateYTitle(width = this.parent.width, height = this.parent.height) {
    const { yTitle, ySubTitle } = this.DOM;

    const { 
      margin, 
      infoElHeight, 
      yAxisTitleBottomMargin, 
    } = this.parent.profileConstants;

    const layoutProfile = this.services.layout.profile;

    const compl = this.axisTitleComplimentStrings;
    const isRTL = this.services.locale.isRTL();

    if (layoutProfile !== "SMALL") {
      ySubTitle
        .attr("transform", "translate(" + 0 + "," + 0 + ") rotate(-90)")
        .select("text")
        .attr("dy", infoElHeight * 0.6)
        .style("font-size", (infoElHeight * 0.8) + "px")
        .text(this.strings.subtitle.Y);
      
      const yTitleText = yTitle.select("text")
        .style("font-size", infoElHeight + "px")
        .text(this.strings.title_short.Y + (compl.Y ? " · " + compl.Y : ""));

      yTitleText.append("tspan")
        .classed("vzb-noexport", true)
        .style("font-size", (infoElHeight * 0.7) + "px")
        .attr("dx", ( (isRTL ? -1 : 1) * infoElHeight * 0.25) + "px")
        .text("▼");

      const doesntFit = yTitle.node().getBBox().width > height; 
      
      yTitle
        .attr("text-anchor", doesntFit ? "start" : "middle")
        .attr("transform", "translate(" + (-margin.left - yAxisTitleBottomMargin)  + "," + (doesntFit ? (isRTL ? 0 : height) : height / 2 ) + ") rotate(-90)");

    } else {
      ySubTitle.select("text").text("");

      const yTitleText = yTitle
        .select("text")
        .text(this.strings.title.Y + (compl.Y ? " · " + compl.Y : ""));
        
      const doesntFit = yTitleText.node().getBBox().width > width; 
      if (doesntFit) yTitleText.text(this.strings.title_short.Y + (compl.Y ? " · " + compl.Y : ""));
      
      yTitle
        .attr("text-anchor", "start")
        .attr("transform", "translate(" + (isRTL ? width : 10 - margin.left) + ", -" + yAxisTitleBottomMargin + ")");
    }
  }


  _updateXTitle(width = this.parent.width, height = this.parent.height) {
    const { xTitle, xSubTitle } = this.DOM;

    const { 
      margin, 
      infoElHeight, 
      xAxisTitleBottomMargin, 
    } = this.parent.profileConstants;

    const layoutProfile = this.services.layout.profile;

    const compl = this.axisTitleComplimentStrings;
    const isRTL = this.services.locale.isRTL();

    if (layoutProfile !== "SMALL") {
      xSubTitle
        .attr("transform", "translate(" + width + "," + height + ")")
        .select("text")
        .attr("dy", -infoElHeight * 0.3)
        .style("font-size", (infoElHeight * 0.8) + "px")
        .text(this.strings.subtitle.X);
      
      const xTitleText = xTitle.select("text")
        .style("font-size", infoElHeight + "px")
        .text(this.strings.title_short.X + (compl.X ? " · " + compl.X : ""));

      xTitleText 
        .append("tspan")
        .classed("vzb-noexport", true)
        .style("font-size", (infoElHeight * 0.7) + "px")
        .attr("dx", ( (isRTL ? -1 : 1) * infoElHeight * 0.25) + "px")
        .text("▼");

    } else {
      xSubTitle.select("text").text("");

      xTitle.select("text")        
        .text(this.strings.title.X + (compl.X ? " · " + compl.X : ""));
    }

    const doesntFit = xTitle.node().getBBox().width > width - 100;
    xTitle
      .attr("text-anchor", doesntFit ? "start" : "middle")
      .attr("transform", "translate(" + (doesntFit ? (isRTL ? width : 0) : width / 2) + "," + (height + margin.bottom - xAxisTitleBottomMargin) + ")");
    
    if (doesntFit && layoutProfile === "SMALL") xTitle.select("text").text(this.strings.title_short.X) + (compl.X ? " · " + compl.X : ""); 
  }


  updateSize() {
    this.services.layout.size;
 
    const { 
      margin, 
      leftMarginRatio 
    } = this.parent.profileConstants;

    const height = (this.parent.elementHeight - margin.top - margin.bottom) || 0;
    const width = (this.parent.elementWidth - margin.left * leftMarginRatio - margin.right) || 0;

    this._updateSTitle(width, height);
    this._updateYTitle(width, height);
    this._updateXTitle(width, height);
    
  }
}

const decorated = decorate(BCAxisTitles, {
  "MDL": computed,
  "strings": observable,
  "axisTitleComplimentStrings": observable
});
export { decorated as BCAxisTitles };