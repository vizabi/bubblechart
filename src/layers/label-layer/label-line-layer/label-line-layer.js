import { LineLayer } from "@deck.gl/layers";
import vs from "./label-line-layer-vertex.glsl";

export default class LabelLineLayer extends LineLayer {
  static defaultProps = {
    getTargetPixelOffset: {type: 'accessor', value: [0, 0]},
    getSourceDashOffset: {type: 'accessor', value: 0},
    getBoundingRect: {type: 'accessor', value: [0, 0, 0, 0]},
    getSize: {type: 'accessor', value: 0},
    getRadius: {type: 'accessor', value: 0},
    getDragged: {type: 'accessor', value: 0.0},
  };

  initializeState() {
    super.initializeState();

    this.getAttributeManager().addInstanced({
      instanceTargetPixelOffsets: {
        size: 2,
        transition: true,
        accessor: 'getTargetPixelOffset'
      },
      instanceSourceDashOffsets: {
        size: 1,
        transition: true,
        accessor: 'getSourceDashOffset',
        defaultValue: 1
      },
      instanceRects: {
        size: 4,
        accessor: 'getBoundingRect'
      },
      instanceSizes: {
        size: 1,
        transition: true,
        accessor: 'getSize',
        defaultValue: 0
      },
      instanceRadius: {
        size: 1,
        transition: true,
        accessor: 'getRadius',
        defaultValue: 1
      },
      instanceDragged: {
        size: 1,
        transition: false,
        accessor: 'getDragged'
      }
    });
  }

  draw(params) {
    const { edgeMaxCoord = 1.0 } = this.props;
    let { padding = [0.0, 0.0, 0.0, 0.0] } = this.props;
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
