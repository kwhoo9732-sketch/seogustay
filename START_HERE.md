# 서구STAY · GitHub에 올리고 Vercel로 배포하기

**먼저 사이트부터 열어보려면 API 키 입력 없이 배포하면 된다.** 공동주택·지도·학교·기본 문장검색이 작동한다. Solar AI 연결은 사이트가 열린 뒤 추가할 수 있다.

## 1. 압축 풀기

다운로드한 ZIP을 압축 해제한다. 안의 `seogu-stay` 폴더를 열었을 때 아래 파일들이 보여야 한다.

| 반드시 보여야 할 항목 | 역할 |
| --- | --- |
| `package.json`, `package-lock.json` | 실행·설치 설정 |
| `vercel.json` | Vercel 배포 설정 |
| `public` 폴더 | 화면·사진·주거지 자료 |
| `api`, `lib` 폴더 | AI 서버 기능 |
| `scripts` 폴더 | 배포 확인 명령 |
| `README.md` | GitHub 첫 화면의 소개 |

ZIP 자체를 GitHub에 올리는 방식으로는 배포되지 않는다. **압축을 푼 뒤 그 안의 파일·폴더를 올린다.**

## 2. GitHub 저장소 만들기

1. [GitHub 새 저장소 만들기](https://github.com/new)에 접속한다.
2. **Owner**에서 사용할 계정을 고른다.
3. **Repository name**에 `seogu-stay`를 입력한다.
4. **Description**에는 `생활조건으로 집과 동네를 찾는 서구STAY`를 입력한다.

공개 여부는 원하는 대로 선택한다. 별도 README·라이선스·gitignore 생성 옵션은 선택하지 않아도 된다. 이 프로젝트에 README와 gitignore가 들어 있다. **Create repository**를 누른다.

이미 같은 이름의 저장소가 있다면, 그 저장소가 서구STAY용인지 먼저 확인하고 사용한다.

## 3. 파일과 폴더 한 번에 올리기

1. 빈 저장소에서 **uploading an existing file**을 누른다. 파일 목록이 있다면 **Add file → Upload files**를 선택한다.
2. 압축을 푼 `seogu-stay` 폴더 **안으로 들어간다**.
3. 그 안의 파일과 폴더를 모두 선택해 GitHub 업로드 영역으로 끌어 놓는다.
4. **Commit changes**를 눌러 저장한다.

저장소 첫 화면에 `package.json`, `vercel.json`, `public`이 바로 보이면 맞게 올라간 것이다. 그 위에 `seogu-stay` 폴더가 한 겹 더 생겼다면 Vercel의 Root Directory를 그 폴더로 지정해야 한다. 가능하면 저장소 최상위에 파일이 있도록 올리는 편이 간단하다.

## 4. Vercel에서 가져오기

1. [Vercel 새 프로젝트](https://vercel.com/new)에 접속한다.
2. **Import Git Repository**에서 GitHub의 `seogu-stay`를 찾는다.
3. 해당 저장소의 **Import**를 누른다.
4. 프로젝트 이름은 `seogu-stay`로 두고 아래 설정을 확인한다.

| 화면 항목 | 넣을 값 |
| --- | --- |
| Framework Preset | **Other** |
| Root Directory | **`./`** |
| Build Command | **`npm run build`** |
| Output Directory | **`public`** |
| Install Command | **`npm ci --ignore-scripts --no-audit --no-fund`** |
| Node.js Version | **24.x** |
| Environment Variables | **처음에는 비워도 됨** |

설정이 파일에서 자동 반영되면 같은 값을 다시 입력할 필요 없다. **Deploy**를 누르고 완료되면 표시되는 주소를 연다. 이후 연결된 운영 브랜치의 소스를 수정하면 Vercel이 다시 배포한다.

### GitHub 저장소가 목록에 안 보이면

Vercel에서 연결한 GitHub 계정과 저장소를 만든 계정이 같은지 확인한다. **Configure GitHub App** 또는 저장소 접근 권한 설정에서 `seogu-stay`를 허용한다. 다른 계정으로 만든 저장소를 억지로 검색해도 나타나지 않을 수 있다.

## 5. 배포 후 네 가지만 확인하기

1. 호수 사진과 **“집보다 먼저, 살고 싶은 일상을.”** 첫 화면이 보이는지 확인한다.
2. 전체 목록에 **239개 공동주택**이 나타나는지 확인한다.
3. `공원·호수 가까이`, `초등학교 가까이` 등 조건을 골라 목록과 지도가 바뀌는지 확인한다.
4. 단지 상세·관심 저장·학교 안내를 눌러본다.

처음에는 `기본 검색 가능 · AI 연결 준비 중`으로 나올 수 있다. 환경변수 없는 기본 배포의 정상 상태다.

## 6. Solar AI를 추가할 때

이 단계는 기본 사이트 배포 후 진행한다.

1. Vercel 프로젝트에서 **Settings → Environment Variables**로 이동한다.
2. `SOLAR_API_KEY`에 Upstage API 키를 입력한다.
3. Upstash Redis를 준비하고 `UPSTASH_REDIS_REST_URL`과 `UPSTASH_REDIS_REST_TOKEN`을 각각 입력한다. Vercel에서 `KV_REST_API_URL`·`KV_REST_API_TOKEN`을 제공한 경우 그 이름도 지원한다.
4. 적용할 배포 환경을 선택하고 저장한 뒤 **Deployments → Redeploy**로 다시 배포한다.

`SOLAR_MODEL`은 선택 항목이며 기존 기본 모델은 `solar-mini4`다. 사용할 계정에 해당 모델의 이용 권한이 있어야 한다. 실제 키는 대화창이나 GitHub 파일에 넣지 않는다.

Redis는 여러 서버가 AI 호출 횟수를 함께 관리하는 용도다. 기본 한도는 사이트 전체 하루 200회, 방문자 하루 20회·10분 5회이며, Redis 연결이 없으면 AI 호출을 하지 않도록 구성했다. 서비스별 실제 비용·플랜은 가입 화면에서 확인한다.

## 자주 막히는 부분

| 증상 | 확인할 곳 |
| --- | --- |
| `package.json`을 못 찾는 오류 | Root Directory와 GitHub 파일 위치 |
| Next.js 관련 빌드 오류 | Framework Preset을 **Other**로 설정했는지 |
| 첫 화면 404 | Output Directory가 **public**인지 |
| 사진·목록이 안 나옴 | public 폴더와 하위 파일이 모두 업로드됐는지 |
| AI 상태가 준비 중 | Solar 키와 Redis 변수 쌍을 모두 넣고 재배포했는지 |
| AI 상태는 켜졌지만 질문 오류 | Vercel 함수 로그와 Upstage 모델 권한·사용량 확인. 로그에 키를 붙여넣지 않음 |
| 예전 관심 단지가 없어짐 | 도메인이 달라져 저장공간이 바뀐 것. 새 주소에서 다시 저장 |

## 공식 도움말

- [GitHub 파일·폴더 업로드](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [Vercel Git 저장소 연결](https://vercel.com/docs/git)
- [Vercel 빌드 설정](https://vercel.com/docs/builds/configure-a-build)
- [Vercel 환경변수](https://vercel.com/docs/environment-variables/managing-environment-variables)
