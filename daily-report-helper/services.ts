/**
 * Interface for file system operations
 */
export interface FileSystem {
  readTextFile(path: string): Promise<string>;
  readFile(path: string): Promise<Uint8Array>;
  writeFile(path: string, data: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
}

/**
 * Interface for environment operations
 */
export interface Environment {
  getEnv(key: string): string | undefined;
  getArgs(): string[];
  exit(code: number): never;
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
    try {
      await Deno.stat(path);
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Default implementation of Environment using Deno APIs
 */
export class DenoEnvironment implements Environment {
  getEnv(key: string): string | undefined {
    return Deno.env.get(key);
  }

  getArgs(): string[] {
    return [...Deno.args];
  }

  exit(code: number): never {
    return Deno.exit(code);
  }
}

/**
 * Container for all services
 */
export interface Services {
  fileSystem: FileSystem;
  environment: Environment;
}

/**
 * Create default services using Deno APIs
 */
export function createDefaultServices(): Services {
  return {
    fileSystem: new DenoFileSystem(),
    environment: new DenoEnvironment(),
  };
}