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

## 라이브러리 — MIT

`lib/`: [three.js](https://threejs.org) r160 (`three.module.js`, `EXRLoader.js`)과 [fflate](https://github.com/101arrowz/fflate)입니다. 라이선스 전문은 `lib/three.LICENSE`에 있습니다.

## 게임 내 생성 에셋

캐릭터·건물 모델, 현판·깃발·태극 문양 텍스처, 효과음은 모두 코드로 생성하므로 외부 에셋이 없습니다.
