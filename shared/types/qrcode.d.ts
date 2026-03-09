declare module "qrcode" {
  type QRCodeRenderOptions = {
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
  };

  type QRCodeModule = {
    toDataURL(text: string, options?: QRCodeRenderOptions): Promise<string>;
  };

  const qrCode: QRCodeModule;
  export default qrCode;
}
