# 레이븐 토너먼트 슬래시 명령 정리

이 문서는 지금 봇에 등록된 슬래시 명령 **65개**의 운영 정리본이다. 디스코드에서 `/` 로 치는 명령만 적는다. 웹 보드(`/s/슬러그`)는 이 서버의 경기·결과를 보여줄 뿐, 일정 생성·체크인·코인·추첨은 하지 않는다.

명령은 **실행한 디스코드 서버에만** 적용된다. 다른 서버의 경기, 로스터, 밴, 스냅샷, 이의는 보이지 않는다.

웹에서 같은 목록을 보려면 사이트 `/commands` 를 연다.

## 읽는 법

- 권한은 그 서버에서 `/config set` 으로 묶은 역할이다. 서버 관리자(Administrator)는 통과한다.
- 역할을 네 개(관리·오거나이저·슈퍼바이저·오퍼레이터) 묶기 전에는 그 서버의 다른 명령이 잠긴다. `/general health` 로 잠김 여부를 본다.
- 옵션 뒤의 `?` 는 생략 가능. 없으면 필수.
- **봇 전용** 은 웹에 같은 버튼이 없다. 디스코드에서만 동작한다.
- 경기 시각, 추첨 창은 **UTC**. `/random time` 답장만 한국 시각을 같이 보여 준다.
- 경기 지정은 경기 번호, 또는 `팀A vs 팀B` / `팀A 대 팀B`. 같은 팀은 거절된다.

| 등급 | 디스코드 역할 키 | 하는 일 |
|---|---|---|
| 관리 | admin_role | 설정, 일정 생성, 채널, 로스터, 백업, 명령 재등록 |
| 오거나이저 | organizer_role | 이의 접수와 검토 |
| 슈퍼바이저 | supervisor_role | 중단, 검증, 보관, 실격, 강제 승, 이의 결정 |
| 오퍼레이터 | operator_role | 조회, 결과 입력, 코인, 시간·맵 추첨 |

높은 등급이 낮은 등급 명령을 대신하지는 않는다. 각 명령은 자기 등급(또는 서버 관리자)만 통과한다.

## 처음 한 번

1. `/config set` 으로 admin_role, organizer_role, supervisor_role, operator_role 을 묶는다. 필요하면 commander_role 과 채널도 같이.
2. `/config show` 로 잠김이 풀렸는지, 공개 주소 `/s/슬러그` 가 맞는지 본다.
3. 로스터가 있으면 `/participants upload` (CSV). 챌롱을 쓰면 `/challonge set`.
4. 경기는 `/events create` 로 직접 만들거나, `/challonge create` 로 채널을 연다.
5. 명령이 안 보이면 관리자가 `/sync` 를 친다. 방금 초대한 서버는 전역 명령이 퍼진 뒤에 보인다.

## 경기 상태

한 경기는 아래 순서로만 움직인다. 건너뛰면 봇이 `Cannot move` 로 거절한다.

```
scheduled → checkin_open → in_progress → result_submitted → verified → archived
```

`aborted` 는 scheduled, checkin_open, in_progress, result_submitted, verified 에서 들어갈 수 있다. `aborted` 와 `archived` 는 `/events reopen` 으로 다시 `scheduled` 가 된다.

| 상태 | 의미 | 옮기는 명령 |
|---|---|---|
| scheduled | 예정 | `/events checkin_open` |
| checkin_open | 체크인 열림 | `/events checkin_close` → in_progress |
| in_progress | 진행 | `/events results` 또는 `/report_result` → result_submitted |
| result_submitted | 결과 제출 | `/events verify` |
| verified | 확인됨 | `/events archive` |
| archived | 보관 | `/events reopen` |
| aborted | 중단 | `/events abort`, `/events reset_tournament`. 다시 열려면 `/events reopen` |

확인이 필요한 단어는 대문자 그대로다.

| 명령 | 입력 |
|---|---|
| `/events reset_tournament` | confirm 에 `RESET` |
| `/maintenance restore` | confirm 에 `RESTORE` |

## 로스터 CSV

