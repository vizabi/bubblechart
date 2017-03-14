import "./styles.scss";
import component from "./component";

export default Vizabi.Tool.extend("BubbleChart", {

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
      model: ["state.time", "state.entities", "state.marker", "locale", "ui"] //pass models to component
    }, {
      component: Vizabi.Component.get("timeslider"),
      placeholder: ".vzb-tool-timeslider",
      model: ["state.time", "state.entities", "state.marker", "ui"]
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
      model: ["state.marker", "state.marker_tags", "state.time", "locale"]
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

    if (model.ui.chart.lockNonSelected) {
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
        autogenerate: {
          data: "data",
          conceptIndex: 0,
          conceptType: "time"
        }
      },
      entities: {
        autogenerate: {
          data: "data",
          conceptIndex: 0
        }
      },
      entities_colorlegend: {
        autogenerate: {
          data: "data",
          conceptIndex: 0
        }
      },
      entities_tags: {},
      marker_tags: {
        space: ["entities_tags"],
        label: {},
        hook_parent: {}
      },
      marker: {
        space: ["entities", "time"],
        axis_x: {
          use: "indicator",
          autogenerate: {
            conceptIndex: 1,
            conceptType: "measure"
          }
        },
        axis_y: {
          use: "indicator",
          autogenerate: {
            conceptIndex: 0,
            conceptType: "measure"
          }
        },
        label: {
          use: "property",
          autogenerate: {
            conceptIndex: 0
          }
        },
        size: {
          autogenerate: {
            conceptIndex: 2,
            conceptType: "measure"
          }
        },
        color: {
          syncModels: ["marker_colorlegend"],
          autogenerate: {
            conceptIndex: 0,
            conceptType: "entity_set"
          }
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
        whenHovering: {
          showProjectionLineX: true,
          showProjectionLineY: true,
          higlightValueX: true,
          higlightValueY: true
        },
        labels: {
          dragging: true,
          removeLabelBox: false
        },
        trails: true,
        lockNonSelected: 0
      },
      datawarning: {
        doubtDomain: [],
        doubtRange: []
      },
      presentation: false,
      panWithArrow: false,
      adaptMinMaxZoom: false,
      cursorMode: "arrow",
      zoomOnScrolling: false,
      buttons: ["colors", "find", "trails", "lock", "moreoptions", "fullscreen", "presentation"],
      dialogs: {
        popup: ["colors", "find", "size", "zoom", "moreoptions"],
        sidebar: ["colors", "find", "size", "zoom"],
        moreoptions: ["opacity", "speed", "axes", "size", "colors", "label", "zoom", "presentation", "about"]
      }
    }
  }
});
