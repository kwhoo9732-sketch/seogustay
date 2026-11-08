(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SeoguMatching = factory();
  }
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // Distances use representative coordinates, not routes or school assignment.
  // The UI limits selection to three criteria and explains source coverage.
  var definitions = [
    {
      id: 'nature', label: '공원·호수 가까이',
      description: '산책할 공원과 호수의 위치를 살펴봐요.',
      rule: '운천저수지·풍암호수·상무시민공원·5·18기념공원 중 직선 1.5km 이내',
      icon: 'leaf', kind: 'place', threshold: 1500,
      targetIds: ['uncheon', 'pungam', 'sangmu', 'may18'],
      missingDetail: '수록 공원·호수의 위치 자료 확인 필요'
    },
    {
      id: 'culture', label: '문화공간 가까이',
      description: '전시·공연·전통문화 공간과의 거리를 봐요.',
      rule: '김대중컨벤션센터·빛고을국악전수관·서창한옥문화관 중 직선 1.5km 이내',
      icon: 'culture', kind: 'place', threshold: 1500,
      targetIds: ['convention', 'gugak', 'seochang'],
      missingDetail: '수록 문화공간의 위치 자료 확인 필요'
    },
    {
      id: 'market', label: '양동시장 가까이',
      description: '양동시장과 가까운 곳을 살펴봐요.',
      rule: '양동시장까지 직선 1.5km 이내',
      icon: 'bag', kind: 'place', threshold: 1500,
      targetIds: ['yangdong'],
      missingDetail: '양동시장의 위치 자료 확인 필요'
    },
    {
      id: 'elementary', label: '초등학교 가까이',
      description: '수록 초등학교와의 거리를 봐요. 배정과 별개예요.',
      rule: '수록 초등학교 중 가장 가까운 학교까지 직선 500m 이내',
      icon: 'school', kind: 'school', threshold: 500, level: 'elementary',
      missingDetail: '수록 초등학교의 위치 자료 확인 필요'
    },
    {
      id: 'middle', label: '중학교 가까이',
      description: '수록 중학교와의 거리를 봐요. 배정과 별개예요.',
      rule: '수록 중학교 중 가장 가까운 학교까지 직선 500m 이내',
      icon: 'school', kind: 'school', threshold: 500, level: 'middle',
      missingDetail: '수록 중학교의 위치 자료 확인 필요'
    },
    {
      id: 'space', label: '전용 84㎡ 이상',
      description: '수록 거래 사례의 전용면적을 비교해요.',
      rule: '대표 표시 거래 사례의 전용면적 84㎡ 이상',
      icon: 'expand', kind: 'area', threshold: 84,
      missingDetail: '대표 표시 거래의 전용면적 자료 확인 필요'
    },
    {
      id: 'recent', label: '2020년 이후 준공',
      description: '자료에 기재된 준공연도를 비교해요.',
      rule: '자료에 기재된 준공연도 2020년 이상',
      icon: 'home', kind: 'builtYear', threshold: 2020,
      missingDetail: '준공연도 자료 확인 필요'
    }
  ];

  var criteria = Object.freeze(definitions.map(function (definition) {
    return Object.freeze({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      rule: definition.rule,
      icon: definition.icon
    });
  }));
  var criterionIds = new Set(criteria.map(function (criterion) { return criterion.id; }));
  var collator = new Intl.Collator('ko-KR', { sensitivity: 'base', numeric: true });

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function hasCoordinates(point) {
    return Boolean(point) && isFiniteNumber(point.lat) && isFiniteNumber(point.lng) &&
      point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180;
  }

  function distanceMeters(a, b) {
    var radians = Math.PI / 180;
    var latitudeDelta = (b.lat - a.lat) * radians;
    var longitudeDelta = (b.lng - a.lng) * radians;
    var value = Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(longitudeDelta / 2) ** 2;
    var bounded = Math.max(0, Math.min(1, value));
    return 6371000 * 2 * Math.atan2(Math.sqrt(bounded), Math.sqrt(1 - bounded));
  }

  function distanceText(meters) {
    if (meters < 1000) {
      return '직선 약 ' + (Math.round(meters / 10) * 10).toLocaleString('ko-KR') + 'm';
    }
    return '직선 약 ' + (meters / 1000).toFixed(1) + 'km';
  }

  function unavailable(definition, detail) {
    return {
      id: definition.id, label: definition.label,
      met: false, available: false,
      detail: detail || definition.missingDetail,
      metric: null, kind: definition.kind
    };
  }

  function hasTargetData(target) {
    return hasCoordinates(target) && typeof target.name === 'string' && target.name.trim().length > 0;
  }

  function evaluateDistance(apartment, context, definition) {
    if (!hasCoordinates(apartment)) {
      return unavailable(definition, '단지 위치 자료 확인 필요');
    }
    var source = definition.kind === 'place' ? context.places : context.schools;
    if (!Array.isArray(source)) return unavailable(definition);

    var targets = source.filter(function (target) {
      if (!target) return false;
      return definition.kind === 'place'
        ? definition.targetIds.indexOf(target.id) !== -1
        : target.level === definition.level;
    });
    var validTargets = targets.filter(hasTargetData);
    if (!validTargets.length) return unavailable(definition);

    var nearest = null;
    validTargets.forEach(function (target) {
      var metric = distanceMeters(apartment, target);
      if (!nearest || metric < nearest.metric ||
          (metric === nearest.metric && collator.compare(target.name, nearest.target.name) < 0)) {
        nearest = { target: target, metric: metric };
      }
    });

    var met = nearest.metric <= definition.threshold;
    // An observed nearby target proves a match. If none matches and some known
    // target data is missing, leave the condition unknown rather than reject it.
    var incomplete = definition.kind === 'place'
      ? definition.targetIds.some(function (id) {
          return !validTargets.some(function (target) { return target.id === id; });
        })
      : validTargets.length !== targets.length;
    if (!met && incomplete) return unavailable(definition);

    var result = {
      id: definition.id, label: definition.label,
      met: met, available: true,
      detail: nearest.target.name + ' · ' + distanceText(nearest.metric),
      metric: nearest.metric, kind: definition.kind
    };
    if (typeof nearest.target.id === 'string') result.targetId = nearest.target.id;
    return result;
  }

  // Metrics: place/school = meters, area = square meters, builtYear = year.
  function evaluate(apartment, context) {
    var home = apartment || {};
    var data = context || {};
    return definitions.map(function (definition) {
      if (definition.kind === 'place' || definition.kind === 'school') {
        return evaluateDistance(home, data, definition);
      }
      if (definition.kind === 'area') {
        // Keep the area tied to the same first, curated transaction used for
        // the displayed price; do not substitute a different unit's maximum.
        var transaction = Array.isArray(home.transactions) ? home.transactions[0] : null;
        var area = transaction && transaction.area;
        if (!isFiniteNumber(area) || area <= 0) return unavailable(definition);
        return {
          id: definition.id, label: definition.label,
          met: area >= definition.threshold, available: true,
          detail: '수록 거래 전용 ' + area + '㎡',
          metric: area, kind: definition.kind
        };
      }
      var year = home.builtYear;
      if (!Number.isInteger(year) || year <= 0) return unavailable(definition);
      return {
        id: definition.id, label: definition.label,
        met: year >= definition.threshold, available: true,
        detail: year + '년 준공',
        metric: year, kind: definition.kind
      };
    });
  }

  function compare(a, b, selectedIds, context) {
    var selected = new Set(Array.from(selectedIds || []).filter(function (id) {
      return criterionIds.has(id);
    }));
    function score(apartment) {
      return evaluate(apartment, context).reduce(function (total, result) {
        return total + (selected.has(result.id) && result.available && result.met ? 1 : 0);
      }, 0);
    }
    var difference = selected.size ? score(b) - score(a) : 0;
    if (difference) return difference;
    return collator.compare(String(a && a.name || ''), String(b && b.name || ''));
  }

  return Object.freeze({ criteria: criteria, evaluate: evaluate, compare: compare });
}));
