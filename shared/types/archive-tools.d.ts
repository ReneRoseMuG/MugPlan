declare module "archiver" {
  type ArchiverFormat = "zip";

  interface ArchiverOptions {
    zlib?: {
      level?: number;
    };
  }

  interface Archiver {
    pipe(destination: NodeJS.WritableStream): void;
    append(source: string | Buffer, data: { name: string }): void;
    directory(source: string, destination: string | false): void;
    on(event: "error", listener: (error: Error) => void): this;
    finalize(): Promise<void>;
  }

  function archiver(format: ArchiverFormat, options?: ArchiverOptions): Archiver;

  namespace archiver {
    export type Archiver = import("archiver").Archiver;
  }

  export default archiver;
}

declare module "unzipper" {
  namespace unzipper {
    interface CentralDirectoryFile {
      path: string;
      buffer(): Promise<Buffer>;
    }

    interface CentralDirectory {
      files: CentralDirectoryFile[];
    }
  }

  const unzipper: {
    Open: {
      buffer(input: Buffer): Promise<unzipper.CentralDirectory>;
    };
  };

  export default unzipper;
}
