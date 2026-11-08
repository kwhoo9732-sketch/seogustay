"""Extract the official K-apt workbook and conservatively match catalog rows."""
from pathlib import Path
import collections
import datetime as dt
import hashlib
import json
import re
import openpyxl

ROOT = Path(__file__).resolve().parents[1] / 'data-sources'
RAW = ROOT / 'kapt-basic-20261026.xlsx'
KAPT_SOURCE = 'https://www.k-apt.go.kr/web/board/webReference/boardList.do'
KAPT_METADATA = 'https://www.data.go.kr/data/15073271/fileData.do'
CHECKED = dt.date(2026, 10, 28)

def clean(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()

def local(value):
    text = re.sub(r'^(?:광주광역시|전남광주통합특별시)\s*(?:서구\s*)?', '', clean(value))
    return re.sub(r'^([가-힣]+)\s+동(?=\s|\d)', r'\1동', text)

def parcel_key(value):
    match = re.match(r'([가-힣]+동)\s*(산\s*)?(\d+)(?:-(\d+))?', local(value))
    if not match:
        return None
    dong, mountain, main, sub = match.groups()
    return f'{dong}|{"산" if mountain else ""}{int(main)}' + (f'-{int(sub)}' if sub else '')

def road_key(value):
    match = re.match(r'^(.+(?:로|길))(\d+)(?:-(\d+))?', re.sub(r'\s+', '', local(value)))
    if not match:
        return None
    return f'{match[1]}|{int(match[2])}' + (f'-{int(match[3])}' if match[3] else '')

def name_key(value, neighborhood=None):
    text = re.sub(r'[\s\-()·]', '', clean(value)).replace('아파트', '').lower()
    if neighborhood:
        for prefix in [neighborhood, neighborhood[:-1] if neighborhood.endswith('동') else None]:
            if prefix and text.startswith(prefix):
                return text[len(prefix):]
    return text

def integer(value):
    try:
        number = float(str(value).replace(',', ''))
        return int(number) if number.is_integer() else None
    except (TypeError, ValueError):
        return None

def approval(value):
    text = clean(value)
    try:
        date = dt.datetime.strptime(text, '%Y%m%d').date()
    except ValueError:
        return None
    return date.isoformat() if date <= CHECKED else None

# The source workbook advertises an incorrect A1 dimension; streaming must reset it.
workbook = openpyxl.load_workbook(RAW, read_only=True, data_only=True)
sheet = workbook.active
sheet.reset_dimensions()
iterator = sheet.iter_rows(values_only=True)
workbook_note = next(iterator)[0]
headers = list(next(iterator))
keep = ['시도','시군구','읍면','동리','단지코드','단지명','단지분류','법정동주소','도로명주소',
        '사용승인일','동수','세대수','최고층수','최고층수(건축물대장상)','지하층수','분양형태','관리방식']
records = []
total_rows = 0
for row_number, row in enumerate(iterator, 3):
    total_rows += 1
    values = dict(zip(headers, row))
    if values.get('시도') not in ['광주광역시', '전남광주통합특별시'] or values.get('시군구') != '서구':
        continue
    record = {key: values.get(key) for key in keep}
    record['_sourceRow'] = row_number
    records.append(record)
assert len(records) == 182
assert len({r['단지코드'] for r in records}) == 182
extracted = {
    'checkedAt': CHECKED.isoformat(), 'dataDate': '2026-10-26',
    'dataDateBasis': '공개 게시글 본문의 추출일 및 실제 첨부명 20261026_단지_기본정보.xlsx',
    'sourceUrl': KAPT_SOURCE, 'metadataCatalogUrl': KAPT_METADATA,
    'documentTitle': 'K-apt 관리비공개의무단지 기본정보(2026.10.26.)',
    'boardPostId': '136041', 'workbookNote': workbook_note,
    'totalNationalRows': total_rows, 'seoguCount': len(records),
    'sourceRegionFields': {'시도': sorted({r['시도'] for r in records}), '시군구': ['서구']},
    'license': '공공데이터포털: 이용허락범위 제한 없음',
    'sha256': hashlib.sha256(RAW.read_bytes()).hexdigest(),
    'coordinateColumnsPresent': False,
    'columnsRetained': keep,
    'records': records,
}
(ROOT / 'kapt-seogu-20261026.json').write_text(json.dumps(extracted, ensure_ascii=False, indent=2) + '\n')

base = json.loads((ROOT / 'seogu-directory-base.json').read_text())
parcel_index = collections.defaultdict(list)
road_index = collections.defaultdict(list)
for record in records:
    pk, rk = parcel_key(record['법정동주소']), road_key(record['도로명주소'])
    if pk: parcel_index[pk].append(record)
    if rk: road_index[rk].append(record)

def metadata(record):
    approved = approval(record['사용승인일'])
    return {
        'name': clean(record['단지명']), 'kaptCode': record['단지코드'],
        'housingType': record['단지분류'],
        'addressRaw': record['법정동주소'], 'roadAddressRaw': record['도로명주소'],
        'neighborhood': record['동리'],
        'approvalDate': approved,
        'builtYear': int(approved[:4]) if approved else None,
        'unitCount': integer(record['세대수']), 'buildingCount': integer(record['동수']),
        'maxFloors': integer(record['최고층수']),
        'sourceUrl': KAPT_SOURCE, 'metadataCatalogUrl': KAPT_METADATA,
        'dataDate': '2026-10-26', 'sourceRow': record['_sourceRow'],
        'rawRecord': record,
    }

matches = []
for catalog in base['records']:
    pk, rk = catalog['parcelKey'], road_key(catalog['roadAddress'])
    candidates = {r['단지코드']: r for r in parcel_index.get(pk, []) + road_index.get(rk, [])}
    qualified = []
    for candidate in candidates.values():
        p = pk is not None and parcel_key(candidate['법정동주소']) == pk
        r = rk is not None and road_key(candidate['도로명주소']) == rk
        n = name_key(catalog['name'], catalog['neighborhood']) == name_key(candidate['단지명'], candidate['동리'])
        units = integer(candidate['세대수']) == catalog['households']
        checks = {'exactParcel': p, 'exactRoadAddress': r, 'normalizedName': n, 'sameHouseholds': units}
        if (p and r) or ((p or r) and (n or units)):
            qualified.append((candidate, checks))
    chosen = None
    if len(qualified) == 1:
        chosen = qualified[0]
    elif len(qualified) > 1:
        # Shared-parcel complexes need their own name/unit-count evidence.
        ranked = sorted(qualified, key=lambda pair:(pair[1]['normalizedName'],pair[1]['sameHouseholds']), reverse=True)
        top = (ranked[0][1]['normalizedName'],ranked[0][1]['sameHouseholds'])
        second = (ranked[1][1]['normalizedName'],ranked[1][1]['sameHouseholds'])
        if top != second and (top[0] or top[1]):
            chosen = ranked[0]
    result = {'catalogRecordId': catalog['id'], 'catalogName': catalog['name'], 'accepted': chosen is not None}
    if chosen:
        candidate, checks = chosen
        result.update({
            'status': 'accepted_address_supported_match',
            'basis': '정확 지번+도로명 일치 또는 정확 주소 하나와 단지명/세대수 일치. 같은 주소의 복수단지는 단지명·세대수로 구분했다. 이름만으로 연결하지 않았다.',
            'checks': checks, 'metadata': metadata(candidate),
            'catalogEvidence': {'addressRaw':catalog['addressRaw'],'roadAddressRaw':catalog['roadAddressRaw'],'nameRaw':catalog['nameRaw'],'households':catalog['households']},
        })
    else:
        result.update({'status': 'ambiguous_or_insufficient' if candidates else 'no_address_candidate',
                       'candidateKaptCodes': list(candidates)})
    matches.append(result)

accepted = [m for m in matches if m['accepted']]
codes = [m['metadata']['kaptCode'] for m in accepted]
assert len(codes) == len(set(codes))
assert len(accepted) == 175
used = set(codes)

approved_new_codes = {'A10022386', 'A50271502', 'A10019927', 'A10020265', 'A10020091'}
new = []
held = []
for record in records:
    if record['단지코드'] in used:
        continue
    item = metadata(record)
    name_candidates = [b for b in base['records'] if name_key(b['name']) == name_key(record['단지명'])]
    same_parcel = [b for b in base['records'] if b['parcelKey'] == parcel_key(record['법정동주소'])]
    same_road = [b for b in base['records'] if road_key(b['roadAddress']) == road_key(record['도로명주소'])]
    item['catalogSameNameCandidates'] = [{'catalogRecordId':b['id'],'name':b['name'],'addressRaw':b['addressRaw'],'roadAddressRaw':b['roadAddressRaw']} for b in name_candidates]
    item['catalogExactParcelCandidates'] = [b['id'] for b in same_parcel]
    item['catalogExactRoadCandidates'] = [b['id'] for b in same_road]
    if record['단지코드'] in approved_new_codes:
        assert not name_candidates and not same_road
        if same_parcel:
            # This specific source conflict is not used to merge or correct an
            # address. The two separate K-apt records prove distinct complexes.
            assert record['단지코드'] == 'A10020265'
            assert [b['id'] for b in same_parcel] == ['seogu-15038901-0213']
            existing_match = next(m for m in accepted if m['catalogRecordId'] == 'seogu-15038901-0213')
            assert existing_match['metadata']['kaptCode'] == 'A10027027'
            assert existing_match['checks']['exactRoadAddress'] and existing_match['checks']['sameHouseholds']
            item['catalogParcelConflict'] = {
                'sourceParcelValue': '금호동 1110',
                'catalogRecordId': 'seogu-15038901-0213',
                'catalogName': '아델리움&로제비앙 아파트',
                'existingKaptCode': 'A10027027',
                'existingRoadAddress': '화개중앙로87번길 15',
                'existingHouseholds': 686,
                'existingApprovalDate': '2017-02-23',
                'newKaptCode': record['단지코드'],
                'newRoadAddress': '서광주로106번길 39',
                'newHouseholds': 917,
                'newApprovalDate': item['approvalDate'],
                'resolution': '공식 K-apt에서 두 단지가 별도 코드·도로명주소·세대수·사용승인일로 구별되므로 신규 단지로 포함한다. 충돌 지번은 어느 쪽도 추정 보정하지 않는다.',
            }
        assert item['approvalDate'] and item['housingType'] in ['아파트', '주상복합', '공동주택']
        item['status'] = 'approved_independent_new_kapt_complex'
        item['basis'] = '서구청 234행에 동일 정규 단지명·정확 도로명주소가 없고, 공식 K-apt 고유코드·유효 사용승인일·주거단지 분류가 확인된다. 지번 충돌 1건은 별도 K-apt 기존단지와 신규단지의 코드·도로명·세대수·사용승인일로 독립성을 확인했다.' if same_parcel else '서구청 234행에 동일 정규 단지명·정확 지번·정확 도로명주소가 없고, 공식 K-apt 고유코드·유효 사용승인일·주거단지 분류가 확인된다.'
        if record['단지코드'] == 'A10020091':
            item['distinctionEvidence'] = {
                'existingComplex': {'name':'상무양우내안애','kaptCode':'A10024958','roadAddress':'백석길 22-14','unitCount':353,'approvalDate':'2020-05-15'},
                'newComplex': {'name':item['name'],'kaptCode':item['kaptCode'],'roadAddress':'북촌길 78','unitCount':312,'approvalDate':item['approvalDate']},
                'conclusion': '별도 K-apt 코드·서로 다른 도로명주소·세대수·사용승인일로 독립 단지임을 구별한다.',
            }
        if record['단지코드'] == 'A50271502':
            item['distinctionEvidence'] = {
                'catalogComplex': {'name':'상무리채1','catalogRecordId':'seogu-15038901-0204','roadAddress':'시청로 71','unitCount':297},
                'newComplex': {'name':item['name'],'kaptCode':item['kaptCode'],'roadAddress':'시청로 13','unitCount':299,'approvalDate':item['approvalDate']},
            }
        new.append(item)
    else:
        item['status'] = 'held_same_name_address_conflict'
        item['reason'] = '공식 서구청 목록에 같은 이름이 있지만 지번·도로명주소가 모두 달라, 주소변경·오류 여부 확인 없이 기존 행에 보강하거나 신규로 추가하지 않는다.'
        held.append(item)

assert len(new) == 5 and len(held) == 2
notes = [
    '공공데이터포털 제목의 2024-09-13은 이 파일의 추출일이 아니다. 실제 20261026_단지_기본정보.xlsx 및 게시글 본문에 근거해 2026-10-26을 적용했다.',
    'K-apt 관리비공개의무단지 기본정보 범위이다. 서구 전체 공동주택 전수로 표현하지 않는다.',
    '구형 목록 첨부 버튼은 로그인 선택 화면을 반환했지만, 공개 게시글의 현재 첨부 컴포넌트에서 로그인 없이 원본을 확보했다.',
    '시도·시군구는 원문 열의 값을 그대로 필터했다. 법정동/행정구역 코드를 추정 또는 변환하지 않았다.',
    '사용승인일에서 준공연도를 도출한다. 예정일을 준공연도로 쓰지 않는다.',
    '단지분류는 K-apt 원문 값이다. 건축물대장의 세부 주용도를 별도로 검증한 분류라고 표현하지 않는다.',
    '좌표 열이 없으므로 이 자료에서 위경도를 보강하지 않았다.',
]
output = {
    'checkedAt': CHECKED.isoformat(), 'dataDate': '2026-10-26', 'sourceUrl': KAPT_SOURCE,
    'metadataCatalogUrl': KAPT_METADATA, 'license': '이용허락범위 제한 없음',
    'documentTitle': extracted['documentTitle'], 'boardPostId': '136041',
    'counts': {'kaptSeoguRows':182,'matchedCatalogRows':len(accepted),'catalogRowsWithoutKaptMatch':234-len(accepted),'approvedNewComplexes':len(new),'heldKaptRows':len(held)},
    'notes': notes, 'matches': matches, 'approvedNewComplexes': new, 'heldKaptRows': held,
}
(ROOT / 'kapt-directory-matches.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(output['counts'], ensure_ascii=False))
print('types',dict(collections.Counter(m['metadata']['housingType'] for m in accepted)))
print('valid approval years',sum(m['metadata']['builtYear'] is not None for m in accepted))
print('new',[(r['name'],r['housingType'],r['approvalDate']) for r in new])
print('held',[(r['name'],r['kaptCode']) for r in held])
