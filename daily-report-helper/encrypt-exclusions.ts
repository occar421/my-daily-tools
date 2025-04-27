import { Encrypter } from "age-encryption";
import { exists } from "jsr:@std/fs/exists";

const passphrase = Deno.env.get("PASSPHRASE");

if (!passphrase) {
  throw new Error("PASSPHRASE is not set");
}

const encrypter = new Encrypter();
encrypter.setPassphrase(passphrase);

const RAW_CONFIG_FILE = "exclusions.json5";
const OUTPUT_FILE = `${RAW_CONFIG_FILE}.age`;

try {
  const buffer = await Deno.readFile(RAW_CONFIG_FILE);
  const text = new TextDecoder().decode(buffer);

  const ciphertext = await encrypter.encrypt(text);

  // 出力ファイルが既に存在するか確認
  if (await exists(OUTPUT_FILE)) {
    console.warn(`警告: ファイル '${OUTPUT_FILE}' は既に存在します。`);
    const shouldOverwrite = confirm(
      `ファイル '${OUTPUT_FILE}' を上書きしますか？`,
    );

    if (!shouldOverwrite) {
      console.log("処理をキャンセルしました。ファイルは上書きされません。");
      Deno.exit(0);
    }
    console.log("ファイルを上書きします...");
  }

  await Deno.writeFile(OUTPUT_FILE, ciphertext);
  console.log(`暗号化されたファイルが正常に保存されました: ${OUTPUT_FILE}`);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.error(`エラー: ファイル '${RAW_CONFIG_FILE}' が見つかりません。`);
    Deno.exit(1);
  } else {
    console.error(`予期せぬエラーが発生しました: ${error}`);
    throw error;
  }
}
