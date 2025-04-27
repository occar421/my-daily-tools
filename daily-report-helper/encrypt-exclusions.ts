import { Encrypter } from "age-encryption";
import { exists } from "jsr:@std/fs/exists";

/**
 * アプリケーションの設定情報
 */
interface Config {
  inputFile: string;
  outputFile: string;
  envVars: {
    passphrase: string;
  };
}

/**
 * 環境設定を読み込み、バリデーションする
 */
function loadConfig(): Config {
  const inputFile = "exclusions.json5";
  const outputFile = `${inputFile}.age`;

  // 環境変数を取得して検証
  const passphrase = Deno.env.get("PASSPHRASE");
  if (!passphrase) {
    throw new Error("環境変数 'PASSPHRASE' が設定されていません");
  }

  return {
    inputFile,
    outputFile,
    envVars: {
      passphrase,
    },
  };
}

/**
 * 設定ファイルを暗号化する
 */
async function main() {
  try {
    // 設定を一度だけロードし、以降はその値を使用
    const config = loadConfig();

    const encrypter = initializeEncrypter(config.envVars.passphrase);
    const plaintext = await readInputFile(config.inputFile);
    const ciphertext = await encrypter.encrypt(plaintext);

    if (await shouldProceedWithWrite(config.outputFile)) {
      await writeOutputFile(config.outputFile, ciphertext);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * 暗号化ツールを初期化する
 */
function initializeEncrypter(passphrase: string): Encrypter {
  const encrypter = new Encrypter();
  encrypter.setPassphrase(passphrase);
  return encrypter;
}

/**
 * 入力ファイルを読み込む
 */
async function readInputFile(filePath: string): Promise<string> {
  const buffer = await Deno.readFile(filePath);
  return new TextDecoder().decode(buffer);
}

/**
 * 出力ファイルの書き込みを行うべきかを確認する
 */
async function shouldProceedWithWrite(filePath: string): Promise<boolean> {
  if (await exists(filePath)) {
    console.warn(`警告: ファイル '${filePath}' は既に存在します。`);
    const shouldOverwrite = confirm(
      `ファイル '${filePath}' を上書きしますか？`,
    );

    if (!shouldOverwrite) {
      console.log("処理をキャンセルしました。ファイルは上書きされません。");
      return false;
    }
    console.log("ファイルを上書きします...");
  }
  return true;
}

/**
 * 暗号化されたデータをファイルに書き込む
 */
async function writeOutputFile(
  filePath: string,
  data: Uint8Array,
): Promise<void> {
  await Deno.writeFile(filePath, data);
  console.log(`暗号化されたファイルが正常に保存されました: ${filePath}`);
}

/**
 * エラーを適切に処理する
 */
function handleError(error: unknown): never {
  if (error instanceof Deno.errors.NotFound) {
    const config = loadConfig();
    console.error(`エラー: ファイル '${config.inputFile}' が見つかりません。`);
    Deno.exit(1);
  } else {
    console.error(
      `予期せぬエラーが発生しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}

await main();
