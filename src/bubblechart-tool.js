import "./styles.scss";
import { 
  BaseComponent,
  TimeSlider,
  DataNotes,
  DataWarning,
  ErrorMessage,
  LocaleService,
  LayoutService,
  CapitalVizabiService,
  MarkerContextmenu,
  TreeMenu,
  SteppedSlider,
  Dialogs,
  ButtonList,
  Repeater,
  versionInfo
} from "@vizabi/shared-components";
import {VizabiBubbleChart} from "./bubblechart-cmp.js";

export default class BubbleChart extends BaseComponent {

  constructor(config){

    const fullMarker = config.model.markers?.bubble;
    const fullMarkerLegend = config.model.markers?.legend;
    config.Vizabi.utils.applyDefaults(fullMarker?.config || {}, BubbleChart.DEFAULT_MODEL.bubble);   
    config.Vizabi.utils.applyDefaults(fullMarkerLegend?.config || {}, BubbleChart.DEFAULT_MODEL.legend);  

    const frameType = config.Vizabi.stores.encodings.modelTypes.frame;
    const { marker, splashMarker } = frameType.splashMarker(fullMarker);
    
    config.name = "bubblechart";

    config.subcomponents = [{
      type: Repeater,
      placeholder: ".vzb-repeater",
      model: marker,
      options: {
        repeatedComponent: VizabiBubbleChart,
        repeatedComponentCssClass: "vzb-bubblechart"
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
      type: MarkerContextmenu,
      placeholder: ".vzb-marker-contextmenu",
      model: marker,
      name: "marker-contextmenu"
    },{
      type: DataWarning,
      placeholder: ".vzb-datawarning",
      options: {appendButtonHere: ".vzb-repeater"},
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
      type: ErrorMessage,
      placeholder: ".vzb-errormessage",
      model: marker,
      name: "error-message"
    }];

    config.template = `
      <div class="vzb-repeater"></div>
      <div class="vzb-animationcontrols">
        <div class="vzb-timeslider"></div>
        <div class="vzb-speedslider"></div>
      </div>
      <div class="vzb-sidebar">
        <div class="vzb-dialogs"></div>
        <div class="vzb-buttonlist"></div>
      </div>
      <div class="vzb-treemenu"></div>
      <div class="vzb-marker-contextmenu"></div>
      <div class="vzb-datawarning"></div>
      <div class="vzb-datanotes"></div>
      <div class="vzb-errormessage"></div>
    `;

    config.locale.Vizabi = config.Vizabi;
    config.layout.Vizabi = config.Vizabi;
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
  "locale": { "id": "en", "shortNumberFormat": true },
  "layout": { "projector": false },

  //ui
  "buttons": {
    "buttons": ["markercontrols", "colors", "trails", "moreoptions", "presentation", "sidebarcollapse", "fullscreen"]
  },
  "dialogs": {
    "dialogs": {
      "popup": ["colors", "markercontrols", "moreoptions"],
      "sidebar": ["colors", "markercontrols", "size", "zoom"],
      "moreoptions": ["opacity", "speed", "axes", "size", "colors", "label", "zoom", "technical", "repeat", "presentation", "about"]
    },
    "markercontrols": {
      "disableSlice": true,
      "disableAddRemoveGroups": true,
      "primaryDim": null,
      "drilldown": null,
      "shortcutForSwitch": false,
      "shortcutForSwitch_allow": null
    }
  },
  "marker-contextmenu": {
    "primaryDim": null,
    "drilldown": null,
  },
  "chart": {
    "show_ticks": true,
    "showForecast": false,
    "showForecastOverlay": true,
    "pauseBeforeForecast": true,
    "endBeforeForecast": null, //value like "2022", auto-resolved to current time minus one frame step
    "opacityHighlight": 1.0,
    "opacitySelect": 1.0,
    "opacityHighlightDim": 0.1,
    "opacitySelectDim": 0.3,
    "opacityRegular": 0.8,
    "timeInBackground": true,
    "timeInTrails": true,
    "lockNonSelected": 0,
    "panWithArrow": true,
    "adaptMinMaxZoom": false,
    "cursorMode": "arrow",
    "zoomOnScrolling": true,
    "superhighlightOnMinimapHover": true,
    "whenHovering": {
      "showProjectionLineX": true,
      "showProjectionLineY": true,
      "higlightValueX": true,
      "higlightValueY": true
    },
    "labels": {
      "enabled": true,
      "dragging": true,
      "removeLabelBox": false
    },
    "margin": {
      "left": 0,
      "top": 0
    },
    "decorations": {
      "enabled": false,
      "xAxisGroups": null //left to be set by external page. example: {
      //   "gdp_pcap": [
      //     { "min": null, "max": 2650, "label": "incomegroups/level1", "label_short": "incomegroups/level1short" },
      //     { "min": 2650, "max": 8000, "label": "incomegroups/level2", "label_short": "incomegroups/level2short" },
      //     { "min": 8000, "max": 24200, "label": "incomegroups/level3", "label_short": "incomegroups/level3short" },
      //     { "min": 24200, "max": null, "label": "incomegroups/level4", "label_short": "incomegroups/level4short" }
      //   ]
      // }
    }
  },
  "data-warning": {
    "enable": false,
    "margin": {
      "LARGE": { "bottom": 90 },
      "MEDIUM": { "bottom": 70 },
      "SMALL": { "bottom": 50 }
    }
  },
  "tree-menu": {
    "showDataSources": false,
    "folderStrategyByDataset": {}
  }
};

BubbleChart.mainComponent = VizabiBubbleChart;

BubbleChart.DEFAULT_MODEL = {
  "bubble": {
    "requiredEncodings": ["x", "y", "size"],
    "encoding": {
      "show": { "modelType": "selection" },
      "selected": {
        "modelType": "selection",
        "data": { 
          "filter": { 
            "ref": `markers.bubble.encoding.trail.data.filter`
          }
        }
      },
      "highlighted": { "modelType": "selection" },
      "superhighlighted": { "modelType": "selection" },
      "x": {
        "data": { },
        "scale": {
          "allowedTypes": ["linear", "log", "genericLog", "pow", "time"]
        }
      },
      "y": {
        "modelType": "lane",
        "data": { },
        "scale": {
          "allowedTypes": ["linear", "log", "genericLog", "pow", "time", "rank"]
        }
      },
      "order": { 
        "modelType": "order",
        "direction": "desc",
        "data": { 
          "ref": `markers.bubble.encoding.size.data.config`
        }
      },
      "size": {
        "data": { },
        "scale": {
          "modelType": "size",
          "allowedTypes": ["linear", "point"],
          "range": [0, 50],
          "extent": [0, 1]
        }
      },
      "color": {
        "data": { "constant": "_default" },
        "scale": {
          "modelType": "color"
        }
      },
      "label": { "data": { "modelType": "entityPropertyDataConfig" } },
      "frame": { "modelType": "frame", "speed": 200, "splash": true },
      "trail": { "modelType": "trail", "show": false },             
      "size_label": {
        "data": {
          "constant": "_default"
        },
        "scale": {
          "extent": [0, 0.22],
          "modelType": "size",
          "allowedTypes": ["linear", "point"],
        }
      },
      "repeat": {
        "modelType": "repeat",
        "useConnectedRowsAndColumns": true,
        "row": ["y"],
        "column": ["x"],
        "allowEnc": ["y", "x"]
      }
    }
  },
  "legend": {
    "data": {
      "ref": {
        "transform": "entityConceptSkipFilter",
        "path": "markers.bubble.encoding.color"
      }
    },
    "encoding": {
      "color": {
        "data": {
          "concept": { "ref": "markers.bubble.encoding.color.data.concept" },
          "constant": { "ref": "markers.bubble.encoding.color.data.constant" }
        },
        "scale": {
          "modelType": "color",
          "palette": { "ref": "markers.bubble.encoding.color.scale.palette" },
          "domain": null,
          "range": null,
          "type": null,
          "zoomed": null,
          "zeroBaseline": false,
          "clamp": false,
          "allowedTypes": null
        }
        //"scale": { "ref": "markers.bubble.encoding.color.scale" }
      },
      "name": { "data": { } },
      "order": {
        "modelType": "order",
        "direction": "asc",
        "data": { }
      },
      "map": { "data": { } }
    }
  },
};

BubbleChart.versionInfo = { version: __VERSION, build: __BUILD, package: __PACKAGE_JSON_FIELDS, sharedComponents: versionInfo};
