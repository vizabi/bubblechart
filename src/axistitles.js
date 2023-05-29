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
      <g class="vzb-bc-axis-x-info vzb-noexport"></g>
      <g class="vzb-bc-axis-y-title"><text></text></g>
      <g class="vzb-bc-axis-y-info vzb-noexport"></g>

      <g class="vzb-bc-axis-y-subtitle"><text></text></g>
      <g class="vzb-bc-axis-x-subtitle"><text></text></g>
      <g class="vzb-bc-axis-s-title"><text></text></g>
      <g class="vzb-bc-axis-c-title"><text></text></g>
    `;
    super(config);
  }

  setup(){
    this.DOM = {
      ySubTitle: this.element.select(".vzb-bc-axis-y-subtitle"),
      xSubTitle: this.element.select(".vzb-bc-axis-x-subtitle"),
      yTitle: this.element.select(".vzb-bc-axis-y-title"),
      xTitle: this.element.select(".vzb-bc-axis-x-title"),
      sTitle: this.element.select(".vzb-bc-axis-s-title"),
      cTitle: this.element.select(".vzb-bc-axis-c-title"),
      yInfo: this.element.select(".vzb-bc-axis-y-info"),
      xInfo: this.element.select(".vzb-bc-axis-x-info")
    };

    this.axisTitleComplimentStrings = {Y: "", X: "", S: "", C: ""};

    this._initInfoElements();
  }

  draw(){
    this.localise = this.services.locale.auto();

    this.addReaction(this.updateUIStrings);
    this.addReaction(this.updateTreemenu);
    this.addReaction(this._updateSize);
    this.addReaction(this.updateInfoElements);
  }

  get MDL(){
    return {
      y: this.model.encoding[this.state.alias?.y || "y"],
      x: this.model.encoding[this.state.alias?.x || "x"],
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


  _updateSTitle(titleS, titleC) {
    const { sTitle } = this.DOM;
    const {
      size,
      color
    } = this.MDL;
    const compl = this.axisTitleComplimentStrings;
    // vertical text about size and color
    if (this.parent.profileConstants.hideSTitle
      && this.root.ui.dialogs.dialogs.sidebar.indexOf("colors") > -1
      && this.root.ui.dialogs.dialogs.sidebar.indexOf("size") > -1) {
      sTitle.classed("vzb-invisible", true);
      return;
    }
    if (sTitle.classed("vzb-invisible")) {
      sTitle.classed("vzb-invisible", false);
    }
    const sTitleContentON = !size.data.constant;
    const cTitleContentON = !color.data.constant;
    const sTitleText = sTitle.select("text")
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
    const remainigHeight = this.parent.height - 30;
    const font = parseInt(sTitleText.style("font-size")) * remainigHeight / sTitleWidth;
    sTitleText.style("font-size", sTitleWidth > remainigHeight ? font + "px" : null);
  }


  _updateSize() {
    this.services.layout.size;

    const {
      sTitle,
      xTitle,
      yTitle,
      xSubTitle,
      ySubTitle,
    } = this.DOM;

    const layoutProfile = this.services.layout.profile;

    const { 
      margin, 
      infoElHeight, 
      xAxisTitleBottomMargin, 
      yAxisTitleBottomMargin, 
      leftMarginRatio 
    } = this.parent.profileConstants;

    //stage
    const height = (this.parent.elementHeight - margin.top - margin.bottom) || 0;
    const width = (this.parent.elementWidth - margin.left * leftMarginRatio - margin.right) || 0;

    // reduce font size if the caption doesn't fit
    this._updateSTitle();
    sTitle
      .attr("text-anchor", "end")
      .attr("transform", "translate(" + width + "," + 20 + ") rotate(-90)");

    const compl = this.axisTitleComplimentStrings;
    if (layoutProfile !== "SMALL") {
      ySubTitle.select("text").attr("dy", infoElHeight * 0.6).text(this.strings.subtitle.Y);
      xSubTitle.select("text").attr("dy", -infoElHeight * 0.3).text(this.strings.subtitle.X);
      
      yTitle.select("text").text(this.strings.title_short.Y + (compl.Y ? " · " + compl.Y : "") + " ")
        .append("tspan")
        .classed("vzb-noexport", true)
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
      xTitle.select("text").text(this.strings.title_short.X + (compl.X ? " · " + compl.X : "") + " ")
        .append("tspan")
        .classed("vzb-noexport", true)
        .style("font-size", (infoElHeight * 0.7) + "px")
        .text("▼");
    } else {
      ySubTitle.select("text").text("");
      xSubTitle.select("text").text("");

      const yTitleText = yTitle.select("text").text(this.strings.title.Y + (compl.Y ? " · " + compl.Y : ""));
      if (yTitleText.node().getBBox().width > width) yTitleText.text(this.strings.title_short.Y + (compl.Y ? " · " + compl.Y : ""));
    
      const xTitleText = xTitle.select("text").text(this.strings.title.X + (compl.X ? " · " + compl.X : ""));
      if (xTitleText.node().getBBox().width > width - 100) xTitleText.text(this.strings.title_short.X) + (compl.X ? " · " + compl.X : "");      
    }

    const isRTL = this.services.locale.isRTL();
    ySubTitle
      .style("font-size", (infoElHeight * 0.8) + "px")
      .attr("transform", "translate(" + 0 + "," + 0 + ") rotate(-90)");
    xSubTitle
      .style("font-size", (infoElHeight * 0.8) + "px")
      .attr("transform", "translate(" + width + "," + height + ")");
  
    yTitle
      .style("font-size", infoElHeight + "px")
      .attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (-margin.left - yAxisTitleBottomMargin)  + "," + (height * 0.5) + ") rotate(-90)"
        : 
        "translate(" + (isRTL ? width : 10 - margin.left) + ", -" + yAxisTitleBottomMargin + ")");

    xTitle
      .style("font-size", infoElHeight + "px")
      .attr("transform", layoutProfile !== "SMALL" ?
        "translate(" + (width * 0.5) + "," + (height + margin.bottom - xAxisTitleBottomMargin) + ")"
        :
        "translate(" + (isRTL ? width : 0) + "," + (height + margin.bottom - xAxisTitleBottomMargin) + ")");
    
  }
}

const decorated = decorate(BCAxisTitles, {
  "MDL": computed,
  "axisTitleComplimentStrings": observable
});
export { decorated as BCAxisTitles };