`/participants upload` 와 `/challonge set` 의 파일은 `.csv` 만 받는다. 기존 로스터를 **통째로 바꾼다**. 헤더 예:

```
team,game_id,role,discord_id
흑월,raven01,commander,123456789012345678
흑월,raven02,member,
```

## 설정 — `/config` (2)

서버마다 따로 저장된다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/config set` | 관리 | 역할, 채널, 챌롱, 공개 주소, 비상 메일 3곳을 저장 | admin_role? organizer_role? supervisor_role? operator_role? commander_role? strict_authorization? max_active_matches? max_roster_members_per_team? max_roster_upload_rows? appeal_channel? participants_channel? schedule_channel? results_channel? notification_channel? transcript_channel? thumbnail_channel? tour_logo? challonge_tournament? public_slug? public_name? alert_email_1? alert_email_2? alert_email_3? |
| `/config show` | 관리 | 이 서버 설정과 `/s/슬러그` 를 보여 줌 | 없음 |

`public_slug` 는 소문자, 숫자, 하이픈. `strict_authorization` 을 켜면 역할이 비었을 때 우회를 막는다. `max_active_matches` 는 0–128. 팀당 로스터 인원은 1–6.

`alert_email_1` `alert_email_2` `alert_email_3` 은 그 서버의 비상 알림 수신자다. 최대 3명. 비울 때는 `-`. 관리 화면의 서버 페이지에서도 같은 세 칸을 저장한다. 디스코드 비상 버튼과 웹 문의의 비상이 이 주소로 나간다. 보내는 쪽은 Resend다. 서버 환경에 `RESEND_API_KEY` 가 있어야 하고, 발신 주소는 `RESEND_FROM` (없으면 `alerts@raven-tournament.xyz`)이다. 그 도메인이 Resend에서 인증돼 있어야 한다.

## 일정 — `/events` (18)

생성·수정·삭제·체크인·준비·토너먼트 리셋은 **봇 전용**.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/events create` | 관리 · 봇 전용 | 경기를 만듦. 시각은 UTC. 공개 보드에 번호가 붙음 | match, dd, mm, yyyy, hour, minute, tour_name? group_name? round_no? channel? commander1? commander2? judge? recorder? image_url? remarks? |
| `/events edit` | 관리 · 봇 전용 | 시간·조·라운드·심판·기록·채널을 고침. 날짜를 바꾸려면 일·월·년·시·분을 같이 | match, dd? mm? yyyy? hour? minute? tour_name? group_name? round_no? channel? commander1? commander2? judge? recorder? image_url? remarks? |
| `/events delete` | 관리 · 봇 전용 | 이 서버의 경기 패킷을 삭제 | match, reason? |
| `/events list` | 오퍼레이터 | 목록. 상태·팀·기간으로 거름. 답장은 15줄 | status? team? start_utc? end_utc? |
| `/events show` | 오퍼레이터 | 상태, 배정, 준비, 점수 | match |
| `/events results` | 오퍼레이터 | 점수를 넣고 결과 채널이 있으면 거기에 올림. 경기 옵션 이름은 `event` | event, team1_score, team2_score, number_of_matches? remarks? rec_link? screenshot1? … screenshot7? |
| `/events staff_resign` | 관리 · 봇 전용 | 심판 또는 기록 배정을 비움 | match, role? reason? |
| `/events reset_tournament` | 관리 · 봇 전용 | 이 서버의 진행 중 경기를 모두 중단 | confirm? (`RESET`) |
| `/events status` | 오퍼레이터 | 상태와 팀 준비만 짧게 | match |
| `/events checkin_open` | 관리 · 봇 전용 | 체크인을 염 | match |
| `/events checkin_close` | 관리 · 봇 전용 | 체크인을 닫고 진행으로 넘김 | match |
| `/events ready` | 관리 · 봇 전용 | team1 또는 team2 준비 표시 | match, side |
| `/events abort` | 슈퍼바이저 | 흐름을 중단 | match, reason? |
| `/events reopen` | 슈퍼바이저 | 중단·보관된 경기를 다시 예정으로 | match |
| `/events verify` | 슈퍼바이저 | 제출된 결과를 확인 | match, winner? |
| `/events archive` | 슈퍼바이저 | 확인된 경기를 보관 | match, reason? |
| `/events close` | 관리 | 경기 채널 대화를 기록 채널로 옮기고 채널을 삭제 | match? |
| `/events readiness` | 관리 | 열린 경기의 팀 준비를 한눈에 | match? |

