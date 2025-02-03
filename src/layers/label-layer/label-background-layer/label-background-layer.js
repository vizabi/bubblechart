import { _TextBackgroundLayer } from '@deck.gl/layers';
import vs from './label-background-layer-vertex.glsl';
import fs from './label-background-layer-fragment.glsl';

export default class LabelBackgroundLayer extends _TextBackgroundLayer {
  static defaultProps = {
    getDragged: {type: 'accessor', value: 0.0},
  };

  initializeState() {
    super.initializeState();

    this.getAttributeManager().addInstanced({
      instanceDragged: {
        size: 1,
        transition: false,
        accessor: "getDragged",
        //accessor: (object, info) => {
        //  return this.parent.props.getDragged(object, info);
        //}
      },
    });
  }
  
  draw(params) {
    const {cornerRadius = 0} = this.props;
    const {edgeMaxCoord = 1.0 } = this.parent.props;
    params.uniforms.cornerRadius = cornerRadius;
    params.uniforms.edgeMaxCoord = edgeMaxCoord;
    super.draw(params);
  }

  getShaders() {
    return { ...super.getShaders(), vs, fs };
  }
}
