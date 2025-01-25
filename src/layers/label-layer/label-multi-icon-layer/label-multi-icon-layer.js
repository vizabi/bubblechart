import { _MultiIconLayer } from '@deck.gl/layers';
import vs from "./label-multi-icon-layer-vertex.glsl";

export default class LabelMultiIconLayer extends _MultiIconLayer {
  static defaultProps = {
    getBoundingRect: {type: 'accessor', value: [0, 0, 0, 0]},
    getDragged: {type: 'accessor', value: 0.0},
  };

  initializeState() {
    super.initializeState();

    this.getAttributeManager().addInstanced({
      instanceRects: {
        size: 4,
        //accessor: 'getBoundingRect'
        accessor: (object, info) => {
          return this.parent.getBoundingRect(object, info);
        }
      },
      instanceDragged: {
        size: 1,
        transition: false,
        accessor: "getDragged",
        //accessor: (object, info) => {
        //  console.log("dragged",this.id, this.parent.props.getDragged(object, info));          
        //  return this.parent.props.getDragged(object, info);
        //}
      },
    });

  }
  
  draw(params) {
    const {edgeMaxCoord = 1.0 } = this.parent.props;
    let { backgroundPadding: padding = [0.0, 0.0, 0.0, 0.0] } = this.parent.props;
    if (padding.length < 4) {
      padding = [padding[0], padding[1], padding[0], padding[1]];
    }    
    params.uniforms.padding = padding;
    params.uniforms.edgeMaxCoord = edgeMaxCoord;
    super.draw(params);
  }

  getShaders() {
    return { ...super.getShaders(), vs };
  }
}
