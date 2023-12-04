import {Dialog, SimpleCheckbox, SingleHandleSlider} from "@vizabi/shared-components";
import {decorate, computed, runInAction} from "mobx";
import * as d3 from "d3";

/*
 * flow control dialog
 */
class SkaterampStory extends Dialog {

  constructor(config){
    config.template = `
      <div class='vzb-dialog-modal'>
        <div class="vzb-dialog-title">
          <span>Skate ramp story</span>
        </div>
    
        <div class="vzb-dialog-content"></div>
      </div>
    `;
    config.subcomponents = [
    ];

    super(config);
  }

  setup(options) {
    super.setup(options);
    this.DOM.content = this.element.select(".vzb-dialog-content");

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Reset state to C02 emissions")
      .on("click", () => { window.location = window.location.origin + window.location.pathname; });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Switch to Child deaths (size pop)")
      .on("click", () => { runInAction(() => {
        this.model.data.config.source = "u5deaths";
        this.model.encoding.size_total.data.config.concept = "pop";
        this.model.encoding.size.data.config.concept = "pop";
        this.model.encoding.size.scale.config.domain = [0, 1.5e9];
        this.model.encoding.size.scale.config.zoomed = [0, 1.5e9];

        this.model.encoding.y_total.data.config.concept = "u5mr";
        this.model.encoding.y.data.config.concept = "u5mr";
        this.model.encoding.y.scale.config.domain = [0, 540];
        this.model.encoding.y.scale.config.zoomed = [0, 540];
      }); });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Switch to Child deaths (size u5d)")
      .on("click", () => { runInAction(() => {
        this.model.data.config.source = "u5deaths";
        this.model.encoding.size_total.data.config.concept = "u5deaths";
        this.model.encoding.size.data.config.concept = "u5deaths";
        this.model.encoding.size.scale.config.domain = [0, 859631];
        this.model.encoding.size.scale.config.zoomed = [0, 859631];

        this.model.encoding.y_total.data.config.concept = "u5mr";
        this.model.encoding.y.data.config.concept = "u5mr";
        this.model.encoding.y.scale.config.domain = [0, 540];
        this.model.encoding.y.scale.config.zoomed = [0, 540];
      }); });
      

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Start playing")
      .on("click", () => { this.MDL.frame.startPlaying(); });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Set bubble fill to country flags")
      .on("click", () => { runInAction(() => {
        this.model.encoding.color.data.config.concept = "flag_svg";
        this.model.encoding.color.data.config.source = "country_flags";
        this.model.encoding.color.scale.config.type = null;
        this.model.encoding.color.scale.config.domain = null;
        this.model.encoding.color.scale.config.zoomed = null;
      }); });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Prepare for decile split (swap data)")
      .on("click", () => { runInAction(() => {
        this.model.data.config.space =  ["geo", "decile", "time"];
      }); });

    this.DOM.content.append("div").attr("class", "vzb-story-label")
      .text("Now you can click bubbles for manual split");

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Split all (use timeslider speed)")
      .on("click", () => { runInAction(() => {
        this.root.findChild({type: "MarkerSplit"}).splitAll();
      }); });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Revert split")
      .on("click", () => { runInAction(() => {
        this.root.findChild({type: "MarkerSplit"}).unsplitAll();
        this.root.findChild({type: "MarkerSplit"}).redraw();
      }); });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Zoom out (use timeslider speed)")
      .on("click", () => { 
        this.root.findChild({type: "MarkerSplit"}).resetZoom();
      });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Swimming lanes")
      .on("click", () => { runInAction(() => {
        this.model.encoding.y.data.config.space = ["geo", "time"];
        this.model.encoding.y.data.config.concept = "ilevels";
        this.model.encoding.y.data.config.source = "fasttrack";
        this.model.encoding.y.scale.config.type = null;
        this.model.encoding.y.scale.config.domain = null;
        this.model.encoding.y.scale.config.zoomed = null;
        
        this.model.encoding.y_total.scale.config.type = null;
      }); });

    this.DOM.content.append("div").attr("class", "vzb-story")
      .text("👉 Make piles (use timeslider speed)")
      .on("click", () => { 
        this.root.findChild({type: "MarkerSplit"}).makePiles();
      });

    this.DOM.content.selectAll("div.vzb-story")
      .style("padding", "5px 0px 5px 5px")
      .style("cursor", "pointer")
      .on("mouseenter", function(){d3.select(this).style("background-color","#f2fafc");})
      .on("mouseleave", function(){d3.select(this).style("background-color",null);});

    this.DOM.content.selectAll("div.vzb-story-label")
      .style("padding", "5px 0px 5px 5px")
      .style("font-style", "italic")
      .style("color", "#999");

    // <div class="vzb-story-step1"</div>
    // <div class="vzb-story-step2">Step2: play 1800-2022</div>
    // <div class="vzb-story-step3">Step3: reconfig to deciles</div>
    // <div>now click a few bubbles to manual split</div>
    // <div class="vzb-story-step4">Step4: split the rest</div>
    // <div class="vzb-story-step5">Step5: play deciles</div>


  }

  get MDL() {
    return {
      frame: this.model.encoding.frame
    };
  }  

  draw(){
    this.localise = this.services.locale.auto();
    super.draw();

    this.addReaction(this.update);
  }


  update() {

  }



}

const decorated = decorate(SkaterampStory, {
  "MDL": computed
});
Dialog.add("skateramp-story", decorated);
export { decorated as SkaterampStory };
