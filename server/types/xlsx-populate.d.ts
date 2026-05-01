declare module "xlsx-populate" {
  const XlsxPopulate: {
    fromBlankAsync(): Promise<any>;
    fromDataAsync(data: Buffer | Uint8Array | ArrayBuffer): Promise<any>;
    fromFileAsync(path: string): Promise<any>;
  };

  export default XlsxPopulate;
}
