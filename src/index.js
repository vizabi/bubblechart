import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataNotes,
  LocaleService,
  LayoutService,
  TreeMenu,
  SteppedSlider,
  ButtonList,
  Repeater
} from "VizabiSharedComponents";
import VizabiBubbleChart from "./component.js";

const VERSION_INFO = { version: __VERSION, build: __BUILD };

export default class BubbleChart extends BaseComponent {

  constructor(config){
    const marker = config.model.stores.markers.get("bubble");

    config.subcomponents = [{
      type: Repeater,
      placeholder: ".vzb-repeater",
      model: marker,
      options: {
        COMP_TYPE: VizabiBubbleChart,
        COMP_CSSNAME: "vzb-bubblechart"
      }
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
      type: DataNotes,
      placeholder: ".vzb-datanotes",
      model: marker
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
        <div class="vzb-buttonlist"></div>
      </div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-datanotes"></div>
    `;

    config.services = {
      locale: new LocaleService(),
      layout: new LayoutService(config)
    };

    //register locale service in the marker model
    config.model.config.markers.bubble.data.locale = config.services.locale;

    super(config);
  }
}








//export default 
const _BubbleChart = {

  /**
   * Initializes the tool (Bubble Chart Tool).
   * Executed once before any template is rendered.
   * @param {Object} placeholder Placeholder element for the tool
   * @param {Object} external_model Model as given by the external page
   */
  init(placeholder, external_model) {

    this.name = "bubblechart";

    //specifying components
    this.components = [{
      component,
      placeholder: ".vzb-tool-viz",
      model: ["state.time", "state.marker", "locale", "ui"] //pass models to component
    }, {
      component: Vizabi.Component.get("timeslider"),
      placeholder: ".vzb-tool-timeslider",
      model: ["state.time", "state.marker", "ui"]
    }, {
      component: Vizabi.Component.get("dialogs"),
      placeholder: ".vzb-tool-dialogs",
      model: ["state", "ui", "locale"]
    }, {
      component: Vizabi.Component.get("buttonlist"),
      placeholder: ".vzb-tool-buttonlist",
      model: ["state", "ui", "locale"]
    }, {
      component: Vizabi.Component.get("treemenu"),
      placeholder: ".vzb-tool-treemenu",
      model: ["state.marker", "state.time", "locale", "ui"]
    }, {
      component: Vizabi.Component.get("datawarning"),
      placeholder: ".vzb-tool-datawarning",
      model: ["locale"]
    }, {
      component: Vizabi.Component.get("datanotes"),
      placeholder: ".vzb-tool-datanotes",
      model: ["state.marker", "locale"]
    }, {
      component: Vizabi.Component.get("steppedspeedslider"),
      placeholder: ".vzb-tool-stepped-speed-slider",
      model: ["state.time", "locale"]
    }];

    this._super(placeholder, external_model);

  },

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
          enabled: true,
          dragging: true,
          removeLabelBox: false
        },
        margin: {
          left: 0,
          top:0
        },
        trails: true,
        lockNonSelected: 0
      },
      datawarning: {
        doubtDomain: [],
        doubtRange: []
      },
      numberFormatSIPrefix: true,
      show_ticks: true,
      presentation: false,
      panWithArrow: false,
      adaptMinMaxZoom: false,
      cursorMode: "arrow",
      zoomOnScrolling: false,
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
