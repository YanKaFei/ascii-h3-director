# ASCII H3 Director

**생각을 변형하는 문자 체인으로 바꿉니다.**

ASCII H3 Director는 **MiniMax H3**를 위한 연출 도구입니다. 자유로운 설명을 변형 체인, 시간에 맞춘 압축 프롬프트, 결제 전에 멈출 수 있는 품질 게이트로 컴파일합니다. **DeepSeek Harness(DSH) 플러그인**이자 이식 가능한 **Agent Skill**입니다.

[中文](README.md) · [English](README.en.md) · **한국어** · [日本語](README.ja.md) · [Français](README.fr.md)

<p align="center">
  <sub>DSH ecosystem: <a href="https://github.com/YanKaFei/Costume-Director-Vault-Starter">Costume Director</a> · <a href="https://github.com/YanKaFei/art-aesthetic-vault">Art Aesthetic Vault</a> · <a href="https://github.com/YanKaFei/ascii-h3-director">ASCII H3 Director</a> · <a href="https://github.com/YanKaFei/2d-limited-mv-studio">2D Limited MV Studio</a> · <a href="https://github.com/YanKaFei/virtual-heroine-atlas">Virtual Heroine Atlas</a> · <a href="https://github.com/YanKaFei/smartstaff-ai-deepseek-plugin">SmartStaff AI</a></sub>
</p>


## 기능

- 21가지 모션 문법
- 결정론적 ASCII 프리뷰 엔진 (5×9 비트맵 폰트, 런타임 의존성 0)
- 이전 마지막 프레임에서 이어지는 seam 검사
- DSH Director Console
- 생성 전 7단계 품질 게이트

## 설치

```bash
dsh plugin --profile web add @yankafei/ascii-h3-director
```

또는 호환 환경에서 `SKILL.md`를 사용합니다.

## 사용

샷, 변형, 시퀀스를 설명하면 FilmSpec, 프롬프트 패키지, 프리뷰 계획을 반환합니다. 영상 모델을 직접 호출하지 않으며, 이미지/영상이 생성되었다고 주장하지 않습니다.

## 라이선스

MIT. [LICENSE](LICENSE)를 확인하세요.
