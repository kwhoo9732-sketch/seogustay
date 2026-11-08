'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeURL = value => { if (typeof value !== 'string' || !value.trim()) return null; try { const url = new URL(value, location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; } };
  const paths = {
    search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    heart:'<path d="M20.5 5.8a5.2 5.2 0 0 0-7.4 0L12 6.9l-1.1-1.1a5.2 5.2 0 0 0-7.4 7.4L12 21l8.5-7.8a5.2 5.2 0 0 0 0-7.4Z"/>',
    'arrow-right':'<path d="M4 12h16M14 6l6 6-6 6"/>',
    'arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.7"/>',
    home:'<path d="m3 11 9-8 9 8M5 9v12h14V9M9 21v-8h6v8"/>',
    school:'<path d="m2 9 10-6 10 6-10 6L2 9ZM6 12v6c3 3 9 3 12 0v-6M22 9v8"/>',
    receipt:'<path d="M5 3h14v19l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8M8 16h5"/>',
    leaf:'<path d="M20 3C8 2 2 9 6 16s15 2 14-13ZM4 21 16 9M9 16v-5M9 16h5"/>',
    culture:'<path d="m3 9 9-6 9 6H3ZM5 10v9M10 10v9M14 10v9M19 10v9M3 21h18"/>',
    bag:'<path d="M5 8h14l2 13H3L5 8ZM8 9V6a4 4 0 0 1 8 0v3"/>',
    reset:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    expand:'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/>',
    close:'<path d="m6 6 12 12M6 18 18 6"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    compare:'<path d="M4 4h6v16H4zM14 4h6v16h-6zM10 8h4M10 16h4"/>',
    map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5ZM9 3v16M15 5v16"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    moon:'<path d="M21 13.5A9 9 0 0 1 10.5 3 9 9 0 1 0 21 13.5Z"/>',
    bookmark:'<path d="M6 3h12v19l-6-4-6 4V3Z"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };
  const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pin}</svg>`;
  $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  const categoryLabel = {nature:'자연·산책',culture:'문화·역사',market:'시장·먹거리'};
  const categoryIcon = {nature:'leaf',culture:'culture',market:'bag'};
  const price = (amount, compact = false) => {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return '거래자료 미수록';
    if (compact) return `${Number((amount / 10000).toFixed(3))}억`;
    const uk = Math.floor(amount / 10000), man = amount % 10000;
    return `${uk ? `${uk}억` : ''}${uk && man ? ' ' : ''}${man ? `${man.toLocaleString('ko-KR')}만` : ''} 원`;
  };
  const date = value => typeof value === 'string' && value ? value.replaceAll('-', '.') : '미확인';
  const area = value => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value.toFixed(2) : '미확인';
  const hasCoordinates = p => Boolean(p) && typeof p.lat === 'number' && typeof p.lng === 'number' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
  const representativeTrade = a => { const t = Array.isArray(a?.transactions) ? a.transactions[0] : null; return t && typeof t.priceMan === 'number' && t.priceMan > 0 && Number.isFinite(t.priceMan) && typeof t.area === 'number' && t.area > 0 && Number.isFinite(t.area) && typeof t.date === 'string' ? t : null; };
  const builtYearText = a => Number.isInteger(a?.builtYear) && a.builtYear >= 1800 && a.builtYear <= 2100 ? `${a.builtYear}년 준공` : '준공연도 미확인';
  const unitCountText = a => Number.isInteger(a?.unitCount) && a.unitCount > 0 ? `${a.unitCount.toLocaleString('ko-KR')}세대` : '';
  const homeFacts = a => { const t = representativeTrade(a); return [unitCountText(a),t ? `수록 전용 ${area(t.area)}㎡` : '',builtYearText(a)].filter(Boolean).join(' · '); };
  const mapLink = a => hasCoordinates(a) ? `https://map.kakao.com/link/map/${encodeURIComponent(a.name)},${a.lat},${a.lng}` : `https://map.kakao.com/link/search/${encodeURIComponent(a.roadAddress || a.address || a.name)}`;
  const radians = degrees => degrees * Math.PI / 180;
  function distance(a, b) {
    if (!hasCoordinates(a) || !hasCoordinates(b)) return null;
    const dlat = radians(b.lat - a.lat), dlng = radians(b.lng - a.lng);
    const n = Math.sin(dlat/2)**2 + Math.cos(radians(a.lat))*Math.cos(radians(b.lat))*Math.sin(dlng/2)**2;
    const bounded = Math.max(0,Math.min(1,n));
    return 6371 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1-bounded));
  }
  const distanceText = km => typeof km === 'number' && Number.isFinite(km) ? `직선 약 ${km.toFixed(1)}km` : '위치 자료 미확인';
  let saved = new Set();
  let persistentStorage = true;
  try { const list = JSON.parse(localStorage.getItem('seogustay:saved:v1') || '[]'); if (Array.isArray(list)) saved = new Set(list.filter(x => typeof x === 'string')); } catch { persistentStorage = false; }
  const state = {query:'',neighborhood:'all',price:'all',area:'all',sort:'match',needs:new Set(),strictNeeds:false,savedOnly:false,placeCategory:'all',compare:new Set(),selected:null,schoolApartment:null,schoolLevel:'elementary',schoolQuery:'',schoolFilter:'all',page:1};
  const pageSize = 24;
  const matching = window.SeoguMatching;
  const needCriteria = matching?.criteria || [];
  const homeProfiles = new Map();
  let housing, placeData, schoolData, educationData, apartments = [], places = [], schools = [], filtered = [], map, apartmentLayer, placeLayer, schoolLayer, baseGeo;
  let toastTimer, loaded = false;
  const markerById = new Map();
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3400); }
  function external(url, text, className = '') { const href = safeURL(url); return href ? `<a class="${className}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${text}${icon('arrow-up-right')}</a>` : ''; }
  function openDialog(id) {
    const dialog = $(id);
    $$('dialog[open]').forEach(el => { if (el !== dialog) el.close(); });
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
    const heading = $('h2', dialog);
    if (heading) { heading.id = `${dialog.id}-title`; dialog.setAttribute('aria-labelledby', heading.id); }
    $('.dialog-close', dialog)?.focus({preventScroll:true});
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => { if (!$('dialog[open]')) document.body.classList.remove('dialog-open'); });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  });

  function nearby(apartment, limit = 3) { return places.map(place => ({...place,distance:distance(apartment,place)})).filter(p => p.distance !== null).sort((a,b) => a.distance-b.distance).slice(0,limit); }
  const schoolLabels = {elementary:'초등학교',middle:'중학교',high:'고등학교'};
  const schoolShortLabels = {elementary:'초',middle:'중',high:'고'};
  const schoolDistanceText = km => typeof km !== 'number' || !Number.isFinite(km) ? '위치 자료 미확인' : km < .01 ? '직선 10m 미만' : km < 1 ? `직선 약 ${(Math.round(km*100)*10).toLocaleString('ko-KR')}m` : distanceText(km);
  const schoolZoneMapURL = 'https://schoolzone.emac.kr/gis/gis.do';
  const middleAdmissionURL = 'https://seobu.jge.go.kr/board.php?id=230&sid=19';
  const highAdmissionURL = 'https://hischool.go.kr/entrance/sido/view.do?nttId=21266';
  function nearbySchools(apartment, level, limit = 3) { return schools.filter(s => s.level === level).map(s => ({...s,distance:distance(apartment,s)})).filter(s => s.distance !== null).sort((a,b) => a.distance-b.distance).slice(0,limit); }
  function apartmentZone(apartment) { return educationData?.apartmentZones?.find(z => z.apartmentId === apartment.id); }
  function schoolAssignment(apartment, level) {
    const zone = apartmentZone(apartment);
    const zoneDate = educationData?.zoneDataDate ? date(educationData.zoneDataDate) : '';
    if (level === 'elementary') return {
      label:'지도 기준 참고 통학구역',
      title:zone?.elementaryNames?.join(' · ') || '공식 통학구역 확인이 필요해요',
      description:zone ? '단지 대표 위치를 공식 학구도와 대조한 참고 정보입니다. 입학·전입할 학년도와 아파트 동·상세 주소를 기준으로 최종 통학구역을 확인하세요.' : '이 단지의 통학구역 대조 결과는 미수록입니다. 정확한 주소와 입학·전입할 학년도를 기준으로 공식 학구도와 교육지원청 안내를 확인하세요.',
      meta:zone ? `학구도 ${zoneDate} 기준 · 배정 확정 정보 아님` : '이 단지의 통학구역 대조 결과는 미수록입니다.',
      links:external(schoolZoneMapURL,'공식 학구도 확인')
    };
    if (level === 'middle') return {
      label:'지도 기준 참고 학교군',
      title:zone?.middleGroupName || '학교군·배정 가능 학교 확인',
      description:'신입학은 출신 초등학교별 배정 가능 중학교와 해당 학년도 계획을 함께 확인하세요. 지도상 학교군만으로 개별 중학교 배정이 정해지지 않습니다.',
      meta:zone ? `학구도 ${zoneDate} 기준 · 개별 배정 학교는 별도 확인` : '단지별 배정 중학교는 공식 안내에서 확인하세요.',
      links:external(middleAdmissionURL,'교육지원청 배정 안내') + external(schoolZoneMapURL,'공식 학교군 지도')
    };
    return {
      label:'2027학년도 · 구 광주 평준화 후기 일반고',
      title:'출신 중학교 기준으로 확인해요',
      description:'일반고 합격자를 대상으로 출신 중학교에 따른 배정 가능 고교와 희망학교를 바탕으로 추첨합니다. 실제 거주지·통학 편의도 고려하며 학교 유형별 전형은 따로 확인하세요.',
      meta:'2027학년도 공식 공고 첨부 요강 · 아파트 주소만으로 배정 고교를 확정할 수 없음',
      links:external(highAdmissionURL,'2027학년도 공식 요강')
    };
  }
  function schoolRow(s, compact = false) {
    return `<button type="button" class="school-row${compact ? ' compact' : ''}" data-school="${esc(s.id)}"><span class="school-level-icon ${esc(s.level)}">${schoolShortLabels[s.level]}</span><span class="school-row-copy"><strong>${esc(s.name)}</strong><small>${esc(s.establishment)} · ${esc(s.address.replace(/^전남광주통합특별시 서구\s*/,''))}</small></span><span class="school-distance">${schoolDistanceText(s.distance)}${icon('arrow-up-right')}</span></button>`;
  }
  function schoolCardSummary(apartment) {
    const nearest = nearbySchools(apartment,'elementary',1)[0]; if (!nearest) return '';
    return `<button type="button" class="apt-school-line" data-school-apartment="${esc(apartment.id)}" aria-label="${esc(apartment.name)} 학군과 학교 살펴보기">${icon('school')}<span><small>서구 내 가까운 초등학교 · 배정과 별개</small><strong>${esc(nearest.name)}</strong><em>${schoolDistanceText(nearest.distance)}</em></span>${icon('arrow-right')}</button>`;
  }
  function renderEducation() {
    const apartment = apartments.find(a => a.id === state.schoolApartment) || apartments.find(a => apartmentZone(a)) || apartments[0];
    if (!apartment) return;
    state.schoolApartment = apartment.id;
    $('#school-apartment').value = apartment.id;
    $('#education-apartment').innerHTML = `<div class="education-home"><div><span>${esc(apartment.neighborhood)} · 이 집에서 학교를 살펴보세요</span><h3>${esc(apartment.name)}</h3><p>${esc(apartment.roadAddress || apartment.address)}</p></div><button type="button" class="button secondary" data-apartment="${esc(apartment.id)}">이 집의 일상·가격${icon('arrow-up-right')}</button></div>`;
    $$('[data-school-level]').forEach(button => { const active = button.dataset.schoolLevel === state.schoolLevel; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); });
    const assignment = schoolAssignment(apartment,state.schoolLevel);
    const near = nearbySchools(apartment,state.schoolLevel);
    $('#education-panel').innerHTML = `<div class="school-overview"><div class="school-assignment"><span class="assignment-label">${icon('school')}${esc(assignment.label)}</span><h4>${esc(assignment.title)}</h4><p>${esc(assignment.description)}</p><p class="assignment-meta">${esc(assignment.meta)}</p><div class="school-links">${assignment.links}</div></div><div class="school-nearby-list"><div class="school-nearby-heading"><h4>가까운 ${schoolLabels[state.schoolLevel]} ${near.length}곳</h4><p>서구 내 수록 학교 · 거리순 · 배정과 별개</p></div>${near.length ? near.map(s => schoolRow(s)).join('') : `<p class="education-footnote">${hasCoordinates(apartment) ? '학교 위치 자료를 불러오지 못했어요.' : '단지 위치가 미확인되어 가까운 학교를 계산할 수 없어요.'} 공식 학구도에서 주소를 검색해 주세요.</p>`}<p class="education-footnote">거리는 단지와 학교의 대표 좌표 사이 직선거리입니다. 통학로·횡단보도·출입구에 따라 실제 이동거리가 달라져요.</p></div></div>`;
  }
  function jumpToEducation(id) {
    if (!apartments.some(a => a.id === id)) return;
    state.schoolApartment = id;
    $$('dialog[open]').forEach(dialog => dialog.close());
    renderEducation();
    $('#education').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    $('#school-apartment').focus({preventScroll:true});
  }
  function detailSchoolSection(apartment) {
    if (!schools.length || !hasCoordinates(apartment)) return `<section class="detail-section"><h3>학군·학교 확인</h3><p>${!hasCoordinates(apartment) ? '단지 위치 자료가 미확인되어 주변 학교와 거리를 계산할 수 없어요.' : '학교 위치 자료를 불러오지 못했어요.'} 아래 주소로 공식 학구도를 확인해 주세요.</p><p><strong>${esc(apartment.roadAddress || apartment.address)}</strong></p>${external(schoolZoneMapURL,'공식 학구도에서 주소 확인')}${external(middleAdmissionURL,'중학교 배정 안내')}</section>`;
    return `<section class="detail-section"><h3>${icon('school')} 이 집에서 살펴볼 학군·학교</h3><p class="detail-section-subtitle">지도 기준 참고 통학구역·학교군과 주변 학교를 구분해 보여드려요.</p><div class="detail-school-grid">${Object.keys(schoolLabels).map(level => {
      const assignment = schoolAssignment(apartment,level);
      return `<article class="school-level-card"><h4>${schoolLabels[level]}</h4><p class="school-card-label">${esc(assignment.label)}</p><strong class="school-card-assignment">${esc(assignment.title)}</strong><p class="school-card-meta">${esc(assignment.meta)}</p><p class="school-card-nearby">서구 내 가까운 학교 · 배정과 별개</p>${nearbySchools(apartment,level,2).map(s => schoolRow(s,true)).join('')}</article>`;
    }).join('')}</div><p class="education-footnote">중·고등학교는 출신 학교와 해당 학년도 배정계획을 함께 확인해야 합니다. 통학구역·학교군은 단지 대표 좌표 기준이며 동·상세 주소의 최종 배정을 확정하지 않습니다.</p><button type="button" class="button secondary" data-school-apartment="${esc(apartment.id)}">이 단지의 학군·학교 더 보기${icon('arrow-right')}</button></section>`;
  }
  function renderSchoolDirectory() {
    const query = state.schoolQuery.toLocaleLowerCase('ko-KR').replace(/\s/g,'');
    const list = schools.filter(s => (state.schoolFilter === 'all' || s.level === state.schoolFilter) && `${s.name}${s.address}${s.parcelAddress}`.toLocaleLowerCase('ko-KR').replace(/\s/g,'').includes(query));
    $('#school-directory-count').textContent = schools.length ? `${list.length}개 학교 · 수록 학교 ${schools.length}곳에서 검색` : '학교 자료를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.';
    $('#school-directory-grid').innerHTML = list.length ? list.map(s => `<button type="button" class="school-directory-item" data-school="${esc(s.id)}"><span>${schoolLabels[s.level]} · ${esc(s.establishment)}</span><strong>${esc(s.name)}${icon('arrow-up-right')}</strong><small>${esc(s.address.replace(/^전남광주통합특별시 서구\s*/,''))}</small></button>`).join('') : '<p class="education-footnote">검색 결과가 없습니다. 학교 이름이나 검색 조건을 바꿔보세요.</p>';
  }
  function openSchool(id) {
    const school = schools.find(s => s.id === id); if (!school) return;
    const nearApartments = apartments.map(a => ({...a,distance:distance(school,a)})).filter(a => a.distance !== null).sort((a,b) => a.distance-b.distance).slice(0,3);
    $('#detail-content').innerHTML = `<div class="detail-body"><p class="detail-eyebrow">${icon('school')}SCHOOL & NEIGHBORHOOD</p><h2>${esc(school.name)}</h2><span class="school-detail-badge">${schoolLabels[school.level]} · ${esc(school.establishment)}</span><p class="detail-address">${esc(school.address)}</p><div class="detail-actions">${school.website ? external(school.website,'학교 누리집','button primary') : ''}${external(`https://map.kakao.com/link/map/${encodeURIComponent(school.name)},${school.lat},${school.lng}`,'학교 위치 보기','button secondary')}${external('https://www.schoolinfo.go.kr/','학교알리미','button secondary')}</div><div class="school-facts"><dl><dt>학교급</dt><dd>${schoolLabels[school.level]}</dd><dt>설립 구분</dt><dd>${esc(school.establishment)}</dd><dt>위치 자료 기준일</dt><dd>${date(schoolData.dataDate)}</dd><dt>누리집 자료 기준일</dt><dd>${date(schoolData.directoryDataDate)}</dd></dl></div><div class="info-block"><p>주변 학교로 표시되었다고 해당 학교에 배정되는 것은 아닙니다. ${school.level === 'elementary' ? (school.establishment === '사립' ? '사립 초등학교는 학교별 입학 전형과 모집 요강을 확인하세요.' : '초등학교 입학·전입은 상세 주소와 해당 학년도 통학구역을 확인하세요.') : school.level === 'middle' ? '중학교 신입학은 출신 초등학교별 배정 안내를, 전입학은 별도의 거주지·정원 기준을 확인하세요.' : '고교는 출신 중학교와 학교 유형별 입학·전입 기준을 확인하세요.'}</p><p>학생 수·교육과정·방과후학교 등 공시 정보는 학교알리미에서 학교 이름으로 검색할 수 있습니다. 누리집 주소는 교육청 공개자료 기준이며 이후 변경될 수 있습니다.</p>${external(school.sourceUrl,'공식 학교 위치 자료')}${external(school.websiteSourceUrl,'교육청 학교 누리집 자료')}</div><section class="detail-section"><h3>이 학교 주변에서 살펴볼 집</h3><p class="detail-section-subtitle">수록 단지 중 위치가 확인된 곳에서 직선거리로 가까운 세 곳입니다. 학교 배정 관계를 뜻하지 않습니다.</p><div class="nearby-list">${nearApartments.map(a => `<button type="button" class="nearby-item" data-apartment="${esc(a.id)}"><span class="nearby-icon">${icon('home')}</span><div><strong>${esc(a.name)}</strong><small>${esc(a.neighborhood)} · ${esc(homeFacts(a))}</small></div><span>${schoolDistanceText(a.distance)}${icon('arrow-up-right')}</span></button>`).join('')}</div></section></div>`;
    openDialog('#detail-dialog');
  }
  function homeFit(apartment) {
    const all = homeProfiles.get(apartment.id) || [];
    const selected = [...state.needs].map(id => all.find(item => item.id === id)).filter(Boolean);
    return {all,selected,matched:selected.filter(item => item.available && item.met).length,unknown:selected.filter(item => !item.available).length,total:state.needs.size};
  }
  function fitBadge(apartment) {
    const fit = homeFit(apartment);
    if (!fit.total) return '<span class="match-badge neutral">집과 동네를 함께 살펴보세요</span>';
    if (!fit.matched && fit.unknown) return `<span class="match-badge neutral">${icon('info')}조건 자료 ${fit.unknown}개 확인 필요</span>`;
    return `<span class="match-badge ${fit.matched === fit.total ? 'full' : 'partial'}">${icon(fit.matched === fit.total ? 'check' : 'info')}선택 조건 ${fit.matched}/${fit.total} 충족${fit.unknown ? ` · ${fit.unknown}개 미확인` : ''}</span>`;
  }
  function pageApartments() { return filtered.slice((state.page-1)*pageSize,state.page*pageSize); }
  function renderCoverage() {
    const positioned = apartments.filter(hasCoordinates).length, priced = apartments.filter(representativeTrade).length;
    $('#catalog-coverage').innerHTML = `<div class="catalog-metric"><strong>${apartments.length.toLocaleString('ko-KR')}개</strong><span>공식 공동주택 목록</span></div><div class="catalog-metric"><strong>${positioned.toLocaleString('ko-KR')}개</strong><span>지도 위치 확인</span></div><div class="catalog-metric"><strong>${priced.toLocaleString('ko-KR')}개</strong><span>매매 사례 수록</span></div><div class="catalog-coverage-note"><p>서구청 ${date(housing.catalogDataDate)} · K-apt ${date(housing.metadataDataDate)} 자료 반영. 가격 자료가 없는 단지도 찾을 수 있어요. 목록·위치·거래자료는 확인 범위가 서로 다릅니다.</p><button type="button" class="text-button" data-reset-catalog>전체 ${apartments.length}개 단지 보기</button> · <button type="button" class="text-button" data-open="catalog-sources">자료 범위·출처</button></div>`;
  }
  function renderPagination() {
    const pages = Math.max(1,Math.ceil(filtered.length/pageSize));
    state.page = Math.max(1,Math.min(state.page,pages));
    $('#catalog-pagination').hidden = filtered.length <= pageSize;
    $('#catalog-prev').disabled = state.page === 1;
    $('#catalog-next').disabled = state.page === pages;
    $('#catalog-page-label').textContent = `${state.page} / ${pages} 페이지 · ${pageSize}개씩`;
  }
  function changePage(delta) {
    const pages = Math.max(1,Math.ceil(filtered.length/pageSize));
    state.page = Math.max(1,Math.min(state.page+delta,pages));
    renderApartments(); renderMarkers(); fitMap();
    $('.results-topline').scrollIntoView({behavior:'auto',block:'start'});
  }
  function profileReasons(apartment, limit = 3) {
    const fit = homeFit(apartment);
    if (fit.total) return fit.selected.slice(0,limit);
    return ['nature','elementary'].map(id => fit.all.find(item => item.id === id)).filter(item => item?.available).slice(0,limit);
  }
  function reasonMarkup(item, personal = true, className = '') {
    const status = !item.available ? 'unknown' : !personal || item.met ? 'met' : 'unmet';
    const criterion = needCriteria.find(c => c.id === item.id);
    const label = !personal && item.id === 'nature' ? '가까운 공원·호수' : !personal && item.id === 'elementary' ? '가까운 초등학교' : item.label;
    return `<li class="${className} ${status}">${icon(!personal ? criterion?.icon || 'pin' : status === 'met' ? 'check' : 'info')}<span><strong>${esc(label)}${personal && !item.met ? `<em>${item.available ? '기준 밖' : '자료 미확인'}</em>` : ''}</strong><small>${esc(item.detail)}</small></span></li>`;
  }
  function renderNeeds() {
    const shortRules = {nature:'수록 공원·호수 직선 1.5km 이내',culture:'수록 문화공간 직선 1.5km 이내',market:'양동시장 직선 1.5km 이내',elementary:'수록 초등학교 직선 500m 이내',middle:'수록 중학교 직선 500m 이내',space:'대표 거래의 전용면적 기준',recent:'자료에 기재된 준공연도 기준'};
    if (!$('#needs-grid').children.length) $('#needs-grid').innerHTML = needCriteria.map(c => `<button type="button" class="need-option" data-need="${esc(c.id)}" aria-pressed="false"><span class="need-icon">${icon(c.icon)}</span><span class="need-copy"><strong>${esc(c.label)}</strong><small>${esc(c.description)}</small><em class="need-rule">${esc(shortRules[c.id] || c.rule)}</em></span><span class="need-check">${icon('check')}</span></button>`).join('');
    $$('[data-need]').forEach(button => {
      const id = button.dataset.need, active = state.needs.has(id);
      const available = apartments.some(a => homeProfiles.get(a.id)?.some(item => item.id === id && item.available));
      button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); button.disabled = !available;
      $('.need-rule',button).textContent = available ? shortRules[id] : ['elementary','middle'].includes(id) ? '학교 위치 자료를 불러오지 못했어요' : '비교에 필요한 자료를 불러오지 못했어요';
    });
    $('#needs-counter').textContent = `${state.needs.size} / 3 선택`;
    $('#needs-summary').textContent = state.needs.size ? [...state.needs].map(id => needCriteria.find(c => c.id === id)?.label).filter(Boolean).join(' · ') : '원하는 생활을 선택해 보세요.';
    $('#find-my-home').innerHTML = (state.needs.size ? '이 조건으로 집 보기' : '전체 단지 둘러보기') + icon('arrow-right');
    $('#clear-needs').hidden = state.needs.size === 0;
    $('#only-all-needs').disabled = state.needs.size === 0;
    $('#only-all-needs').checked = state.strictNeeds;
  }
  function toggleNeed(id) {
    if (!needCriteria.some(c => c.id === id)) return;
    if (!apartments.some(a => homeProfiles.get(a.id)?.some(item => item.id === id && item.available))) return;
    if (state.needs.has(id)) state.needs.delete(id);
    else if (state.needs.size < 3) state.needs.add(id);
    else { toast('중요한 조건을 최대 3가지 골라주세요. 선택한 조건을 한 번 더 누르면 해제돼요.'); return; }
    if (!state.needs.size) state.strictNeeds = false;
    state.sort = 'match'; $('#sort-order').value = 'match';
    renderNeeds(); applyFilters(); fitMap();
  }
  function renderMatchSummary() {
    const active = [...state.needs].map(id => needCriteria.find(c => c.id === id)?.label).filter(Boolean);
    const fullCount = filtered.filter(a => homeFit(a).matched === active.length).length;
    const partialCount = filtered.filter(a => homeFit(a).matched > 0 && homeFit(a).matched < active.length).length;
    const unknownCount = filtered.filter(a => homeFit(a).matched === 0 && homeFit(a).unknown > 0).length;
    $('#selected-needs-title').textContent = active.length ? active.join(' · ') : '공식 목록에서 집과 동네를 둘러보세요';
    $('#edit-needs').innerHTML = (active.length ? '생활 조건 바꾸기' : '생활 조건 고르기') + icon('arrow-up-right');
    $('#match-summary').textContent = active.length ? `현재 결과: 전체 조건 충족 ${fullCount}곳${state.strictNeeds ? '' : ` · 일부 충족 ${partialCount}곳 · 조건 자료 확인 필요 ${unknownCount}곳`}. ${state.sort === 'match' ? '충족 개수가 많은 순이며, 동률은 단지 이름순입니다.' : '선택한 정렬 방식으로 보여드리며, 해당 자료가 없는 단지는 뒤에 표시합니다.'}` : `공식 공동주택 목록 ${apartments.length}개를 기준으로 살펴보세요. 거래가격이 미수록된 단지도 포함하며, 생활 조건의 미확인 정보는 따로 표시합니다.`;
    $('#match-empty-note').hidden = !active.length || fullCount > 0 || !filtered.length || state.strictNeeds;
    $('#match-empty-note').textContent = '모든 조건을 충족한다고 확인된 집은 없어요. 일부 조건이 맞는 집과 조건 자료를 더 확인해야 하는 단지를 함께 보여드립니다.';
    const refineCount = [Boolean(state.query),state.neighborhood !== 'all',state.price !== 'all',state.area !== 'all'].filter(Boolean).length;
    $('#refine-count').textContent = refineCount ? `${refineCount}개 적용` : '선택 사항';
  }
  function detailHomeStory(apartment) {
    const fit = homeFit(apartment);
    return `<section class="home-story"><p class="eyebrow">YOUR EVERYDAY, HERE</p><h3>${fit.total ? '선택한 생활 조건으로 살펴보면' : '이 집에서 그려볼 일상'}</h3>${fitBadge(apartment)}<ul class="detail-match-list">${profileReasons(apartment,3).map(item => reasonMarkup(item,fit.total > 0,'match-reason')).join('')}</ul>${!hasCoordinates(apartment) ? '<p class="catalog-location-note">주변 거리 비교에는 단지 위치 확인이 필요해요. 아래에서 공식 주소와 단지 기본정보를 먼저 살펴보세요.</p>' : ''}<p class="needs-footnote">${fit.total ? '기준 밖인 조건도 실제 수치로 함께 확인하세요. ' : ''}명소·학교는 수록된 장소 중 가까운 곳이며, 거리와 학교 배정은 별개입니다.</p><button type="button" class="text-button" data-change-needs>생활 조건 다시 고르기</button></section>`;
  }
  function transactionStory(apartment) {
    const tx = representativeTrade(apartment);
    return tx ? `이 단지에서 확인한 전용 ${area(tx.area)}㎡ · ${tx.floor}층의 매매 사례는 ${date(tx.date)} 계약, ${price(tx.priceMan)}입니다.` : '이 단지는 공동주택 목록에 수록되어 있지만, 확인한 개별 매매 거래자료는 아직 수록하지 않았습니다.';
  }
  function applyFilters(resetPage = true) {
    if (resetPage) state.page = 1;
    const query = state.query.toLocaleLowerCase('ko-KR').replace(/\s/g,'');
    filtered = apartments.filter(apartment => {
      const tx = representativeTrade(apartment);
      const searchText = [apartment.name,...(apartment.aliases || []),apartment.neighborhood,apartment.address,apartment.roadAddress,apartment.neighborhood === '치평동' ? '상무지구' : ''].join(' ').toLocaleLowerCase('ko-KR').replace(/\s/g,'');
      if (query && !searchText.includes(query)) return false;
      if (state.neighborhood !== 'all' && apartment.neighborhood !== state.neighborhood) return false;
      if (state.price !== 'all') { if (!tx) return false; const [min,max] = state.price.split('-').map(Number); if ((min > 0 ? tx.priceMan <= min : tx.priceMan < min) || tx.priceMan > max) return false; }
      if (state.area !== 'all' && !tx) return false;
      if (state.area === 'small' && tx.area >= 60) return false;
      if (state.area === 'medium' && (tx.area < 60 || tx.area > 85)) return false;
      if (state.area === 'large' && tx.area <= 85) return false;
      if (state.savedOnly && !saved.has(apartment.id)) return false;
      const fit = homeFit(apartment);
      if (state.needs.size && (state.strictNeeds ? fit.matched !== state.needs.size : fit.matched === 0 && fit.unknown === 0)) return false;
      return true;
    }).sort((a,b) => {
      const byName = a.name.localeCompare(b.name,'ko');
      if (state.sort === 'match') return homeFit(b).matched-homeFit(a).matched || byName;
      if (state.sort === 'name') return byName;
      const at = representativeTrade(a), bt = representativeTrade(b);
      if (!at || !bt) return at ? -1 : bt ? 1 : byName;
      if (state.sort === 'price-asc') return at.priceMan-bt.priceMan || byName;
      if (state.sort === 'price-desc') return bt.priceMan-at.priceMan || byName;
      return bt.date.localeCompare(at.date) || byName;
    });
    renderApartments(); renderMatchSummary(); renderMarkers();
  }
  function renderApartments() {
    renderPagination();
    const visible = pageApartments(), start = (state.page-1)*pageSize;
    $('#results-count').innerHTML = `<strong>${filtered.length}개 단지</strong><span>${filtered.length ? ` · ${start+1}–${start+visible.length}번째 표시` : ''}${state.savedOnly ? ' · 관심 단지' : ''}</span>`;
    $('#empty-state').hidden = filtered.length > 0;
    $('#apartment-list').innerHTML = visible.map((apartment,index) => {
      const tx = representativeTrade(apartment), number = start+index+1;
      return `<article class="apartment-card${state.selected === apartment.id ? ' selected' : ''}" data-id="${esc(apartment.id)}">
        <div class="apt-top"><span class="home-number" aria-label="목록 번호 ${number}">${String(number).padStart(2,'0')}</span><span class="apt-neighborhood">${icon('pin')}${esc(apartment.neighborhood)}</span><button class="save-button${saved.has(apartment.id) ? ' is-saved' : ''}" type="button" data-save="${esc(apartment.id)}" aria-label="${esc(apartment.name)} ${saved.has(apartment.id) ? '관심 해제' : '관심 저장'}" aria-pressed="${saved.has(apartment.id)}">${icon('heart')}</button></div>
        <h3 class="apt-name"><button type="button" data-apartment="${esc(apartment.id)}">${esc(apartment.name)}</button></h3>
        <p class="catalog-card-address">${esc((apartment.roadAddress || apartment.address || '').replace(/^전남광주통합특별시 서구\s*/,''))}</p>
        <span class="catalog-status">공식 목록 · ${esc(apartment.housingType || '공동주택')}</span>
        ${fitBadge(apartment)}
        <ul class="match-reasons">${profileReasons(apartment).map(item => reasonMarkup(item,state.needs.size > 0)).join('')}</ul>
        ${!hasCoordinates(apartment) ? '<p class="catalog-location-note">단지 위치 자료 미확인 · 주변 거리는 아직 계산할 수 없어요.</p>' : ''}
        <p class="apt-home-facts">${esc(homeFacts(apartment))}</p>
        <button type="button" class="apt-school-link" data-school-apartment="${esc(apartment.id)}">${icon('school')}학교·통학구역 확인${icon('arrow-up-right')}</button>
        <details class="card-price"><summary>${tx ? '이 집의 거래금액 확인' : '거래자료 미수록 · 확인 방법'}${icon('receipt')}</summary><div>${tx ? `<strong>${price(tx.priceMan)}</strong><p>${date(tx.date)} 계약 · 전용 ${area(tx.area)}㎡ · ${tx.floor}층</p><small>확인한 개별 매매 사례 · 현재 매물 가격과 다릅니다.</small><button type="button" data-apartment="${esc(apartment.id)}" data-section="price">거래 조건과 다른 사례 보기${icon('arrow-right')}</button>` : `<p>공식 목록에 있는 단지이며, 확인한 개별 거래가격은 아직 수록하지 않았어요. 실제 거래가 없다는 뜻은 아닙니다.</p><button type="button" data-apartment="${esc(apartment.id)}" data-section="price">주소와 공식 확인 방법 보기${icon('arrow-right')}</button>`}</div></details>
        <div class="apt-bottom"><button type="button" class="detail-button" data-apartment="${esc(apartment.id)}">이 집의 일상 살펴보기${icon('arrow-right')}</button><label class="compare-toggle"><input type="checkbox" data-compare="${esc(apartment.id)}"${state.compare.has(apartment.id) ? ' checked' : ''}>비교</label></div>
      </article>`;
    }).join('');
    $('#saved-only').setAttribute('aria-pressed',String(state.savedOnly));
    $('#saved-only').classList.toggle('active',state.savedOnly);
    $('#saved-count').textContent = saved.size;
    $('#open-saved').setAttribute('aria-label',`관심 단지 ${saved.size}개 보기`);
  }

  async function initMap() {
    if (!window.L) { $('#map-fallback').hidden = false; return; }
    if (map) { map.remove(); markerById.clear(); }
    $('#map-fallback').hidden = true;
    map = L.map('map',{preferCanvas:true,zoomControl:false,scrollWheelZoom:false,minZoom:12,maxZoom:16,maxBounds:[[35.07,126.77],[35.215,126.95]],maxBoundsViscosity:0.8}).setView([35.148,126.868],13);
    L.control.zoom({position:'bottomright',zoomInTitle:'확대',zoomOutTitle:'축소'}).addTo(map);
    L.control.scale({position:'bottomleft',imperial:false,maxWidth:100}).addTo(map);
    map.attributionControl.addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · 생활권 위치도');
    map.createPane('baseAreas'); map.getPane('baseAreas').style.zIndex = 210;
    map.createPane('baseRoads'); map.getPane('baseRoads').style.zIndex = 220;
    map.createPane('baseLabels'); map.getPane('baseLabels').style.zIndex = 230;
    apartmentLayer = L.layerGroup().addTo(map);
    placeLayer = L.layerGroup().addTo(map);
    schoolLayer = L.layerGroup().addTo(map);
    renderMarkers();
    fitMap();
    const currentMap = map;
    try {
      if (!baseGeo) { const response = await fetch('./assets/seogu-basemap.geojson'); if (!response.ok) throw new Error('위치도 자료 없음'); baseGeo = await response.json(); }
      if (map !== currentMap) return;
      L.geoJSON(baseGeo,{pane:'baseAreas',interactive:false,filter:f => f.properties.kind !== 'road',style:f => f.properties.kind === 'water' ? {color:'#93bfca',weight:2,fillColor:'#c0dce0',fillOpacity:0.9} : {color:'#c1d5b4',weight:1,fillColor:f.properties.kind === 'forest' ? '#ccddc0' : '#dce8ce',fillOpacity:0.85}}).addTo(map);
      L.geoJSON(baseGeo,{pane:'baseRoads',interactive:false,filter:f => f.properties.kind === 'road',style:f => ({color:'#d3d4c7',weight:['motorway','trunk','primary'].includes(f.properties.highway) ? 6 : 3,opacity:0.8})}).addTo(map);
      L.geoJSON(baseGeo,{pane:'baseRoads',interactive:false,filter:f => f.properties.kind === 'road',style:f => ({color:['motorway','trunk'].includes(f.properties.highway) ? '#f4dfae' : '#fffdf4',weight:['motorway','trunk','primary'].includes(f.properties.highway) ? 4 : 1.6,opacity:1})}).addTo(map);
      const labelNames = new Set();
      for (const feature of baseGeo.features) {
        if (feature.properties.kind !== 'road' || !feature.properties.name || labelNames.has(feature.properties.name) || !['primary','secondary'].includes(feature.properties.highway) || feature.geometry.type !== 'LineString') continue;
        const coords = feature.geometry.coordinates;
        if (coords.length < 8) continue;
        const point = coords[Math.floor(coords.length/2)];
        if (point[1] < 35.117 || point[1] > 35.178 || point[0] < 126.835 || point[0] > 126.905) continue;
        labelNames.add(feature.properties.name);
        L.tooltip({permanent:true,direction:'center',className:'road-label',pane:'baseLabels',interactive:false,opacity:1}).setLatLng([point[1],point[0]]).setContent(esc(feature.properties.name)).addTo(map);
        if (labelNames.size >= 10) break;
      }
    } catch { if (map === currentMap) $('#map-fallback').hidden = false; }
  }
  function renderMarkers() {
    const visible = pageApartments(), start = (state.page-1)*pageSize;
    $('#map-list-status').textContent = `현재 페이지 ${visible.length}개 중 위치 확인 ${visible.filter(hasCoordinates).length}개 표시 · 위치 미확인 단지도 목록에서 확인할 수 있어요.`;
    if (!map || !apartmentLayer) return;
    apartmentLayer.clearLayers(); placeLayer.clearLayers(); schoolLayer.clearLayers(); markerById.clear();
    for (const [index,apartment] of visible.entries()) {
      if (!hasCoordinates(apartment)) continue;
      const number = start+index+1;
      const marker = L.marker([apartment.lat,apartment.lng],{icon:L.divIcon({className:'home-marker-wrap',html:`<span class="home-marker${state.selected === apartment.id ? ' selected' : ''}"><b>${number}</b><span>${esc(apartment.name)}</span></span>`,iconSize:[144,34],iconAnchor:[72,36]}),title:`목록 ${number}번 · ${apartment.name}`,keyboard:true,zIndexOffset:100}).addTo(apartmentLayer);
      const popup = document.createElement('div');
      popup.className = 'map-popup';
      popup.innerHTML = `<span>${esc(apartment.neighborhood)} · 목록 ${number}번</span><strong>${esc(apartment.name)}</strong>${fitBadge(apartment)}<ul class="popup-reasons match-reasons">${profileReasons(apartment,3).map(item => reasonMarkup(item,state.needs.size > 0)).join('')}</ul><button type="button" data-apartment="${esc(apartment.id)}">이 집의 일상·가격 살펴보기 ${icon('arrow-right')}</button>`;
      marker.bindPopup(popup,{maxWidth:260,closeButton:true,offset:[0,-25]});
      marker.on('click',() => { selectApartment(apartment.id,false); });
      markerById.set(apartment.id,marker);
    }
    if ($('#show-places').checked) for (const place of places.filter(hasCoordinates)) {
      const marker = L.marker([place.lat,place.lng],{icon:L.divIcon({className:'place-marker-wrap',html:`<span class="place-marker ${place.category}">${icon(categoryIcon[place.category])}</span>`,iconSize:[30,30],iconAnchor:[15,15]}),title:place.name,keyboard:true}).addTo(placeLayer);
      const popup = document.createElement('div'); popup.className = 'map-popup';
      popup.innerHTML = `<span>${categoryLabel[place.category]}</span><strong>${esc(place.name)}</strong><p>${esc(place.description)}</p><button type="button" data-place="${esc(place.id)}">장소 자세히 보기 ${icon('arrow-right')}</button>`;
      marker.bindPopup(popup,{maxWidth:240});
    }
    if ($('#show-schools')?.checked) for (const school of schools.filter(hasCoordinates)) {
      const marker = L.marker([school.lat,school.lng],{icon:L.divIcon({className:'school-marker-wrap',html:`<span class="school-marker ${esc(school.level)}">${schoolShortLabels[school.level]}</span>`,iconSize:[25,25],iconAnchor:[12,12]}),title:`${school.name} · ${schoolLabels[school.level]} · 주변 학교 위치`,keyboard:true,zIndexOffset:-50}).addTo(schoolLayer);
      const popup = document.createElement('div'); popup.className = 'map-popup';
      popup.innerHTML = `<span>${schoolLabels[school.level]} · ${esc(school.establishment)}</span><strong>${esc(school.name)}</strong><small>학교 위치 표시 · 아파트 배정 관계와 별개</small><button type="button" data-school="${esc(school.id)}">학교 자세히 보기 ${icon('arrow-right')}</button>`;
      marker.bindPopup(popup,{maxWidth:250});
    }
  }
  function fitMap() { if (!map) return; map.invalidateSize(); const points = pageApartments().filter(hasCoordinates).map(a => [a.lat,a.lng]); if (points.length) map.fitBounds(points,{padding:[45,55],maxZoom:14,animate:false}); }
  function selectApartment(id, pan = true) {
    state.selected = id;
    $$('.apartment-card').forEach(card => card.classList.toggle('selected',card.dataset.id === id));
    markerById.forEach((marker,key) => { const element = marker.getElement(); if (element) $('.home-marker',element)?.classList.toggle('selected',key === id); });
    const apartment = apartments.find(a => a.id === id);
    if (map && hasCoordinates(apartment) && pan) map.setView([apartment.lat,apartment.lng],Math.max(map.getZoom(),14),{animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});
  }

  function toggleSaved(id) {
    if (!apartments.some(a => a.id === id)) return;
    if (saved.has(id)) { saved.delete(id); toast('관심 단지에서 해제했어요.'); }
    else { saved.add(id); toast(persistentStorage ? '관심 단지에 담았어요. 이 브라우저에 저장됩니다.' : '관심 단지에 담았어요. 현재 화면에서만 유지됩니다.'); }
    try { localStorage.setItem('seogustay:saved:v1',JSON.stringify([...saved])); } catch { persistentStorage = false; toast('현재 브라우저에서는 저장이 제한되어, 이 화면에서만 유지됩니다.'); }
    if (state.savedOnly) applyFilters(false); else renderApartments();
    $$('[data-save]').forEach(button => { const active = saved.has(button.dataset.save); button.classList.toggle('is-saved',active); button.setAttribute('aria-pressed',String(active)); if (button.classList.contains('detail-save')) button.innerHTML = icon('heart') + (active ? '관심 단지에 담았어요' : '관심 단지 담기'); });
  }
  function updateCompare() {
    $('#compare-tray').hidden = state.compare.size === 0;
    $('#compare-summary').textContent = `${state.compare.size} / 3개 선택`;
    $('#open-compare').disabled = state.compare.size < 2;
    $('#open-compare').title = state.compare.size < 2 ? '2개 이상 선택하면 비교할 수 있어요.' : '선택한 단지 비교하기';
    $$('[data-compare]').forEach(input => { input.checked = state.compare.has(input.dataset.compare); });
  }
  function resetFilters() {
    Object.assign(state,{query:'',neighborhood:'all',price:'all',area:'all'});
    $('#query').value = ''; $('#neighborhood').value = 'all'; $('#price-filter').value = 'all'; $('#area-filter').value = 'all';
    applyFilters(); fitMap();
  }
  function catalogFacts(apartment) {
    const floors = Number.isInteger(apartment.maxFloors) && apartment.maxFloors > 0 ? (Number.isInteger(apartment.minFloors) && apartment.minFloors > 0 && apartment.minFloors !== apartment.maxFloors ? `${apartment.minFloors}–${apartment.maxFloors}층` : `${apartment.maxFloors}층`) : '미확인';
    return `<section class="catalog-detail-facts"><h3>단지 기본정보와 자료 출처</h3><dl><dt>세대수</dt><dd>${unitCountText(apartment) || '미확인'}</dd><dt>동수</dt><dd>${Number.isInteger(apartment.buildingCount) && apartment.buildingCount > 0 ? apartment.buildingCount + '개 동' : '미확인'}</dd><dt>층수</dt><dd>${floors}</dd><dt>준공연도</dt><dd>${builtYearText(apartment)}</dd><dt>단지 구분</dt><dd>${esc(apartment.housingType || '공동주택')}</dd><dt>목록 기준</dt><dd>${date(apartment.catalogDataDate || housing.catalogDataDate)}</dd></dl><p class="source-line">${external(apartment.catalogSourceUrl || housing.catalogSourceUrl,'공식 단지 목록')}${external(apartment.metadataSourceUrl,apartment.metadataSourceType === 'official_kapt' ? `K-apt 기본정보 · ${date(apartment.metadataDataDate)}` : '기존 기본정보 출처')}${external(apartment.coordinatesSourceUrl,'단지 위치 출처')}</p>${apartment.metadataSourceType === 'official_kapt' ? '<p class="education-footnote">준공연도는 K-apt 사용승인일의 연도이며, 단지 구분은 같은 공식 자료를 따릅니다.</p>' : ''}${apartment.catalogParcelConflict ? '<p class="education-footnote">원자료의 지번 표기가 다른 단지와 겹칩니다. 별도 K-apt 코드와 도로명 주소로 구분했으며, 위치 확인에는 위 도로명 주소를 사용하세요.</p>' : ''}${apartment.coordinatesSourceLabel ? `<p class="education-footnote">위치: ${esc(apartment.coordinatesSourceLabel)}. 단지 대표 위치이며 출입구·통학로와 다를 수 있습니다.</p>` : ''}</section>`;
  }
  function apartmentPriceSection(apartment) {
    const tx = representativeTrade(apartment);
    if (!tx) return `<section class="detail-section price-explanation" id="apartment-price"><p class="eyebrow">PRICE INFORMATION</p><h3>이 집의 거래자료는 아직 수록하지 않았어요.</h3><div class="price-unavailable"><p>이 단지는 공식 공동주택 목록에 수록되어 있습니다. 현재 서비스에 확인한 개별 매매 사례가 없는 것으로, 실제 거래가 없거나 가격이 0원이라는 뜻은 아닙니다.</p><p><strong>${esc(apartment.name)}</strong><br>${esc(apartment.roadAddress || apartment.address)}</p><p>공식 실거래가 공개시스템에서 단지명과 주소를 검색해 계약일·전용면적·층을 함께 확인하세요.</p>${external(housing.officialSourceUrl,'국토교통부에서 거래자료 확인','button secondary')}</div></section>`;
    return `<section class="detail-section price-explanation" id="apartment-price"><p class="eyebrow">NOW, THE PRICE OF THIS HOME</p><h3>이 집의 거래가격, 이렇게 읽어보세요.</h3><p class="price-context">${transactionStory(apartment)}</p><div class="detail-price-panel"><div><span>${esc(apartment.name)} · 확인한 개별 매매 사례</span><strong>${price(tx.priceMan)}</strong></div><div class="detail-meta"><span>${date(tx.date)} 계약</span><span>전용 ${area(tx.area)}㎡ · ${tx.floor}층</span></div></div><p class="detail-section-subtitle">이 금액은 해당 면적·층·계약일의 거래입니다. 현재 매물의 호가나 단지 전체 시세를 뜻하지 않습니다. 아래에서 같은 전용면적의 다른 확인 사례를 함께 보세요.</p><div class="table-wrap"><table class="transaction-table"><caption class="sr-only">${esc(apartment.name)} 동일 전용면적의 확인 거래 사례</caption><thead><tr><th scope="col">계약일</th><th scope="col">전용면적</th><th scope="col">층</th><th scope="col">거래금액</th></tr></thead><tbody>${apartment.transactions.map(t => `<tr><td>${date(t.date)}</td><td>${area(t.area)}㎡</td><td>${t.floor}층</td><td>${price(t.priceMan)}</td></tr>`).join('')}</tbody></table></div><p class="source-line">${external(apartment.sourceUrl,'거래자료 원문: 쏙집')}${external(apartment.crossCheckUrl,'대표 사례 교차 확인: DHOME')}</p><p class="education-footnote">거래자료 확인일 ${date(housing.checkedAt)} · 추가 신고·정정·해제 내역은 자동 반영되지 않습니다.</p></section>`;
  }
  function openApartment(id, focusSection = '') {
    const apartment = apartments.find(a => a.id === id); if (!apartment) return;
    selectApartment(id);
    const near = nearby(apartment,4), schoolFirst = state.needs.has('elementary') || state.needs.has('middle');
    $('#detail-content').innerHTML = `<div class="detail-body"><p class="detail-eyebrow">${icon('pin')}${esc(apartment.neighborhood)} · HOME & NEIGHBORHOOD</p><h2>${esc(apartment.name)}</h2><p class="detail-address">${esc(apartment.roadAddress || apartment.address)}</p>
      <div class="detail-actions"><button type="button" class="button primary detail-save${saved.has(id) ? ' is-saved' : ''}" data-save="${esc(id)}" aria-pressed="${saved.has(id)}">${icon('heart')}${saved.has(id) ? '관심 단지에 담았어요' : '관심 단지 담기'}</button>${external(mapLink(apartment),hasCoordinates(apartment) ? '지도에서 위치 보기' : '주소로 위치 찾아보기','button secondary')}</div>
      ${detailHomeStory(apartment)}
      <div class="detail-journey-links"><button type="button" data-detail-jump="apartment-schools">학교·학군${icon('arrow-right')}</button><button type="button" data-detail-jump="apartment-around">주변의 일상${icon('arrow-right')}</button><button type="button" data-detail-jump="apartment-price">이 집의 거래자료${icon('arrow-right')}</button></div>
      ${catalogFacts(apartment)}
      ${schoolFirst ? `<div id="apartment-schools">${detailSchoolSection(apartment)}</div>` : ''}
      <section class="detail-section" id="apartment-around"><h3>이 집에서 만나는 동네의 매력</h3>${near.length ? `<p class="detail-section-subtitle">수록 명소를 가까운 순서로 보여드려요. 거리는 지도 좌표로 계산한 직선거리입니다.</p><div class="nearby-list">${near.map(p => `<button type="button" class="nearby-item" data-place="${esc(p.id)}"><span class="nearby-icon ${p.category}">${icon(categoryIcon[p.category])}</span><div><strong>${esc(p.name)}</strong><small>${categoryLabel[p.category]} · ${esc(p.description)}</small></div><span>${distanceText(p.distance)}${icon('arrow-up-right')}</span></button>`).join('')}</div>` : `<p class="catalog-location-note">단지 위치 자료가 미확인되어 주변 명소와의 거리는 아직 계산하지 않았습니다. 확인된 주소로 외부 지도에서 주변 환경을 살펴보세요.</p>${external(mapLink(apartment),'주소로 주변 살펴보기','button secondary')}`}</section>
      ${apartmentPriceSection(apartment)}
      ${schoolFirst ? '' : `<div id="apartment-schools">${detailSchoolSection(apartment)}</div>`}
      <div class="info-block"><p>공식 목록에 있는 단지를 소개하는 정보이며 현재 입주 가능 매물 목록은 아닙니다. 목록·위치·거래자료의 기준일과 확인 범위가 서로 다릅니다.</p><p>가격이 수록된 경우 특정 면적·층·계약일의 개별 거래 사례이며 현재 호가나 단지 전체 시세를 뜻하지 않습니다. 단지 대표 위치와 실제 출입구·이동 경로도 다를 수 있습니다.</p></div></div>`;
    openDialog('#detail-dialog');
    if (focusSection === 'price') requestAnimationFrame(() => jumpWithinDetail('apartment-price'));
  }
  function jumpWithinDetail(id) {
    const target = document.getElementById(id), dialog = $('#detail-dialog');
    if (!target || !dialog.open || !dialog.contains(target)) return;
    dialog.scrollTo({top:dialog.scrollTop+target.getBoundingClientRect().top-dialog.getBoundingClientRect().top-24,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }

  function placeImage(place) { return place.image ? `<img src="${esc(place.image)}" alt="${esc(place.imageAlt || place.name + ' 풍경')}" loading="lazy">` : `<div class="place-illustration ${place.category}" aria-hidden="true">${icon(categoryIcon[place.category])}<span>SEOGU · ${esc(place.neighborhood || '서구')}</span></div>`; }
  function renderPlaces() {
    const visible = places.filter(p => state.placeCategory === 'all' || p.category === state.placeCategory);
    $('#places-grid').innerHTML = visible.map(place => `<button type="button" class="place-card${place.image ? '' : ' no-image'}" data-place="${esc(place.id)}"><div class="place-image-wrap">${placeImage(place)}<span class="place-category">${categoryLabel[place.category]}</span><span class="place-card-arrow">${icon('arrow-up-right')}</span></div><div class="place-card-copy"><span class="place-district">${esc(place.neighborhood || '서구의 발견')}</span><h3>${esc(place.name)}</h3><p>${esc(place.description)}</p></div></button>`).join('');
  }
  function openPlace(id) {
    const place = places.find(p => p.id === id); if (!place) return;
    const nearApartments = apartments.map(a => ({...a,distance:distance(place,a)})).filter(a => a.distance !== null).sort((a,b) => a.distance-b.distance).slice(0,3);
    const photo = placeData.photos.find(p => p.slug === place.photoId);
    $('#detail-content').innerHTML = `${place.image ? `<div class="detail-hero"><img src="${esc(place.image)}" alt="${esc(place.imageAlt || place.name + ' 풍경')}"></div>` : ''}<div class="detail-body"><p class="detail-eyebrow">${icon(categoryIcon[place.category])}${categoryLabel[place.category]} · ${esc(place.neighborhood || '서구')}</p><h2>${esc(place.name)}</h2><p class="detail-address">${esc(place.address)}</p><p class="place-description">${esc(place.description)}</p>${place.detail && place.detail !== place.description ? `<p class="place-description">${esc(place.detail)}</p>` : ''}<div class="detail-actions">${external(place.sourceUrl,'공식 소개 보기','button primary')}${external(`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`,'카카오맵에서 위치 보기','button secondary')}</div><section class="detail-section"><h3>이 장소 주변에서 살펴볼 집</h3><p class="detail-section-subtitle">수록 단지 중 위치가 확인된 곳에서 직선거리로 가까운 세 곳입니다.</p><div class="nearby-list">${nearApartments.map(a => `<button type="button" class="nearby-item" data-apartment="${esc(a.id)}"><span class="nearby-icon">${icon('home')}</span><div><strong>${esc(a.name)}</strong><small>${esc(a.neighborhood)} · ${esc(homeFacts(a))}</small></div><span>${distanceText(a.distance)}${icon('arrow-up-right')}</span></button>`).join('')}</div></section><div class="info-block"><p>장소 정보: 광주관광 공식 안내 · 확인 ${date(placeData.checkedAt)}. 체험·전시·행사 일정과 이용 조건은 방문 전 공식 안내에서 확인하세요.</p>${photo ? `<p>사진: ${esc(photo.attribution || photo.source)} · ${esc(photo.title)}. ${esc(photo.copyright)}.</p>${external(photo.sourceUrl,'사진 원문 보기')}` : ''}<p>표시 거리는 대표 좌표 간 직선거리로, 도보·차량 이동거리와 다릅니다.</p></div></div>`;
    openDialog('#detail-dialog');
  }
  function renderDay() {
    const stories = [
      {id:'pungam',time:'산책이 생각나는 아침',title:'호수를 따라, 가볍게 한 바퀴',description:'풍암호수의 물빛과 초록을 만나는 시간.',icon:'sun'},
      {id:'yangdong',time:'동네를 만나는 오후',title:'장바구니에 담는 동네의 맛',description:'양동시장에서 장을 보고, 시장 골목을 구경해요.',icon:'bag'},
      {id:'uncheon',time:'느긋하게 마무리하는 저녁',title:'익숙한 풍경이 주는 작은 쉼',description:'운천저수지에서 하루의 속도를 늦춰보세요.',icon:'moon'}
    ];
    $('#day-stories').innerHTML = stories.filter(s => places.some(p => p.id === s.id)).map((s,i) => `<button type="button" class="day-story" data-place="${s.id}"><span class="story-number">0${i+1}</span><div><span class="story-time">${icon(s.icon)}${s.time}</span><h3>${s.title}</h3><p>${s.description}</p><span class="story-link">${esc(places.find(p => p.id === s.id).name)} 만나보기${icon('arrow-up-right')}</span></div></button>`).join('');
  }

  function showCompare() {
    if (state.compare.size < 2) { toast('비교할 단지를 2개 이상 선택해주세요.'); return; }
    const selected = apartments.filter(a => state.compare.has(a.id));
    const needRows = [...state.needs].map(id => [needCriteria.find(c => c.id === id).label,a => { const item = homeFit(a).all.find(r => r.id === id); return `${esc(item.detail)}<small>${!item.available ? '자료 미확인' : item.met ? '선택 조건 충족' : '선택 기준 밖'}</small>`; }]);
    const rows = [
      ['동네',a => esc(a.neighborhood)],
      ...(state.needs.size ? [['선택 조건',a => fitBadge(a)],...needRows] : []),
      ['주변의 발견',a => nearby(a,3).map(p => `<div class="compare-nearby">${esc(p.name)}<small>${distanceText(p.distance)}</small></div>`).join('') || '단지 위치 자료 미확인'],
      ['초등 참고 통학구역',a => `${esc(apartmentZone(a)?.elementaryNames?.join(' · ') || '공식 확인 필요')}<small>단지 대표 위치·지도 기준 / 배정 확정 아님</small>`],
      ['중학교 참고 학교군',a => `${esc(apartmentZone(a)?.middleGroupName || '공식 확인 필요')}<small>출신 초등학교별 배정 가능 학교 별도 확인</small>`],
      ['가까운 초등학교',a => { const s = nearbySchools(a,'elementary',1)[0]; return s ? `${esc(s.name)}<small>${schoolDistanceText(s.distance)} · 서구 내 수록 학교</small><small>학교 배정과 별개</small>` : '학교 자료 확인 필요'; }],
      ['세대수',a => unitCountText(a) || '미확인'],
      ['준공연도',a => builtYearText(a)],
      ['수록 전용면적',a => { const t = representativeTrade(a); return t ? `${area(t.area)}㎡<small>대표 거래 사례 기준</small>` : '거래 전용면적 미수록'; }],
      ['매매 거래 사례',a => { const t = representativeTrade(a); return t ? `<strong class="compare-price">${price(t.priceMan)}</strong><small>아래 계약일·층의 개별 거래</small>` : '거래자료 미수록'; }],
      ['계약일',a => representativeTrade(a) ? date(representativeTrade(a).date) : '미수록'],
      ['거래 층',a => representativeTrade(a) ? `${representativeTrade(a).floor}층` : '미수록'],
      ['확인 자료',a => external(a.catalogSourceUrl || housing.catalogSourceUrl,'공식 단지 목록') + external(a.sourceUrl,'거래 원문')]
    ];
    $('#compare-content').innerHTML = `<div class="detail-body"><p class="eyebrow">COMPARE YOUR PLACES</p><h2>집과 동네, 나란히 비교해요</h2><p class="detail-section-subtitle">선택한 생활 조건, 학교와 동네를 먼저 비교해 보세요. 거래가격은 면적·층·계약일을 함께 살펴볼 수 있습니다.</p><div class="table-wrap compare-table"><table><caption class="sr-only">선택한 ${selected.length}개 단지의 거래 조건·학군·주변 장소 비교</caption><thead><tr><th scope="col">비교 항목</th>${selected.map(a => `<th scope="col"><span class="compare-name">${esc(a.name)}</span><button type="button" data-apartment="${esc(a.id)}">상세 보기${icon('arrow-up-right')}</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label,render]) => `<tr><th scope="row">${label}</th>${selected.map(a => `<td>${render(a)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="info-block">가격·주변 장소만으로 거주 적합성을 판단할 수 없습니다. 현장 여건과 생활 동선을 함께 살펴보세요. 거리는 대표 좌표 간 직선거리입니다.</p></div>`;
    openDialog('#compare-dialog');
  }
  function showSaved() {
    const list = apartments.filter(a => saved.has(a.id));
    $('#info-content').innerHTML = `<div class="detail-body"><p class="eyebrow">MY PLACES</p><h2>마음에 담아둔 집 ${list.length}</h2><p class="detail-section-subtitle">관심 단지는 이 브라우저에 저장돼요. 같은 브라우저로 다시 방문해 이어서 살펴보세요.</p>${list.length ? `<div class="saved-list">${list.map(a => `<div class="saved-item"><button type="button" data-apartment="${esc(a.id)}"><span>${esc(a.neighborhood)}</span><strong>${esc(a.name)}</strong><small>${esc(homeFacts(a))}</small></button><button type="button" class="save-button is-saved" data-remove-saved="${esc(a.id)}" aria-label="${esc(a.name)} 관심 해제">${icon('heart')}</button></div>`).join('')}</div><button type="button" class="button primary" id="view-saved-results">관심 단지만 탐색하기 ${icon('arrow-right')}</button>` : `<div class="empty-state">${icon('heart')}<h3>마음에 드는 집을 발견해보세요</h3><p>아파트 카드의 하트를 누르면 이곳에 모아볼 수 있어요.</p><button type="button" class="button primary" data-close-dialog>살 집 둘러보기</button></div>`}</div>`;
    openDialog('#info-dialog');
  }
  function catalogSourcesHTML() {
    const priced = apartments.filter(representativeTrade), positioned = apartments.filter(hasCoordinates);
    return `<div class="detail-body"><p class="eyebrow">WHAT IS IN THE CATALOG</p><h2>목록과 확인 자료의 범위를 구분해요</h2><section class="detail-section"><h3>공식 공동주택 목록 · ${apartments.length}개</h3><p>${date(housing.catalogDataDate)} 기준 서구청 공개 공동주택 현황 ${housing.catalogCount}개에, ${date(housing.metadataDataDate)} 추출 K-apt 기본정보에서 확인한 별도 단지 ${apartments.length - housing.catalogCount}개를 추가했습니다. 단지명·주소·세대수·동수·층수는 각 공식 원문을 따릅니다. 이 목록에는 아파트 외 공동주택이 포함될 수 있으며, 해당 기준일 이후의 신규·변경 단지가 모두 반영됐다고 보장하지 않습니다.</p><p>단지명과 주소를 대조해 기존 8개 단지는 중복을 합쳤습니다. 원자료 명칭도 검색할 수 있으며, 원자료의 주소 표기와 현재 표시 행정명은 자료 파일에서 구분합니다.</p>${external(housing.catalogSourceUrl,'서구청 공동주택 현황 원문')}${external(housing.metadataSourceUrl,'K-apt 기본정보 원문')}${external('./data-housing.json','수록 자료와 단지별 출처 보기')}</section><section class="detail-section"><h3>위치 확인 · ${positioned.length}개</h3><p>확인한 단지 지도 링크 또는 공식 주소와 대조한 OpenStreetMap 건물·주거단지의 대표 위치입니다. 좌표가 없는 ${apartments.length-positioned.length}개 단지도 목록에서 볼 수 있으나, 지도 표시와 주변 거리 계산은 하지 않습니다. 도형의 대표점은 실제 출입구와 다를 수 있습니다.</p><p>지도는 현재 목록 페이지의 위치 확인 단지만 표시합니다. 학교·명소와의 거리는 직선거리이며 배정 학교·통학로·도보 시간을 뜻하지 않습니다.</p>${external('https://www.openstreetmap.org/copyright','OpenStreetMap 기여자 · ODbL')}${housing.coordinatesDataUrl ? external(housing.coordinatesDataUrl,'공개지도 위치 대조 자료') : ''}</section><section class="detail-section"><h3>거래가격 확인 · ${priced.length}개 단지</h3><p>수록된 매매 사례는 ${priced.reduce((n,a) => n+a.transactions.length,0)}건입니다. 가격 자료가 없는 단지를 목록에서 제외하지 않습니다. ‘거래자료 미수록’은 이 서비스가 가격을 아직 수록하지 않았다는 뜻이며, 실제 거래가 없다는 뜻이 아닙니다.</p><p>금액·전용면적 필터를 적용하면 해당 거래값이 확인된 단지만 남습니다. 기본 목록은 가격 유무에 관계없이 보여줍니다.</p>${external(housing.officialSourceUrl,'국토교통부 실거래가 확인')}</section><section class="detail-section"><h3>생활 조건의 미확인 값</h3><p>위치·면적·연도 자료가 없으면 조건 충족 여부를 임의로 판단하지 않습니다. 기본 결과에는 확인 필요 단지도 포함하며, ‘선택 조건 모두 맞는 집만’을 켜면 모든 조건을 확인해 충족한 단지만 보여줍니다.</p></section></div>`;
  }
  function showInfo(type) {
    if (type === 'catalog-sources') {
      $('#info-content').innerHTML = catalogSourcesHTML();
    } else if (type === 'match-rules') {
      $('#info-content').innerHTML = `<div class="detail-body"><p class="eyebrow">HOW WE FIND YOUR PLACE</p><h2>내 조건과 집을 비교하는 기준</h2><p class="place-description">선택한 조건을 충족하는지 확인 가능한 자료로 비교합니다. 만족도나 집의 품질을 평가한 점수가 아닙니다.</p><ul class="match-rules-list">${needCriteria.map(c => `<li><strong>${esc(c.label)}</strong><p>${esc(c.rule)}</p></li>`).join('')}</ul><section class="detail-section"><h3>결과는 이렇게 보여드려요</h3><p>기본 정렬은 선택한 조건을 충족한 개수가 많은 순서입니다. 동률은 단지 이름순이며, 가격은 기본 정렬에 사용하지 않습니다. 조건을 일부 충족한 단지와 자료 미확인 단지도 함께 보여드립니다. 확인된 조건이 하나도 없고 미확인 조건도 없으면 조건에 맞지 않는 단지로 제외합니다. 미확인은 충족 판정이 아닙니다.</p><p>조건 선택 전에는 전체 수록 단지를 이름순으로 안내합니다. ‘선택 조건 모두 맞는 집만’을 켜면 모든 선택 조건을 충족한 집만 남습니다. 동네·면적·금액의 추가 검색과 별도 정렬은 직접 선택할 수 있습니다.</p></section><section class="detail-section"><h3>자료 범위</h3><p>${apartments.length}개 단지와 수록 명소·서구 학교 위치를 기준으로 비교합니다. 면적은 가격과 연결된 대표 거래 사례의 전용면적이며, 단지 전체 평형이나 방 개수를 뜻하지 않습니다. 준공연도는 내부 상태나 관리 수준을 설명하지 않습니다.</p><p>거리 기준은 이 서비스에서 비교하기 위해 정한 값입니다. 실제 도보거리·통학시간·학교 배정이나 교육 수준을 나타내지 않습니다. 자료가 없으면 미확인으로 구분하며, 자료는 자동 갱신되지 않습니다.</p><div class="detail-actions"><button type="button" class="button secondary" data-open="sources">주거·명소 자료 출처</button><button type="button" class="button secondary" data-open="school-sources">학교 자료와 배정 기준</button></div></section></div>`;
    } else if (type === 'school-sources') {
      $('#info-content').innerHTML = schoolSourcesHTML();
    } else if (type === 'sources') {
      $('#info-content').innerHTML = `<div class="detail-body"><p class="eyebrow">OUR SOURCES</p><h2>정보를 확인하는 기준</h2><p class="detail-section-subtitle">자료 확인일 ${date(housing.checkedAt)} · 일부 단지와 장소를 소개하는 시범 서비스입니다.</p><section class="detail-section"><h3>공식 단지 목록</h3><p>서구청 공동주택 현황 ${housing.catalogCount}개(${date(housing.catalogDataDate)})와 K-apt에서 추가 확인한 ${apartments.length - housing.catalogCount}개(${date(housing.metadataDataDate)})를 합쳐 ${apartments.length}개를 수록합니다. 아파트 외 공동주택이 포함될 수 있으며, 목록 수록은 현재 입주 가능 매물이 있다는 뜻이 아닙니다.</p><button type="button" class="button secondary" data-open="catalog-sources">목록·위치 자료 범위</button></section><section class="detail-section"><h3>아파트 가격</h3><p>${esc(housing.sourceSummary)}</p><div class="info-block"><p>가격을 수록한 ${apartments.filter(representativeTrade).length}개 단지의 대표 표시값은 두 공개 페이지에서 교차 확인한 개별 매매 거래입니다. 전체 거래·현재 호가·평균 시세를 뜻하지 않습니다. 자동 갱신 기능은 연결되지 않았으며, 신고의 추가·정정·해제로 원자료가 바뀔 수 있습니다.</p><p>해제로 표시된 거래는 수록하지 않았습니다. 과거 거래 표는 동일 전용면적의 일부 확인 사례입니다.</p></div><p class="source-line">${external(housing.officialSourceUrl,'국토교통부 실거래가 자료제공')}${external(housing.officialApiInfoUrl,'공공데이터포털 API 안내')}</p><div class="source-list">${apartments.filter(representativeTrade).map(a => `<div class="source-item"><strong>${esc(a.name)}</strong><span>${external(a.sourceUrl,'쏙집 원문')}${external(a.crossCheckUrl,'DHOME 교차 확인')}</span></div>`).join('')}</div></section><section class="detail-section"><h3>주변 장소와 거리</h3><p>장소 설명·주소·대표 좌표는 광주관광 공식 안내를 바탕으로 정리했습니다. 단지 위치는 기존 확인한 공개 단지 지도 링크와, 공식 주소를 대조한 OpenStreetMap 위치 자료에서 가져옵니다. 단지별 출처는 상세 화면에 표시하며, 확인되지 않은 위치를 동네 중심점 등으로 대체하지 않습니다.</p><p>생활 조건의 거리는 수록된 대표 좌표를 기준으로 계산합니다. 공원·호수·문화공간·양동시장은 직선 1.5km 이내, 초등학교·중학교는 직선 500m 이내를 기준으로 합니다. 실제 도보·차량 이동거리와 다르며 학교 배정을 뜻하지 않습니다.</p><div class="source-list">${places.map(p => `<div class="source-item"><strong>${esc(p.name)}</strong>${external(p.sourceUrl,'공식 소개')}</div>`).join('')}</div></section><section class="detail-section"><h3>서구의 실제 풍경 사진</h3><p>광주문화관광 사진공유 서비스의 공공누리 제2유형 자료를 출처표시·비상업적 이용 조건에 따라 사용합니다. 사진은 현재 계절이나 현장 상태를 보장하지 않습니다.</p><div class="source-list">${placeData.photos.filter(p => p.used).map(p => `<div class="source-item"><div><strong>${esc(p.title)}</strong><small>${esc(p.attribution || p.source)} · ${esc(p.copyright)}</small></div>${external(p.sourceUrl,'사진 원문')}</div>`).join('')}</div></section><section class="detail-section"><h3>학군·학교</h3><p>학교 위치는 2026.10.01, 지도상 통학구역·학교군은 2026.09.20 기준 공식 자료를 사용합니다. 주변 학교와 실제 배정 기준을 구분해 안내합니다.</p><button type="button" class="button secondary" data-open="school-sources">학교 자료·배정 기준 보기</button></section><section class="detail-section"><h3>지도</h3><p>Leaflet과 OpenStreetMap 공개 지리자료를 사용한 생활권 위치도입니다. 주요 도로·하천·공원을 간략히 표시하며 길찾기용 지도가 아닙니다. 지리자료 확인일: 2026.10.28.</p>${external('https://www.openstreetmap.org/copyright','OpenStreetMap 기여자 및 ODbL 이용조건') + external('./assets/seogu-basemap.geojson','사용한 지리자료 내려받기')}</section></div>`;
    } else if (type === 'privacy') {
      $('#info-content').innerHTML = `<div class="detail-body"><p class="eyebrow">YOUR SAVED PLACES</p><h2>관심 단지는 이렇게 저장돼요</h2><p>관심 단지의 식별자만 현재 브라우저의 저장공간에 보관합니다. 회원가입이나 이름·전화번호 입력은 필요하지 않습니다.</p><div class="info-block"><p>브라우저 데이터를 지우거나 다른 기기·브라우저를 이용하면 저장 목록이 이어지지 않습니다. 시크릿 모드나 저장 제한 환경에서는 현재 화면에서만 유지될 수 있습니다.</p><p>비교 목록과 검색 조건은 현재 화면에서만 사용합니다. 외부 지도·자료 원문 링크를 열면 해당 서비스로 이동합니다.</p></div><button type="button" class="button secondary" id="clear-saved">관심 단지 전체 지우기</button></div>`;
    } else {
      $('#info-content').innerHTML = `<div class="detail-body"><p class="eyebrow">STAY A LITTLE LONGER</p><h2>서구stay, 집을 넘어 일상을 만나다</h2><p class="place-description">어떤 집에 살지 고민할 때, 그 주변의 하루도 함께 그려볼 수 있다면 좋겠습니다. 서구stay는 나에게 중요한 생활 조건으로 전남광주통합특별시 서구의 집을 찾아보고, 그 집의 학교·동네와 거래가격을 함께 이해하도록 돕습니다.</p><section class="detail-section"><h3>이렇게 둘러보세요</h3><ol><li>산책·학교·문화·공간 등 내게 중요한 조건을 최대 3가지 골라보세요.</li><li>각 집에서 어떤 조건이 맞는지, 어떤 점을 더 살펴봐야 하는지 확인하세요.</li><li>마음에 드는 집의 거래가격을 면적·층·계약일과 함께 읽고, 관심 저장이나 단지 비교로 이어가세요.</li></ol></section><div class="info-block"><p>공식 목록 ${apartments.length}개 단지, 이 중 확인 거래 ${apartments.filter(representativeTrade).length}개 단지 ${apartments.reduce((n,a) => n+(a.transactions?.length || 0),0)}건과 ${places.length}곳의 명소를 담고 있습니다. 목록 기준일 이후 모든 신규 단지나 모든 생활시설을 포함하는 전수·실시간 서비스는 아닙니다.</p><p>자료와 사진의 출처는 ‘정보·사진 출처’에서 확인할 수 있습니다.</p></div><button type="button" class="button primary" data-open="sources">정보·사진 출처 보기${icon('arrow-right')}</button></div>`;
    }
    openDialog('#info-dialog');
  }

  function schoolSourcesHTML() {
    return `<div class="detail-body"><p class="eyebrow">SCHOOL DATA & ADMISSION</p><h2>학교 정보를 확인하는 기준</h2><p class="detail-section-subtitle">확인일 2026.10.28 · 학교 위치, 지도상 통학구역, 학년도별 배정 기준을 구분합니다.</p><section class="detail-section"><h3>학교 위치 · ${schools.length}곳</h3><p>한국교육시설안전원 공식 위치 자료에서 서구에 소재하고 운영으로 기재된 초·중·고를 수록했습니다. 위치·주소 기준일은 2026.10.01입니다. 게시글 제목의 2026.09.20과 실제 첨부 CSV 기준일이 달라 실제 파일의 날짜를 사용합니다.</p><p>학교 누리집 주소는 교육청의 2025.11.09 공개자료에서 연결했습니다. 다른 구의 학교, 휴교 등으로 최신 위치 자료에서 빠진 학교, 모든 교육기관을 포함하는 목록은 아닙니다.</p><div class="school-links">${external('https://schoolzone.emac.kr/publicData/publicDataList.do','한국교육시설안전원 위치 자료')}${external('https://www.data.go.kr/data/15151786/fileData.do','교육청 학교 누리집 자료')}</div></section><section class="detail-section"><h3>초등 통학구역 · 중학교 학교군</h3><p>2026.09.20 기준 공식 학구도와 단지 대표 위치를 대조한 참고 결과입니다. 아파트의 모든 동·세대 주소를 배정 고시와 대조한 결과는 아니며, 실제 배정을 확정하지 않습니다.</p><p>초등 통학구역과 중학교 학교군 지도 자료는 특정 학년도 입학 고시를 대신하지 않습니다. 특히 이 지도 결과를 2027학년도 배정 확정 정보로 사용하지 않습니다.</p><div class="school-links">${external(schoolZoneMapURL,'주소로 공식 학구도 확인')}${external(educationData?.zoneSourceUrl || 'https://schoolzone.emac.kr/publicData/publicDataList.do','통학구역·학교군 공개자료')}</div></section><section class="detail-section"><h3>중학교 입학 · 전입학</h3><p>신입학은 출신 초등학교별 배정 가능 중학교와 해당 학년도 시행계획을 확인해야 합니다. 이 서비스에서 개별 중학교의 배정 가능 여부를 확정하지 않습니다. 전입학은 거주지 이전·학교군·학교의 수용 여건 등 별도 요건을 확인하세요.</p><p>교육지원청 게시판에서 2026.2 기준 학교별 현황과 2027학년도 시행계획 공고를 찾아볼 수 있습니다. 2027학년도 공고의 개별 배정표는 이 서비스에 검증·수록하지 않았습니다.</p><div class="school-links">${external(middleAdmissionURL,'서부교육지원청 중학교 배정 안내')}${external('https://seobu.jge.go.kr/page.php?id=303&sid=19','중학교 전입학 안내')}</div></section><section class="detail-section"><h3>고등학교 · 2027학년도 입학</h3><p>고입정보포털에 게시된 전남광주통합특별시교육청 공고 제2026-10007호(2026.7.10) 첨부 요강의 평준화 후기 일반고 ‘학교 배정’ 항목을 참고했습니다. 종전 광주 지역의 2027학년도 신입학에 관한 안내입니다.</p><p>출신 중학교를 기준으로 배정 가능 고교를 정하고 희망학교에 추첨 배정하며, 실제 거주지와 통학 편의도 고려합니다. 자율형공립고·과학중점고 등과 현재 재학생의 전입학은 각각 해당 요건을 확인해야 합니다.</p><p>공고 첨부의 속표지에 ‘안’ 표기가 남아 있으므로 최신 변경·최종 적용 내용은 공식 안내와 출신 학교에서 확인하세요.</p><div class="school-links">${external(highAdmissionURL,'2027학년도 공식 공고·첨부 요강')}</div></section><section class="detail-section"><h3>거리와 학교 비교</h3><p>직선거리는 단지 대표 좌표와 학교의 공식 좌표로 계산합니다. 서구 내 수록 학교만을 거리순으로 보여주며, 실제 도보 거리·통학 시간·배정 가능성·학교의 교육 수준을 나타내지 않습니다. 학교 정보와 통학구역은 자동으로 갱신되지 않습니다.</p></section></div>`;
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-close-dialog')) { button.closest('dialog')?.close(); return; }
    if (!loaded) return;
    if (button.hasAttribute('data-reset-catalog')) { state.needs.clear(); state.strictNeeds = false; state.savedOnly = false; state.sort = 'match'; $('#sort-order').value = 'match'; renderNeeds(); resetFilters(); }
    else if (button.dataset.apartment) openApartment(button.dataset.apartment,button.dataset.section || '');
    else if (button.dataset.need) toggleNeed(button.dataset.need);
    else if (button.dataset.detailJump) jumpWithinDetail(button.dataset.detailJump);
    else if (button.hasAttribute('data-change-needs')) { $$('dialog[open]').forEach(dialog => dialog.close()); $('#needs').scrollIntoView({behavior:'smooth'}); }
    else if (button.dataset.school) openSchool(button.dataset.school);
    else if (button.dataset.schoolApartment) jumpToEducation(button.dataset.schoolApartment);
    else if (button.dataset.schoolLevel) { state.schoolLevel = button.dataset.schoolLevel; renderEducation(); }
    else if (button.dataset.place) openPlace(button.dataset.place);
    else if (button.dataset.save) { const id = button.dataset.save; toggleSaved(id); if (!button.isConnected && !$('dialog[open]')) $(`[data-save="${id}"]`)?.focus({preventScroll:true}); }
    else if (button.dataset.removeSaved) { toggleSaved(button.dataset.removeSaved); showSaved(); }
    else if (button.dataset.open) showInfo(button.dataset.open);
    else if (button.dataset.neighborhood) { resetFilters(); state.neighborhood = button.dataset.neighborhood; $('#neighborhood').value = state.neighborhood; applyFilters(); fitMap(); $('#explore').scrollIntoView({behavior:'smooth'}); }
    else if (button.dataset.placeCategory) { state.placeCategory = button.dataset.placeCategory; $$('[data-place-category]').forEach(el => { const active = el === button; el.classList.toggle('active',active); el.setAttribute('aria-pressed',String(active)); }); renderPlaces(); }
    else if (button.dataset.view) { const isMap = button.dataset.view === 'map'; $('#explorer-layout').classList.toggle('show-map',isMap); $$('[data-view]').forEach(el => { const active = el === button; el.classList.toggle('active',active); el.setAttribute('aria-pressed',String(active)); }); if (isMap) requestAnimationFrame(fitMap); }
    else if (button.id === 'view-saved-results') { $('#info-dialog').close(); state.needs.clear(); state.strictNeeds = false; state.savedOnly = true; state.sort = 'match'; $('#sort-order').value = 'match'; renderNeeds(); resetFilters(); $('#explore').scrollIntoView({behavior:'smooth'}); }
    else if (button.id === 'clear-saved') { saved.clear(); try { localStorage.removeItem('seogustay:saved:v1'); } catch {} applyFilters(); showInfo('privacy'); toast('관심 단지를 모두 지웠어요.'); }
  });
  $('#find-my-home').addEventListener('click',() => { if (!loaded) return; $('#explore').scrollIntoView({behavior:'smooth'}); });
  $('#clear-needs').addEventListener('click',() => { state.needs.clear(); state.strictNeeds = false; state.sort = 'match'; $('#sort-order').value = 'match'; renderNeeds(); applyFilters(); fitMap(); });
  $('#only-all-needs').addEventListener('change',event => { state.strictNeeds = event.target.checked; applyFilters(); fitMap(); });
  $('#query').addEventListener('input',event => { if (!loaded) return; state.query = event.target.value.trim(); applyFilters(); fitMap(); });
  [['#neighborhood','neighborhood'],['#price-filter','price'],['#area-filter','area'],['#sort-order','sort']].forEach(([selector,key]) => $(selector).addEventListener('change',event => { if (!loaded) return; state[key] = event.target.value; applyFilters(); fitMap(); }));
  $('#saved-only').addEventListener('click',() => { if (!loaded) return; state.savedOnly = !state.savedOnly; applyFilters(); fitMap(); });
  $('#open-saved').addEventListener('click',() => { if (loaded) showSaved(); });
  $('#reset-filters').addEventListener('click',() => { if (loaded) resetFilters(); });
  $('#empty-reset').addEventListener('click',() => { if (loaded) resetFilters(); });
  $('#catalog-prev').addEventListener('click',() => changePage(-1));
  $('#catalog-next').addEventListener('click',() => changePage(1));
  $('#fit-map').addEventListener('click',fitMap);
  $('#retry-map').addEventListener('click',() => { if (loaded) initMap().catch(() => { $('#map-fallback').hidden = false; }); });
  $('#show-places').addEventListener('change',renderMarkers);
  $('#show-schools').addEventListener('change',renderMarkers);
  $('#school-apartment').addEventListener('change',event => { if (!loaded) return; state.schoolApartment = event.target.value; renderEducation(); });
  $('#school-query').addEventListener('input',event => { state.schoolQuery = event.target.value.trim(); renderSchoolDirectory(); });
  $('#school-level-filter').addEventListener('change',event => { state.schoolFilter = event.target.value; renderSchoolDirectory(); });
  $('#clear-compare').addEventListener('click',() => { state.compare.clear(); updateCompare(); });
  $('#open-compare').addEventListener('click',showCompare);
  document.addEventListener('change',event => { if (!event.target.matches('[data-compare]')) return; const id = event.target.dataset.compare; if (event.target.checked) { if (state.compare.size === 3) { event.target.checked = false; toast('한 번에 최대 3개 단지까지 비교할 수 있어요.'); return; } state.compare.add(id); } else state.compare.delete(id); updateCompare(); });
  window.addEventListener('resize',() => { if (map) map.invalidateSize(); });

  async function loadData() {
    try {
      const results = await Promise.allSettled(['./data-housing.json','./data-places.json','./data-schools.json','./data-education.json'].map(async url => { const response = await fetch(url); if (!response.ok) throw new Error('자료 응답 실패'); return response.json(); }));
      if (results[0].status !== 'fulfilled' || results[1].status !== 'fulfilled') throw new Error('주거·생활 자료 응답 실패');
      [housing,placeData] = [results[0].value,results[1].value];
      schoolData = results[2].status === 'fulfilled' ? results[2].value : null;
      educationData = results[3].status === 'fulfilled' ? results[3].value : null;
      schools = Array.isArray(schoolData?.schools) ? schoolData.schools : [];
      apartments = housing.apartments; places = placeData.places;
      if (!Array.isArray(apartments) || !apartments.length || !Array.isArray(places) || !places.length) throw new Error('자료 구조 확인 필요');
      if (!matching) throw new Error('생활 조건 비교 기능을 불러오지 못했습니다.');
      homeProfiles.clear(); apartments.forEach(apartment => homeProfiles.set(apartment.id,matching.evaluate(apartment,{places,schools})));
      saved = new Set([...saved].filter(id => apartments.some(a => a.id === id)));
      $('#neighborhood').innerHTML = '<option value="all">전체 동네</option>' + [...new Set(apartments.map(a => a.neighborhood))].sort((a,b) => a.localeCompare(b,'ko')).map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('');
      $('#checked-date').textContent = `자료 확인 ${date(housing.checkedAt)}`;
      const heroPlace = places.find(p => p.id === 'uncheon' && p.image) || places.find(p => p.image);
      if (heroPlace) { $('#hero-image').src = heroPlace.image; $('#hero-image').alt = heroPlace.imageAlt || heroPlace.name + ' 풍경'; $('#hero-place-name').textContent = `${heroPlace.name} · 서구의 풍경`; }
      $('#school-apartment').innerHTML = apartments.map(a => `<option value="${esc(a.id)}">${esc(a.neighborhood)} · ${esc(a.name)} · ${esc((a.roadAddress || a.address).replace(/^.*?서구\s*/,''))}</option>`).join('');
      $('#school-apartment').disabled = false;
      $('#school-data-count').textContent = schools.length ? `공식 자료 수록 ${schools.length}개 학교` : '학교 자료 다시 확인 필요';
      $('#school-directory-total').textContent = schools.length ? `${schools.length}곳` : '';
      $('#education-data-date').textContent = `학교 위치 ${schoolData?.dataDate ? date(schoolData.dataDate) : '미확인'} · 학구도 ${educationData?.zoneDataDate ? date(educationData.zoneDataDate) : '미확인'}`;
      $('#show-schools').disabled = schools.length === 0;
      loaded = true;
      window.dispatchEvent(new Event('stay:data-ready'));
      renderCoverage(); renderNeeds(); applyFilters(); renderPlaces(); renderDay(); renderEducation(); renderSchoolDirectory(); updateCompare(); initMap().catch(error => { $('#map-fallback').hidden = false; console.error('위치도 초기화:',error); });
      const navObserver = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) $$('.main-nav a').forEach(a => a.classList.toggle('active',a.hash === `#${entry.target.id === 'explore' ? 'needs' : entry.target.id}`)); },{rootMargin:'-15% 0px -65% 0px'});
      ['needs','explore','education','discover','day-in-seogu'].forEach(id => navObserver.observe(document.getElementById(id)));
      const requestedSection = location.hash.slice(1);
      if (['needs','explore','education','discover','day-in-seogu'].includes(requestedSection)) requestAnimationFrame(() => document.getElementById(requestedSection).scrollIntoView({behavior:'instant'}));
    } catch (error) {
      $('#results-count').textContent = '자료를 불러오지 못했습니다.';
      $('#apartment-list').innerHTML = `<div class="empty-state"><h3>자료를 다시 불러와주세요</h3><p>연결 상태를 확인하고 새로고침해주세요.</p><button type="button" class="button primary" id="reload-data">다시 불러오기</button></div>`;
      $('#reload-data').addEventListener('click',loadData);
      $('#map-fallback').hidden = false;
      console.error('서구stay 자료 로드:',error);
    }
  }
  window.SeoguStay = Object.freeze({
    data: () => loaded ? {apartments,places,schools} : null,
    apply: (intent) => {
      if (!loaded) return;
      state.needs = new Set((intent.needs || []).filter(id => needCriteria.some(c => c.id === id)).slice(0,3));
      state.query = intent.query || ''; state.neighborhood = intent.neighborhood || 'all';
      state.price = intent.maxPriceMan ? '0-' + intent.maxPriceMan : 'all';
      state.area = 'all'; state.savedOnly = false; state.strictNeeds = false; state.sort = 'match';
      $('#query').value = state.query; $('#neighborhood').value = state.neighborhood; $('#area-filter').value = 'all'; $('#sort-order').value = 'match';
      if (intent.maxPriceMan && ![...$('#price-filter').options].some(o => o.value === state.price)) {
        const option = new Option('입력 예산: ' + price(intent.maxPriceMan) + ' 이하',state.price);
        option.dataset.guide = 'true'; $('#price-filter').add(option);
      }
      $('#price-filter').value = state.price;
      renderNeeds(); applyFilters(); fitMap();
      $('#explore').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
      $('#explore-title').setAttribute('tabindex','-1'); $('#explore-title').focus({preventScroll:true});
    }
  });
  loadData();
})();
