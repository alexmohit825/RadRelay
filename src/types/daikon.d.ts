declare module 'daikon' {
  export class Image {
    constructor();
    getCols(): number;
    getRows(): number;
    getSeriesDescription(): string;
    getSeriesInstanceUID(): string;
    getSeriesNumber(): number;
    getModality(): string;
    getSliceLocation(): number;
    getImageNumber(): number;
    getSliceThickness(): number;
    getImageMax(): number;
    getImageMin(): number;
    getWindowWidth(): number;
    getWindowCenter(): number;
    getPatientName(): string;
    getPatientID(): string;
    getStudyDate(): string;
    getInterpretedData(returnCopy?: boolean, isRGB?: boolean): Float32Array | Int16Array | Uint8Array;
    getRawData(): ArrayBuffer;
    hasPixelData(): boolean;
    getOrientation(): string;
    getPixelSpacing(): number[];
    isCompressed(): boolean;
  }

  export class Series {
    constructor();
    addImage(image: Image): void;
    images: Image[];
    buildSeries(): void;
    validate(): boolean;
    countImages(): number;
  }

  export class Parser {
    static parse(data: ArrayBuffer): Image;
  }
}
