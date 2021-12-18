# 全文検索

投稿の全文検索機能を利用するためには、MeCabをインストールして設定をする必要があります。

## 1. MeCabをインストールする

MeCabと辞書をインストールする必要があります。

ある程度単語が分割出来れば問題ないため、辞書の語彙はさほどなくて問題ありません。  
インデックス時と検索時に使用される辞書は同じ方が望ましいため、辞書はあまり変更・更新しないことを推奨します。

Ubuntu等の場合は以下でインストール出来ます。
```
apt install -y mecab mecab-ipadic-utf8
```

## 2. MeCabのパスを設定する

`.config/default.yml` でMeCab等のパスを指定して下さい。

先のUbuntu等のデフォルトでは以下のようになるはずです。
```
mecabSearch:
  mecabBin: mecab
```

## Dockerの場合

Dockerの場合はコンテナ内にMeCabがインストールされている必要があります。

Forkなどして、Dockerfileを以下のファイルで置き換えてconfigで上記パスを指定すれば使えるかもしれません。

https://github.com/mei23/misskey/blob/mei-m544/docs/examples/Dockerfile.mecab
