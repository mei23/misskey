Dockerを使ったMisskey構築方法
================================================================

このガイドはDockerを使ったMisskeyセットアップ方法について解説します。

----------------------------------------------------------------

*1.* Misskeyのダウンロード
----------------------------------------------------------------
1. Misskeyレポジトリをクローン

	`git clone -b mei-m544 https://github.com/mei23/misskey.git`

2. misskeyディレクトリに移動

	`cd misskey`

*2.* 設定ファイルを作成する
----------------------------------------------------------------
1. `cp .config/example.yml .config/default.yml` `.config/example.yml`をコピーし名前を`default.yml`にする
2. `cp .config/mongo_initdb_example.js .config/mongo_initdb.js` `.config/mongo_initdb_example.js`をコピーし名前を`mongo_initdb.js`にする
3. `default.yml`と`mongo_initdb.js`を編集する

`default.yml`内の各ホストは以下にしてください
```
redis.host => redis
mongodb.host => mongo
es.host => es
```

*3.* Dockerの設定
----------------------------------------------------------------
`docker-compose.yml`を編集してください。

*4.* Misskeyのビルド
----------------------------------------------------------------
次のコマンドでMisskeyをビルドしてください:

`docker-compose build`

*5.* 以上です！
----------------------------------------------------------------
お疲れ様でした。これでMisskeyを動かす準備は整いました。

### 通常起動
`docker-compose up -d`するだけです。GLHF!

### Misskeyを最新バージョンにアップデートする方法:
1. `git stash`
2. `git checkout mei-m544`
3. `git pull`
4. `git stash pop`
5. `docker-compose build`
7. `docker-compose stop && docker-compose up -d`

### cliコマンドを実行する方法:

`docker-compose run --rm web node cli/mark-admin @example`

----------------------------------------------------------------

なにかお困りのことがありましたらお気軽にご連絡ください。
