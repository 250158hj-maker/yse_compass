// パッケージマネージャを pnpm に強制する。npm / yarn / bun での install を止める。
//
// なぜ要るか：
//   package.json の packageManager（pnpm@11.17.0）と pnpm-workspace.yaml は
//   pnpm を前提にしている。他のパッケージマネージャで install すると
//   pnpm-lock.yaml と競合するロックファイルが生成される。
//   Corepack は yarn / pnpm のバージョンを固定するが npm は管理しないので、
//   npm install だけがすり抜ける。その穴をここで塞ぐ。
//
// なぜ only-allow（npx）ではなく自前スクリプトか：
//   npx only-allow は install のたびにネットワークから取得する必要があり、
//   CI でも毎回走る。依存を増やさずに同じことができるため自前にしている。
//
// 最後の砦は .gitignore（package-lock.json / yarn.lock / bun.lock* を無視）。
// npm はこのスクリプトが止める前にロックファイルを書くことがあるため、
// 「生成を止める」と「コミットを止める」の 2 段で守る。

const ua = process.env.npm_config_user_agent ?? "";
const detected = ua.split("/")[0];

if (detected !== "pnpm") {
  console.error(`
✗ このリポジトリは pnpm を使います（検出: ${detected || "不明"}）

    pnpm install

  npm / yarn / bun で install すると pnpm-lock.yaml と競合する
  ロックファイルが生成されます。
  pnpm が入っていない場合は corepack で用意できます:

    corepack enable

  Node と pnpm のバージョンは .nvmrc と package.json の packageManager で
  固定しています。理由は docs/design/08-architecture.md 8-6 を参照。
`);
  process.exit(1);
}
