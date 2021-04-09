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
import { isObservableArray } from "mobx";

const VERSION_INFO = { version: __VERSION, build: __BUILD };

export default class BubbleChart extends BaseComponent {

  constructor(config){
    
    applyDefaults(config.model.markers.bubble.config, BubbleChart.DEFAULT_CORE);    
    const marker = config.model.markers.bubble.encoding.frame.splash.marker;

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
      layout: new LayoutService(config.layout)
    };

    super(config);
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
        data: { concept: { 
            ref: "markers.bubble.encoding.size.data.concept"
        } }
    },
    "size": {
        scale: {
            modelType: 'size',
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
        allowedTypes: ["linear", "log", "genericLog", "pow", "point"]
      }
    },
    "repeat": {
      modelType: "repeat",
      row: ["y"],
      column: ["x"]
    }
  }
}





 
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


// code from https://github.com/TehShrike/is-mergeable-object
function isMergeableObject(value) {
  return isNonNullObject(value) &&
      !isSpecial(value)
}

function isNonNullObject(value) {
  return !!value && typeof value === 'object'
}

function isSpecial(value) {
  var stringValue = Object.prototype.toString.call(value)

  return stringValue === '[object RegExp]' ||
      stringValue === '[object Date]' ||
      isObservableArray(value) ||
      isReactElement(value)
}

// see https://github.com/facebook/react/blob/b5ac963fb791d1298e7f396236383bc955f916c1/src/isomorphic/classic/element/ReactElement.js#L21-L25
var canUseSymbol = typeof Symbol === 'function' && Symbol.for
var REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for('react.element') : 0xeac7

function isReactElement(value) {
  return value.$$typeof === REACT_ELEMENT_TYPE
}

// c merge and helpers
// code from https://github.com/KyleAMathews/deepmerge
function emptyTarget(val) {
  return Array.isArray(val) ? [] : {}
}

function cloneUnlessOtherwiseSpecified(value, options) {
  return (options.clone !== false && options.isMergeableObject(value)) ?
      deepmerge(emptyTarget(value), value, options) :
      value
}

function defaultArrayMerge(target, source, options) {
  return target.concat(source).map(function(element) {
      return cloneUnlessOtherwiseSpecified(element, options)
  })
}

function mergeObject(target, source, options) {
  var destination = {}
  if (options.isMergeableObject(target)) {
      Object.keys(target).forEach(function(key) {
          destination[key] = cloneUnlessOtherwiseSpecified(target[key], options)
      })
  }
  Object.keys(source).forEach(function(key) {
      if (!options.isMergeableObject(source[key]) || !target[key]) {
          destination[key] = cloneUnlessOtherwiseSpecified(source[key], options)
      } else {
          destination[key] = deepmerge(target[key], source[key], options)
      }
  })
  return destination
}

const overwriteMerge = (destinationArray, sourceArray, options) => sourceArray

function deepmerge(target, source, options) {
  options = options || {}
  options.arrayMerge = options.arrayMerge || overwriteMerge
  options.isMergeableObject = options.isMergeableObject || isMergeableObject

  var sourceIsArray = Array.isArray(source)
  var targetIsArray = Array.isArray(target)
  var sourceAndTargetTypesMatch = sourceIsArray === targetIsArray

  if (!sourceAndTargetTypesMatch) {
      return cloneUnlessOtherwiseSpecified(source, options)
  } else if (sourceIsArray) {
      return options.arrayMerge(target, source, options)
  } else {
      return mergeObject(target, source, options)
  }
}

deepmerge.all = function deepmergeAll(array, options) {
  if (!Array.isArray(array)) {
      throw new Error('first argument should be an array')
  }

  return array.reduce(function(prev, next) {
      return deepmerge(prev, next, options)
  }, {})
}

function deepclone(object) {
  return deepmerge({}, object);
}

function applyDefaults(config, defaults) {
  const defaultProps = Object.keys(defaults);
  defaultProps.forEach(prop => {
      if (!config.hasOwnProperty(prop)) {
          if (isMergeableObject(defaults[prop]))
              config[prop] = deepclone(defaults[prop]); // object
          else
              config[prop] = defaults[prop]; // non object, i.e. value
      } else if (isMergeableObject(defaults[prop])) {
          if (isMergeableObject(config[prop]))
              applyDefaults(config[prop], defaults[prop]);
      }
  })
  return config;
}