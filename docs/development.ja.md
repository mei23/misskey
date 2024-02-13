開発環境手順
================================================================

## 動かす方法

NODE_ENVが設定不要な以外はほぼsetup手順と同じです

依存パッケージをインストールしてconfigを設定してから
```
pnpm install
pnpm build
pnpm start
```

## コードを変更した後に変更を確認する方法

バージョンを変更する必要がありますが、developmentの場合は自動的にバージョンが設定されます。  

## 変更したコードを公開インスタンスで動かす場合

`package.json`の`version`を変更する必要があります。

Misskey及びMeisskeyは、AGPLなので改修した場合ソースコードは (少なくともインスタンスを公開していて要求されれば) 公開する必要があります。  
GitHub等のリポジトリで公開して、[src/const.json](../src/const.json) の `repositoryUrl` にURLを設定して、ビルド等を行った上で公開すると便利です。  
※ `src/const.json` の `copyright` は、旧Misskey部分のコードからしか参照されてないため、変更しても意味ないですし変更するべきではありません。

### ローカルでテストを動かす方法
```
cp test/test.yml .config/
```

```
docker-compose -f test/docker-compose.yml up
```
でテスト用のDBとRedisを上げる。
または、空の (データが消去されてもいい) DBを準備して`.config/test.yml`を調整する。

```
pnpm test
```

※ build後に実行する必要があります

### API endpointを追加削除したら

以下のコマンドでインデックスを更新する必要があります。

```
npx ts-node --swc src/tools/dev/gen-api-endpoints.ts
```
