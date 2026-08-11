# Pokenergy

GitHub Pages에 그대로 올려 실행하는 정적 웹게임 프로젝트입니다. 별도의 빌드 과정이나 npm 설치가 필요하지 않습니다.

## 배포 방법

1. 이 저장소의 파일을 GitHub 저장소 최상단에 업로드합니다.
2. 저장소의 **Settings → Pages**로 이동합니다.
3. **Build and deployment → Deploy from a branch**를 선택합니다.
4. Branch는 `main`, 폴더는 `/(root)`를 선택하고 저장합니다.
5. 생성된 GitHub Pages 주소로 접속합니다.

## 프로젝트 구조

```text
pokenergy/
├─ index.html
├─ .nojekyll
└─ src/
   ├─ main.js
   ├─ styles.css
   ├─ config/
   ├─ data/
   ├─ core/
   ├─ systems/
   ├─ ui/
   └─ utils/
```

## 현재 UI 구조

- 상단 고정 바: 18타입 에너지 보유량 / 초당 생산량
- 좌측 고정 메뉴: 포탈 / 포켓몬 / 도감 / 설정
- 포탈: 투입 에너지 / 포탈 활성화 / 기록
- 포켓몬: 현재 보유 중인 포켓몬과 개체 수
- 도감: 도감번호 정렬, 발견 필터, 상세 정보
- 설정: 수동 저장 / 불러오기 / 초기화

## 확장 원칙

- 새 포켓몬: `src/data/pokemon.js`
- 세계관/도입 기록: `src/data/story.js`
- 새 조건 종류: `src/systems/conditionRegistry.js`
- 새 효과 종류: `src/systems/effectRegistry.js`
- 포탈 동작: `src/systems/PortalSystem.js`
- 생산 계산: `src/systems/ProductionSystem.js`
- 화면: `src/ui/AppView.js`

포켓몬별 조건과 효과는 데이터로 정의하며 핵심 시스템에 포켓몬별 `if` 문을 추가하지 않는 것을 원칙으로 합니다.

## 외부 이미지

현재 도감/포켓몬 화면의 테스트용 포켓몬 이미지는 PokeAPI sprites GitHub 저장소의 정적 이미지를 사용합니다. 향후 자체 에셋 폴더로 교체할 수 있도록 UI에서 한 지점에서 생성합니다.
