# ASCII H3 Director

**ひとつの想念を、変形する文字の連鎖へ。**

ASCII H3 Director は **MiniMax H3** のための演出ツールです。自由な記述を、変形チェーン、時間に向けて書かれた簡潔なプロンプト、支払い前に止められる品質ゲートへコンパイルします。**DeepSeek Harness（DSH）プラグイン**であり、移植可能な **Agent Skill** でもあります。

[中文](README.md) · [English](README.en.md) · [한국어](README.ko.md) · **日本語** · [Français](README.fr.md)

<p align="center">
  <sub>DSH ecosystem: <a href="https://github.com/YanKaFei/Costume-Director-Vault-Starter">Costume Director</a> · <a href="https://github.com/YanKaFei/art-aesthetic-vault">Art Aesthetic Vault</a> · <a href="https://github.com/YanKaFei/ascii-h3-director">ASCII H3 Director</a> · <a href="https://github.com/YanKaFei/2d-limited-mv-studio">2D Limited MV Studio</a> · <a href="https://github.com/YanKaFei/virtual-heroine-atlas">Virtual Heroine Atlas</a> · <a href="https://github.com/YanKaFei/smartstaff-ai-deepseek-plugin">SmartStaff AI</a></sub>
</p>


## できること

- 21 のモーション文法
- 決定論的 ASCII プレビューエンジン（5×9 ビットマップ、実行時依存ゼロ）
- 前の最終フレームから継ぐシーム検査
- DSH Director Console
- 生成前の 7 項目品質ゲート

## インストール

```bash
dsh plugin --profile web add @yankafei/ascii-h3-director
```

または互換環境で `SKILL.md` を使います。

## 使い方

ショット、変形、シーケンスを記述すると、FilmSpec、プロンプトパッケージ、プレビュー計画を返します。動画モデル自体は呼び出さず、画像/動画が生成されたとは主張しません。

## ライセンス

MIT。[LICENSE](LICENSE) を参照。
