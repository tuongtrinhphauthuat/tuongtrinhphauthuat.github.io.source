import { Color4 } from '@js-draw/math';

export const editorConfig = {
  canvas: {
    defaultWidth: 500,
    defaultHeight: 500,
  },
  stamps: {
    left: {
      text: 'TRÁI',
      fontFamily: 'Arial, sans-serif',
      fontSize: 40,
      fontWeight: 'bold',
      color: Color4.red,
      // Positioning offsets from the top-right corner
      offsetFromRight: 100,
      offsetFromTop: 40
    },
    right: {
      text: 'PHẢI',
      fontFamily: 'Arial, sans-serif',
      fontSize: 40,
      fontWeight: 'bold',
      color: Color4.red,
      // Positioning offsets from the top-right corner
      offsetFromRight: 100,
      offsetFromTop: 100
    }
  }
};