`/events list` 의 start_utc, end_utc 형식은 `YYYY-MM-DD HH:MM`. `role` 은 `judge` 또는 `recorder`. `side` 는 `team1` 또는 `team2`. 점수는 0–999.

예:

```
/events create match: 흑월 vs 적호 dd: 2 mm: 11 yyyy: 2026 hour: 12 minute: 0
```

이 시각은 UTC 12:00, 한국 시각 21:00 이다.

## 채널 — `/general` (5)

권한 추가·제거·삭제는 **지금 명령을 친 채널** 기준이다. 잠그기는 채널을 지정한다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/general health` | 오퍼레이터 | 역할 잠김, 티켓·로스터·경기 수 | 없음 |
| `/general add_to_channel` | 관리 | 현재 채널에 멤버나 역할 권한 | member_role |
| `/general remove_from_channel` | 관리 | 현재 채널에서 그 권한을 제거 | member_role |
| `/general delete_channel` | 관리 | 현재 채널을 기록한 뒤 삭제 | save_transcript? |
| `/general close_channel` | 관리 | 지정 채널을 잠그고, 원하면 기록 | channel, save_transcript? |

## 문의 — `/ticket` (2)

그 서버 안의 티켓이다. 웹 문의함과 섞이지 않는다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/ticket panel` | 관리 | 버그·신고·비상 버튼을 현재 채널에 붙임 | 없음 |
| `/ticket close` | 관리 | 이 서버의 열린 티켓을 닫음 | 없음 |

## 챌롱 — `/challonge` (6)

그 서버에 묶인 토너먼트만 읽는다. API 키가 없으면 조회가 비어 있다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/challonge create` | 관리 | 챌롱 대진으로 이 서버에 경기 채널을 만듦 | category? |
| `/challonge set` | 관리 | 챌롱 주소와 CSV 로스터를 저장 | tournament, commanders_csv? |
| `/challonge info` | 오퍼레이터 | 연결 주소와 키 유무 | 없음 |
| `/challonge participants` | 오퍼레이터 | 참가 팀 | 없음 |
| `/challonge matches` | 오퍼레이터 | 경기 줄 | 없음 |
| `/challonge refresh` | 관리 | 연결 상태를 다시 읽음 | 없음 |

`/generate_bracket` 는 아래 단독 명령이다. 채널을 만들지 않고 대진만 요약한다.

## 로스터 — `/participants` (8)

팀 명단과 밴은 이 서버 안에만 있다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/participants upload` | 관리 | CSV로 로스터를 통째로 교체 | roster_file |
| `/participants ban` | 관리 | 이 서버에서만 게임 아이디를 막음 | game_id, reason |
| `/participants check_ban` | 관리 | 밴 여부 | game_id |
| `/participants info` | 관리 | 참가자 채널 기준으로 명단. 팀 이름으로 좁힐 수 있음 | team_name? |
| `/participants lookup` | 관리 | 게임 아이디로 검색 | game_id |
| `/participants show` | 관리 | 팀 하나의 명단 | team_name |
| `/participants sync_roles` | 관리 | 로스터의 커맨더에게 커맨더 역할을 붙임 | 없음 |
| `/participants history` | 관리 | 로스터를 올린 기록 | action? limit? |

## 통계 — `/stats` (7)

이 서버 숫자만 보여 준다. 경기를 바꾸지 않는다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/stats overview` | 오퍼레이터 | 팀, 밴, 이의, 경기 상태 | 없음 |
| `/stats persistence` | 오퍼레이터 | 마지막 스냅샷 | 없음 |
| `/stats match` | 오퍼레이터 | 경기 하나의 패킷 | match_id |
| `/stats tournament` | 오퍼레이터 | 운영 숫자 | 없음 |
| `/stats matches` | 오퍼레이터 | 경기 목록과 상태 | 없음 |
| `/stats participants` | 오퍼레이터 | 로스터가 얼마나 찼는지 | 없음 |
| `/stats progress` | 오퍼레이터 | 진행과 복구 상태 | 없음 |

## 감사 — `/audit` (2)

그 서버에서 **성공한** 명령만 남는다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/audit list` | 관리 | 최근 기록. limit 1–40 | limit? action? actor_id? |
| `/audit export` | 관리 | 기록을 답장 텍스트로 뽑음. limit 1–200 | limit? action? file_name? |

