# Contribution guide
:v: Thanks for your contributions :v:

## Issues
Feature suggestions and bug reports are filed in https://github.com/mei23/misskey/issues .
Before creating a new issue, please search existing issues to avoid duplication.
If you find the existing issue, please add your reaction or comment to the issue.

## Tips

### endpoints

基本的にendpointsの下のファイルを削除/移動するような改修は行わない  
https://github.com/mei23/misskey/issues/86

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
yarn test
```
