# 카카오톡 채널 상담 챗봇 (샘플: 대신 카페)

카카오 i 오픈빌더의 **스킬 서버**입니다. 손님이 카카오톡 채널에 말을 걸면 오픈빌더가 이 서버에 질문을 보내고, 서버가 답을 돌려줍니다.

- 버튼 메뉴: 영업시간 · 메뉴 · 위치·주차 · 예약 문의
- 자주 묻는 질문: 키워드로 바로 답변 (`store.json`의 `faq`)
- AI 상담: 정해진 답이 없는 질문은 가게 정보만 근거로 AI가 답변 (`OPENAI_API_KEY`가 있을 때)
- 카카오는 5초 안에 답이 없으면 끊기므로, AI는 3.5초 안에 못 받으면 전화 안내로 대신 답합니다.

**다른 가게용으로 바꾸려면 `store.json`만 수정하면 됩니다.**

## 1. 배포 (Vercel, 무료)
1. https://vercel.com → **Add New → Project** → 이 GitHub 저장소 선택
2. **Root Directory**를 `kakao-chatbot`으로 지정 → Deploy
3. (선택) **Settings → Environment Variables**
   - `OPENAI_API_KEY`: AI 상담을 쓰려면 입력
   - `OPENAI_MODEL`: 기본값 `gpt-5.6-luna`
   - `SKILL_TOKEN`: 아무 비밀 문자열. 넣으면 오픈빌더에서도 같은 값을 헤더 `x-skill-token`으로 보내야 응답합니다.
4. 브라우저로 `https://<프로젝트>.vercel.app/api/skill` 을 열어 `{"ok":true,...}`가 보이면 성공

## 2. 오픈빌더 연결
1. https://chatbot.kakao.com → 봇 선택
2. **스킬 → 생성**: URL에 `https://<프로젝트>.vercel.app/api/skill` → 저장
3. **시나리오 → 폴백 블록** → 봇 응답에서 **스킬데이터 사용** → 방금 만든 스킬 선택 → 저장
4. **웰컴 블록**도 같은 방식으로 스킬을 연결하면 첫 인사가 이 서버에서 나갑니다.
5. 오른쪽 위 **봇 테스트**로 "영업시간", "주차 돼요?", "와이파이 비번" 등을 입력해 확인
6. **배포** 탭에서 배포 → 카카오톡 채널에서 실제로 대화해 보기

## 3. 테스트
```bash
npm test
```

## 응답 형식
카카오 스킬 응답 v2.0 (`simpleText` + `quickReplies`). 참고:
https://kakaobusiness.gitbook.io/main/tool/chatbot/skill_guide/answer_json_format
