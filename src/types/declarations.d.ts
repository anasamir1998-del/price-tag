declare module 'bwip-js' {
  interface ToCanvasOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: 'left' | 'center' | 'right' | 'off';
    textsize?: number;
    barcolor?: string;
    backgroundcolor?: string;
    [key: string]: any;
  }

  export function toCanvas(canvas: HTMLCanvasElement | string, options: ToCanvasOptions): HTMLCanvasElement;
  export function toDataURL(options: ToCanvasOptions): Promise<string>;
  const bwipjs: {
    toCanvas: typeof toCanvas;
    toDataURL: typeof toDataURL;
  };
  export default bwipjs;
}
