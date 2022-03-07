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

## ハウスキーピング系

### 古いリモートRenoteを削除する

90日以内のリモートユーザーのリモート投稿に対するRenoteを削除します  

```sh
node built/tools/clean-old-renotes.js

# 指定範囲を30日以内にする場合
node built/tools/clean-old-renotes.js 30
```

### 古いリモート投稿を削除する

90日以内のどこからも参照されてないリモート投稿を削除します  
日数は引数で変更可能です

```sh
node built/tools/clean-old-posts.js
```

### 削除された投稿を物理削除する

90日以内の削除されたリモート投稿をDBから物理削除します  
日数は引数で変更可能です

```sh
node built/tools/clean-deleted-posts.js
```

### 古い通知を物理削除する

90日以内の通知をDBから物理削除します  
日数は引数で変更可能です

```sh
node built/tools/clean-old-notifications.js
```

### 古い検索インデックスを削除する

90日以内の検索インデックスと1日以内のトレンドインデックスを削除します  
検索インデックスの日数は引数で変更可能です

```sh
node built/tools/clean-old-index.js
```

### 削除されたユーザーの残存オブジェクトを削除する

なぜか残ってしまっている削除済みユーザーのフォローや通知を削除します

```sh
node built/tools/clean-deleted-user-objs.js
```

### 不要なリモートファイルを削除する

どこからも参照されていないリモートファイルを削除します  
現状自動削除されますが、自動削除実装前のファイルを削除できます

```sh
node built/tools/clean-unused-files.js
```

### リモートファイルのキャッシュを削除する

リモートファイルのキャッシュを削除します。  
削除後は、直リンクまたはプロキシになります。

```sh
node built/tools/clean-remote-files.js
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
