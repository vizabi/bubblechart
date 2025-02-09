import { TextLayer } from "@deck.gl/layers";

export default class LabelCloseButtonLayer extends TextLayer {
  renderLayers() {
    if (this.props.data[0]) {
      const rect = this.getBoundingRect(this.props.data[0], {});
      const w = rect[2];
      const h = rect[3];
      const indexOffset = w > h ? 0 : 1;
      const padding = this.props.backgroundPadding;
      const paddingOffset = Math.abs(w - h) * 0.5 * this.props.getSize;
      padding[indexOffset] -= paddingOffset;
      padding[indexOffset + 2] -= paddingOffset;
      const cornerRadius = ((w > h ? h : w) * this.props.getSize + padding[1 - indexOffset] + padding[3 -indexOffset]) * 0.5 * 0.85;
      this.props._subLayerProps.background.cornerRadius = cornerRadius;
    }
    return super.renderLayers();
  }
}
