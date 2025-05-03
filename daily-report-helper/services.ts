import { exists } from "jsr:@std/fs/exists";
import { Decrypter, Encrypter } from "age-encryption";

/**
 * Interface for file system operations
 */
export interface FileSystem {
  readTextFile(path: string): Promise<string>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  writeTextFile(path: string, text: string): Promise<void>; // 追加
}

export interface CryptoSystem {
  encrypt(data: Uint8Array | string): Promise<Uint8Array>;
  decrypt(data: Uint8Array): Promise<Uint8Array>;
}

/**
 * Default implementation of FileSystem using Deno APIs
 */
export class DenoFileSystem implements FileSystem {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async readFile(path: string): Promise<Uint8Array> {
    return await Deno.readFile(path);
  }

  async writeFile(path: string, data: Uint8Array): Promise<void> {
    await Deno.writeFile(path, data);
  }

  async exists(path: string): Promise<boolean> {
    return await exists(path);
  }

  // 追加: writeTextFile の実装
  async writeTextFile(path: string, text: string): Promise<void> {
    await Deno.writeTextFile(path, text);
  }
}

export class AgeCryptoSystem implements CryptoSystem {
  passphrase: string;
  encrypter: Encrypter;
  decrypter: Decrypter;

  constructor(passphrase: string) {
    this.passphrase = passphrase;

    this.encrypter = new Encrypter();
    this.encrypter.setPassphrase(passphrase);

    this.decrypter = new Decrypter();
    this.decrypter.addPassphrase(passphrase);
  }

  async encrypt(data: Uint8Array | string): Promise<Uint8Array> {
    return await this.encrypter.encrypt(data);
  }

  async decrypt(data: Uint8Array): Promise<Uint8Array> {
    return await this.decrypter.decrypt(data);
  }
}

/**
 * Container for all services
 */
export interface Services {
  fileSystem: FileSystem;
  cryptoSystem: CryptoSystem;
}

/**
 * Create default services using Deno APIs
 */
export function createDefaultServices(
  settings: { crypto: { passphrase: string } },
): Services {
  return {
    fileSystem: new DenoFileSystem(),
    cryptoSystem: new AgeCryptoSystem(settings.crypto.passphrase),
  };
}
