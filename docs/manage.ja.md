# 運営ガイド

## 管理者ユーザーを設定する
``` shell
node cli/mark-admin (ユーザーID または ユーザー名)
```

例:
``` shell
# ユーザーID
node cli/mark-admin 57d01a501fdf2d07be417afe

# ユーザー名
node cli/mark-admin @syuilo
```

## 古いリモート投稿を削除する

90日以内のどこも参照も参照もされてないリモート投稿を削除します  
下の`clean-old-renotes`の後に行うと効果的です

```sh
node built/tools/clean-old-posts.js

# 指定範囲を30日以内にする場合
node built/tools/clean-old-posts.js 30
```

## 古いリモートRenoteを削除する

90日以内のリモートユーザーのリモート投稿に対するRenoteを削除します

```sh
node built/tools/clean-old-renotes.js

# 指定範囲を30日以内にする場合
node built/tools/clean-old-renotes.js 30
```

## 不要なリモートファイルを削除する

どこからも参照されていないリモートファイルを削除します  
現状自動削除されますが、自動削除実装前のファイルを削除できます

```sh
node built/tools/clean-unused-files.js
```

## statsを再集計する

```sh
node built/tools/recount-stats.js
```

## リモートカスタム絵文字を再同期

リモートカスタム絵文字のURLの更新と再保存を行います

```sh
node built/tools/resync-remote-emoji.js name@host
```
