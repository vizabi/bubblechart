import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataNotes,
  DataWarning,
  LocaleService,
  LayoutService,
  TreeMenu,
  SteppedSlider,
  Dialogs,
  ButtonList,
  Repeater
} from "VizabiSharedComponents";
import {VizabiBubbleChart} from "./component.js";
import { observable } from "mobx";

const VERSION_INFO = { version: __VERSION, build: __BUILD };

export default class BubbleChart extends BaseComponent {

  constructor(config){
    const marker = config.splash(config.model.stores.markers.get("bubble"));

    config.name = "bubblechart";

    config.subcomponents = [{
      type: Repeater,
      placeholder: ".vzb-repeater",
      model: marker,
      options: {
        COMP_TYPE: VizabiBubbleChart,
        COMP_CSSNAME: "vzb-bubblechart"
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
      model: marker
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
    }];

    config.template = `
      <div class="vzb-repeater vzb-bubblechart">
      </div>
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
      <div class="vzb-datanotes"></div>
    `;

    config.services = {
      locale: new LocaleService(config.locale),
      layout: new LayoutService({placeholder: config.placeholder})
    };

    //register locale service in the marker model
    config.model.config.markers.bubble.data.locale = observable({
        get id() { return config.services.locale.id; }
      });

    super(config);
  }
}

BubbleChart.DEFAULT_UI = {
  chart: {
  }
};





 
const OldBubbleChart = {

  validate(model) {
    model = this.model || model;

    this._super(model);

    if (model.ui.chart.lockNonSelected && (!model.ui.splash || model.state.time.splash === false)) {
      const time = model.state.time.parse("" + model.ui.chart.lockNonSelected);
      if (time < model.state.time.start) model.ui.chart.lockNonSelected = model.state.time.formatDate(model.state.time.start);
      if (time > model.state.time.end) model.ui.chart.lockNonSelected = model.state.time.formatDate(model.state.time.end);
    }
  },

  /**
   * Determines the default model of this tool
   */
  default_model: {
    state: {
      time: {
        "autoconfig": {
          "type": "time"
        }
      },
      entities: {
        "autoconfig": {
          "type": "entity_domain",
          "excludeIDs": ["tag"]
        }
      },
      entities_colorlegend: {
        "autoconfig": {
          "type": "entity_domain",
          "excludeIDs": ["tag"]
        }
      },
      marker: {
        limit: 5000,
        space: ["entities", "time"],
        axis_x: {
          use: "indicator",
          "autoconfig": {
            index: 0,
            type: "measure"
          }
        },
        axis_y: {
          use: "indicator",
          "autoconfig": {
            index: 1,
            type: "measure"
          }
        },
        label: {
          use: "property",
          "autoconfig": {
            "includeOnlyIDs": ["name"],
            "type": "string"
          }
        },
        size: {
          "autoconfig": {
              index: 2,
              type: "measure"
            }
        },
        color: {
          syncModels: ["marker_colorlegend"],
          "autoconfig": {}
        },
        size_label: {
          use: "constant",
          which: "_default",
          scaleType: "ordinal",
          _important: false,
          extent: [0, 0.33],
          allow: {
            names: ["_default"]
          }
        },
      },
      "marker_colorlegend": {
        "space": ["entities_colorlegend"],
        "label": {
          "use": "property",
          "which": "name"
        },
        "hook_rank": {
          "use": "property",
          "which": "rank"
        },
        "hook_geoshape": {
          "use": "property",
          "which": "shape_lores_svg"
        }
      }
    },
    locale: {},
    ui: {
      chart: {
      },
      buttons: ["colors", "find", "zoom", "trails", "lock", "moreoptions", "presentation", "sidebarcollapse", "fullscreen"],
      dialogs: {
        popup: ["colors", "find", "size", "zoom", "moreoptions"],
        sidebar: ["colors", "find", "size", "zoom"],
        moreoptions: ["opacity", "speed", "axes", "size", "colors", "label", "zoom", "presentation", "technical", "about"]
      }
    }
  },

  versionInfo: VERSION_INFO
};
