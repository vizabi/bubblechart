import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataNotes,
  DataWarning,
  ErrorMessage,
  SpaceConfig,
  LocaleService,
  LayoutService,
  CapitalVizabiService,
  TreeMenu,
  SteppedSlider,
  Dialogs,
  ButtonList,
  Repeater,
  versionInfo
} from "VizabiSharedComponents";
import {VizabiBubbleChart} from "./component.js";

export default class BubbleChart extends BaseComponent {

  constructor(config){

    const fullMarker = config.model.markers.bubble;
    config.Vizabi.utils.applyDefaults(fullMarker.config, BubbleChart.DEFAULT_CORE);   

    const frameType = config.Vizabi.stores.encodings.modelTypes.frame;
    const { marker, splashMarker } = frameType.splashMarker(fullMarker);
    
    config.model.markers.bubble = marker;

    config.name = "bubblechart";

    config.subcomponents = [{
      type: Repeater,
      placeholder: ".vzb-repeater",
      model: marker,
      options: {
        ComponentClass: VizabiBubbleChart,
        componentCssName: "vzb-bubblechart"
      },
      name: "chart",
    },{
      type: TimeSlider,
      placeholder: ".vzb-timeslider",
      model: marker,
      name: "time-slider"
    },{
      type: SteppedSlider,
      placeholder: ".vzb-speedslider",
      model: marker,
      name: "speed-slider"
    },{
      type: TreeMenu,
      placeholder: ".vzb-treemenu",
      model: marker,
      name: "tree-menu"
    },{
      type: DataWarning,
      placeholder: ".vzb-datawarning",
      options: {button: ".vzb-datawarning-button"},
      model: marker,
      name: "data-warning"
    },{
      type: DataNotes,
      placeholder: ".vzb-datanotes",
      model: marker
    },{
      type: Dialogs,
      placeholder: ".vzb-dialogs",
      model: marker,
      name: "dialogs"
    },{
      type: ButtonList,
      placeholder: ".vzb-buttonlist",
      model: marker,
      name: "buttons"
    },{
      type: SpaceConfig,
      placeholder: ".vzb-spaceconfig",
      options: {button: ".vzb-spaceconfig-button"},
      model: marker,
      name: "space-config"
    },{
      type: ErrorMessage,
      placeholder: ".vzb-errormessage",
      model: marker,
      name: "error-message"
    }];

    config.template = `
      <div class="vzb-repeater vzb-bubblechart"></div>
      <div class="vzb-animationcontrols">
        <div class="vzb-timeslider"></div>
        <div class="vzb-speedslider"></div>
      </div>
      <div class="vzb-sidebar">
        <div class="vzb-dialogs"></div>
        <div class="vzb-buttonlist"></div>
      </div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-datawarning"></div>
      <div class="vzb-spaceconfig"></div>
      <div class="vzb-datanotes"></div>
      <div class="vzb-errormessage"></div>
    `;

    config.services = {
      Vizabi: new CapitalVizabiService({Vizabi: config.Vizabi}),
      locale: new LocaleService(config.locale),
      layout: new LayoutService(config.layout)
    };

    super(config);

    this.splashMarker = splashMarker;
  }
}

BubbleChart.DEFAULT_UI = {
  chart: {
  }
};

BubbleChart.DEFAULT_CORE = {
  requiredEncodings: ["x", "y", "size"],
  encoding: {
    "selected": {
      modelType: "selection",
      data: { 
        filter: { 
          ref: "markers.bubble.encoding.trail.data.filter"
        }
      }
    },
    "highlighted": { modelType: "selection" },
    "superhighlighted": { modelType: "selection" },
    "x": { },
    "y": { },
    "order": { modelType: "order",
      data: { 
        ref: "markers.bubble.encoding.size.data.config"
      }
    },
    "size": {
      scale: {
        modelType: "size",
        range: [0, 50]
      }
    },
    "color": { scale: { modelType: "color" } },
    "label": { data: { modelType: "entityPropertyDataConfig" } },
    "frame": { modelType: "frame" },
    "trail": { modelType: "trail" },             
    "size_label": {
      data: {
        constant: "_default"
      },
      scale: {
        modelType: "size",
        allowedTypes: ["linear", "log", "genericLog", "pow", "point", "ordinal"]
      }
    },
    "repeat": {
      modelType: "repeat",
      allowEnc: ["y", "x"]
    }
  }
};

BubbleChart.versionInfo = { version: __VERSION, build: __BUILD, package: __PACKAGE_JSON_FIELDS, sharedComponents: versionInfo};
