# ASCII H3 Director

**Transformer une idée en une chaîne de caractères en mutation.**

ASCII H3 Director est un outil de réalisation pour **MiniMax H3** : il compile une description libre en chaîne de transformation, en prompt compact écrit pour le temps, et en contrôle qualité qui peut vous arrêter avant de payer. C’est à la fois un **plugin DeepSeek Harness (DSH)** et un **Agent Skill** portable.

[中文](README.md) · [English](README.en.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · **Français**

<p align="center">
  <sub>DSH ecosystem: <a href="https://github.com/YanKaFei/Costume-Director-Vault-Starter">Costume Director</a> · <a href="https://github.com/YanKaFei/art-aesthetic-vault">Art Aesthetic Vault</a> · <a href="https://github.com/YanKaFei/ascii-h3-director">ASCII H3 Director</a> · <a href="https://github.com/YanKaFei/2d-limited-mv-studio">2D Limited MV Studio</a> · <a href="https://github.com/YanKaFei/virtual-heroine-atlas">Virtual Heroine Atlas</a> · <a href="https://github.com/YanKaFei/smartstaff-ai-deepseek-plugin">SmartStaff AI</a></sub>
</p>


## Fonctions

- grammaire de mouvement à 21 mécanismes
- moteur de prévisualisation ASCII déterministe (police 5×9, zéro dépendance)
- continuation vérifiée depuis la dernière image
- Director Console pour DSH
- contrôle qualité en 7 points avant génération

## Installation

```bash
dsh plugin --profile web add @yankafei/ascii-h3-director
```

Ou utilisez `SKILL.md` dans un environnement compatible.

## Usage

Décrivez un plan, une transformation ou une séquence ; l’outil renvoie un FilmSpec, un package de prompts et un plan de prévisualisation. Il n’appelle pas lui-même un modèle vidéo et ne prétend jamais qu’une image/vidéo a été générée.

## Licence

MIT. Voir [LICENSE](LICENSE).
