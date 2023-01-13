# Contribution guide
:v: Thanks for your contributions :v:

## Issues
Feature suggestions and bug reports are filed in https://github.com/mei23/misskey/issues .
Before creating a new issue, please search existing issues to avoid duplication.
If you find the existing issue, please add your reaction or comment to the issue.

## Tips

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

### API endpointを追加削除したら

以下のコマンドでインデックスを更新する必要があります。

```
npx ts-node --swc src/tools/dev/gen-api-endpoints.ts
```
