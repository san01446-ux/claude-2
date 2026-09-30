# 에셋 출처 및 라이선스 (Credits)

게임 코드 외에 포함된 외부 에셋과 라이선스입니다. 에셋을 추가하거나 바꿀 때 이 파일도 함께 갱신하세요.

## 텍스처 — CC BY 4.0 (출처 표기 필요)

`assets/textures/`의 모든 이미지는 [Babylon.js Assets](https://github.com/BabylonJS/Assets) 저장소에서 가져왔습니다.
라이선스는 [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)이며, 512×512로 축소하고 압축한 것 외에는 수정하지 않았습니다.

| 파일 | 원본 |
| --- | --- |
| grass.jpg | `textures/grass.jpg` |
| dirt.jpg | `textures/dirt.jpg` |
| stone_floor.jpg | `textures/floor.png` |
| stone_floor_normal.png | `textures/floorn.png` |
| rock.jpg | `textures/rockyGround_basecolor.png` |
| rock_normal.jpg | `textures/rockyGround_normal.png` |
| wood.jpg | `textures/woodAlbedo.png` |

> Textures © Babylon.js contributors, licensed under CC BY 4.0 — https://github.com/BabylonJS/Assets

## 환경광 HDRI — CC0

`assets/hdri/park.exr`: [Poly Haven](https://polyhaven.com/hdris)의 HDRI입니다. [@pmndrs/assets](https://github.com/pmndrs/assets)가 512px EXR로 변환한 버전을 썼습니다. CC0 1.0이므로 출처 표기가 필요 없습니다.

## 글꼴 — SIL Open Font License 1.1

`assets/fonts/`: 나눔명조, 나눔손글씨 붓 (© NHN Corporation)입니다. [Fontsource](https://fontsource.org) 패키지에서 게임 UI에 쓰는 글자만 남겨 서브셋했고, 서브셋은 `tools/subset_fonts.py`로 다시 만들 수 있습니다. 라이선스 전문은 `assets/fonts/LICENSE-OFL.txt`에 있습니다.

## UI 일러스트 — PixAI로 생성

`assets/images/`의 모든 이미지(타이틀·패배 화면 배경, 초상화, 스킬 아이콘, 무공 비급 카드)는 [PixAI](https://pixai.art)로 생성했습니다.

- 모델: **Tsubaki.2 v1** (modelVersionId `1983308862240288769`), `standard` 모드. 모든 이미지를 같은 모델과 같은 화풍 프롬프트로 만들었습니다.
- 후처리: 요구 크기로 리사이즈하고 WebP(품질 80)로 저장했습니다. 타이틀(1280×720)과 패배 화면(1280×720) 원본은 1920×1080, 1600×900으로 확대했습니다. 비급 카드 9장은 모델이 넣은 가짜 글자·낙관을 인페인팅으로 지웠습니다.
- 상업적 이용: PixAI 이용약관상 생성물의 소유권을 PixAI가 주장하지 않으며 유료 회원 여부와 관계없이 약관 범위 안에서 상업적 이용이 허용됩니다. 단, AI 생성물의 저작권 보호 여부는 국가별로 불확실합니다. ([이용약관](https://pixai.art/en/terms), 2026-09-30 확인)

## 라이브러리 — MIT

`lib/`: [three.js](https://threejs.org) r160 (`three.module.js`, `EXRLoader.js`)과 [fflate](https://github.com/101arrowz/fflate)입니다. 라이선스 전문은 `lib/three.LICENSE`에 있습니다.

## 게임 내 생성 에셋

캐릭터·건물 모델, 현판·깃발·태극 문양 텍스처, 효과음은 모두 코드로 생성하므로 외부 에셋이 없습니다. (2D UI 일러스트는 위의 PixAI 항목 참고)
