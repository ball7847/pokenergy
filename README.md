# Pokenergy

GitHub Pages에 그대로 올려 실행하는 정적 웹게임 프로젝트입니다.
별도의 빌드 과정이나 npm 설치가 필요하지 않습니다.

## 배포 방법

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더 안의 파일과 폴더를 저장소 최상단에 업로드합니다.
   - `index.html`
   - `.nojekyll`
   - `src/`
3. 저장소의 **Settings → Pages**로 이동합니다.
4. **Build and deployment**에서 **Deploy from a branch**를 선택합니다.
5. Branch는 `main`, 폴더는 `/(root)`를 선택하고 저장합니다.
6. GitHub Pages 주소가 생성되면 그 주소로 게임을 플레이합니다.

## 프로젝트 구조

```text
pokenergy/
├─ index.html              # GitHub Pages 시작 페이지
├─ .nojekyll               # GitHub Pages가 파일을 그대로 서비스하도록 함
└─ src/
   ├─ main.js              # 앱 조립/시작
   ├─ styles.css           # 전체 스타일
   ├─ config/              # 게임 설정값
   ├─ data/                # 포켓몬/타입 등 콘텐츠 데이터
   ├─ core/                # 상태/게임 루프/레지스트리
   ├─ systems/             # 조건/효과/생산/포탈/저장 시스템
   ├─ ui/                  # 화면 표시
   └─ utils/               # 공용 유틸리티
```

## 확장 원칙

- 새 포켓몬: `src/data/pokemon.js`
- 새 조건 종류: `src/systems/conditionRegistry.js`
- 새 효과 종류: `src/systems/effectRegistry.js`
- 포탈 동작: `src/systems/PortalSystem.js`
- 생산 계산: `src/systems/ProductionSystem.js`
- 화면: `src/ui/AppView.js`

포켓몬별 조건과 효과는 가능한 한 데이터로 정의하고, 핵심 시스템에 포켓몬별 `if` 문을 추가하지 않는 것을 원칙으로 합니다.

## 로컬 실행 참고

이 프로젝트는 ES Module을 사용하므로 `index.html`을 더블클릭(`file://`)해서 여는 방식은 브라우저 정책에 따라 동작하지 않을 수 있습니다. GitHub Pages에 올리면 정상적인 HTTP 환경에서 실행됩니다.