## 이의 — `/appeal` (5)

이의 번호는 그 서버 안에서만 찾는다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/appeal create` | 오거나이저 | 이의 패킷을 만들고, 이의 채널이 있으면 알림 | match_id, team, reason, evidence1? evidence2? evidence3? |
| `/appeal status` | 오거나이저 | 상태 | appeal_id |
| `/appeal review` | 오거나이저 | 검토 중으로 넘김 | appeal_id, notes |
| `/appeal decide` | 슈퍼바이저 | 승자와 이유를 적고 마무리. close 를 켜면 닫음 | appeal_id, reason? winner? close? |
| `/appeal close` | 슈퍼바이저 | 이의를 닫음 | appeal_id, reason? |

## 백업 — `/maintenance` (2)

스냅샷은 그 서버만 저장한다. 다른 서버로 복원되지 않는다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/maintenance snapshot` | 관리 | 경기·설정·로스터를 스냅샷으로 남김 | label? |
| `/maintenance restore` | 관리 | 이 서버 스냅샷만 되돌림. snapshot_id 를 비우면 최근 것 | confirm (`RESTORE`), snapshot_id? |

## 도구 — `/random` (2)

웹 도구 페이지는 꺼 두었다. **봇 전용**.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/random time` | 오퍼레이터 · 봇 전용 | 시작·끝(UTC, `HH:MM`) 사이에서 30분 단위로 하나. 한국 시각도 같이 | start, end |
| `/random maps` | 오퍼레이터 · 봇 전용 | 맵 풀에서 원하는 수만큼. 미니 맵은 옵션. count 1–30 | count, include_mini? |

기본 맵: Hazbari island, Hazbari island (Dawn), Lorica, Quarry, Golden Resort, Eastern Province, Blizzard Assault, Crossfire City, Old Factory, Breaker Bay, Ice World, Arid Frontier, Gyeong Province, Fire Storm. `include_mini` 를 켜면 Blizzard Assault Mini, Golden Resort Mini.

## 단독 명령 (6)

그룹 없이 `/이름` 으로 친다.

| 명령 | 권한 | 하는 일 | 옵션 |
|---|---|---|---|
| `/generate_bracket` | 관리 | 챌롱 대진을 라운드 줄로 요약. 채널은 만들지 않음 | 없음 |
| `/report_result` | 오퍼레이터 | 경기 번호와 두 점수로 결과를 올림. match_id 는 숫자 | match_id, team_a_score, team_b_score, proof_image? notes? |
| `/force_win` | 슈퍼바이저 | 승자와 점수를 강제. score_csv 는 `2-0` 형식 | match_id, winner_team, score_csv |
| `/disqualify` | 슈퍼바이저 | 팀을 실격. 경기가 있으면 상대 승으로 보관 | team_name, reason, match_id? |
| `/toss` | 오퍼레이터 · 봇 전용 | 코인 한 번. HEADS 또는 TAILS | 없음 |
| `/sync` | 관리 | 슬래시 명령 트리를 다시 등록 | 없음 |

`/report_result` 와 `/events results` 는 둘 다 결과를 넣는다. 전자는 숫자 경기 번호와 증빙 파일, 후자는 `팀 vs 팀` 자동완성과 스크린샷 링크 칸이 있다.

## 개수

| 묶음 | 개수 |
|---|---|
| config | 2 |
| events | 18 |
| general | 5 |
| ticket | 2 |
| challonge | 6 |
| participants | 8 |
| stats | 7 |
| audit | 2 |
| appeal | 5 |
| maintenance | 2 |
| random | 2 |
| 단독 | 6 |
| 합계 | 65 |
