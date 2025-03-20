import { TextLayer } from "@deck.gl/layers";
import LabelMultiIconLayer from "./label-multi-icon-layer/label-multi-icon-layer";
import LabelBackgroundLayer from "./label-background-layer/label-background-layer";
import LabelLineLayer from "./label-line-layer/label-line-layer";
import LabelCloseButtonLayer from "./label-close-button-layer/label-close-button-layer";

export default class LabelLayer extends TextLayer {
  static defaultProps = {
    getLineSourceFillOffset: {type: 'accessor', value: 0},
    getRadius: {type: 'accessor', value: 0},
    getDragged: {type: 'accessor', value: 0.0},
  }
  
  getPickingInfo(e) {
    const {info, sourceLayer} = e;
    //console.log("bounds", this.getBoundingRect(info.object, info));
    if (info.index !== -1) {
      if (this.state.closeData?.[0]?.dataIndex !== info.index) {
        const labelSize = this.getBoundingRect(info.object, info).slice(2).map(b => b * this.props.getSize);
        this.setState({ labelSize, closeData: [Object.assign({labelSize, viewportW: info.viewport.width, viewportH: info.viewport.height, dataIndex: info.index }, info.object)]});
      }
    } else {
      this.setState({closeData: []});
    }
    return info;
  }

  //shouldUpdateState({props, oldProps, context, changeFlags}) {
  //  console.log("label shouldUpdateState", props, oldProps, context, changeFlags);
  //}
  /*
  updateState(e) {
    const {props, changeFlags} = e;
    if (changeFlags.dataChanged) {
    }
    console.log("updateState", props, changeFlags);
    return super.updateState(e);
  }
*/
  
  renderLayers() {
    /*const sLayers = super.renderLayers();
    const layers = sLayers.map(l => {
      return l && l.clone({
        updateTriggers: {...l.props.updateTriggers, getDragged: this.props.updateTriggers["getDragged"]},
        getDragged: this.props.getDragged
      })
    });
    */
    //console.log("LabelLayer", this.props.updateTriggers, this.props.transitions);

    return [
      new LabelLineLayer(
        this.getSubLayerProps({
          id: 'line',
          updateTriggers: {
            //getColor: [activeObject],
            getDragged: this.props.updateTriggers.getDragged,
            getTargetPixelOffset: this.props.updateTriggers.getPixelOffset,//[dragX, dragY],
            getSourcePosition: this.props.updateTriggers.getPosition,
            getTargetPosition: this.props.updateTriggers.getPosition,
          }
        }), {
          data: this.props.data,
          getColor: [102, 102, 102],
          getSourcePosition: this.props.getPosition,
          getTargetPosition: this.props.getPosition,
          getTargetPixelOffset: this.props.getPixelOffset,
          getSourceDashOffset: this.props.getLineSourceFillOffset,
          getBoundingRect: this.getBoundingRect,
          getRadius: this.props.getRadius,
          getSize: this.props.getSize,
          getWidth: 1,
          getDragged: this.props.getDragged,
          padding: this.props.backgroundPadding,
          edgeMaxCoord: this.props.edgeMaxCoord,
          transitions: {
            getSourcePosition: this.props.transitions?.getPosition,
            getTargetPosition: this.props.transitions?.getPosition,
            getTargetPixelOffset: this.props.transitions?.getPosition,
          }
          //pickable: true,
          //_dataDiff: (newData, oldData) => {
          //  console.log("_datediff line", newData, oldData, _updateRangesLine);
          //  return dataDiff ? playing ? _updateRangesLine : null : null;//}
        }
      ),
      //...layers,
      ...super.renderLayers(),
      this.state.closeData?.length && new LabelCloseButtonLayer(
        this.getSubLayerProps({
          id: 'close',
          _subLayerProps: {
            background: {
              type: LabelBackgroundLayer,
              cornerRadius: 0,
              getDragged: 1,
            },
            characters: {
              type: LabelMultiIconLayer,
              getDragged: 1,
            }
          },
          updateTriggers: {
            getPixelOffset: this.props.updateTriggers.getPixelOffset
          },
        }), {
          data: this.state.closeData || [],
          getPosition: (d) => { 
            //console.log("close pos", d);
            return this.props.getPosition(d, {index: d.dataIndex}); 
          },
          getPixelOffset: (d) => {
            const offset = typeof this.props.getPixelOffset == "function" ? this.props.getPixelOffset(d) : this.props.getPixelOffset.slice(0);

            //adjust label offset if label with current offset located outside of vieport
            //const offset = labelOffset[key];
            const pPos = this.context.viewport.project(this.props.getPosition(d, {index: d.dataIndex}).slice(0,2));
            const vW = d.viewportW;
            const vH = d.viewportH;
            const [lW, lH] = d.labelSize;
            const [lPaddL, lPaddT, lPaddR = lPaddL, lPaddB = lPaddT] = this.props.backgroundPadding;
            const dragged = this.props.getDragged.name ? this.props.getDragged(d) : this.props.getDragged;
                
            if (!dragged) {
              if(pPos[0] + offset[0] < lW + lPaddL) {
                offset[0] = lW - offset[0];
              }
              if(pPos[1] + offset[1] < lH + lPaddT) {
                offset[1] = lH - offset[1];
              }    
            }
      
            if(pPos[0] + offset[0] < lW + lPaddL) {
              offset[0] = lW + lPaddL - pPos[0];
            } else if(pPos[0] + offset[0] > vW - lPaddR) {
              offset[0] = vW - lPaddR - pPos[0];
            }
            
            if(pPos[1] + offset[1] < lH + lPaddT) {
              offset[1] = lH + lPaddT - pPos[1];
            } else if(pPos[1] + offset[1] > vH - lPaddB) {
              offset[1] = vH - lPaddB - pPos[1];
            }

            offset[0] += lPaddR + 9 * 0.5;//half size closecross .getSize
            offset[1] -= lH + lPaddT - 9 * 0.5;//half size closecross .getSize
            return offset;
          },
          getText: x=>"❌",
          getColor: [255, 255, 255],
          getSize: 9,
          getTextAnchor: 'end',
          getAlignmentBaseline: 'bottom',
          getDragged: x=>1,
          edgeMaxCoord: this.props.edgeMaxCoord,
          fontSettings: {
            sdf: true,
            fontSize: 9 * 3,
            buffer: 8,
          },
          characterSet:["❌"],
          //getPolygonOffset: null,//({layerIndex}) => [0, layerIndex * 100],
          pickable: true,
          background: true,
          backgroundPadding: [9, 9, 9, 8],
          getBackgroundColor: [0x60, 0x78, 0x89],
          getBorderColor: [255, 255, 255],
          getBorderWidth: 2,
          outlineColor: [255, 255, 255],
          outlineWidth: 2,
        }
      )
    ]
  }
}