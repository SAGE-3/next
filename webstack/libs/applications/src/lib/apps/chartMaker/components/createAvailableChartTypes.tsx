import { specialTypes } from './findHeaderType';

export default function (input: string, data: Record<string, any>[]) {
  let availableCharts = [
    {
      key: 'bar',
      mark: 'bar',
      available: false,
    },
    {
      key: 'histogram',
      mark: 'histogram',
      available: false,
    },

    {
      key: 'line',
      mark: 'line',
      available: false,
    },
    {
      key: 'heat map',
      mark: 'heatmap',
      available: false,
    },
    {
      key: 'heatmap',
      mark: 'heatmap',
      available: false,
    },
    {
      key: 'map',
      mark: 'map',
      available: false,
    },
    {
      key: 'parallel coordinates',
      mark: 'parallelCoordinates',
      available: false,
    },
    {
      key: 'point',
      mark: 'scatter',
      available: false,
    },
    {
      key: 'bubble',
      mark: 'scatter',
      available: false,
    },
  ];
  let typesInDataset = {
    temporal: false,
    nominal: false,
    quantitative: false,
    map: false,
  };

  let keys = Object.keys(data[0]);
  for (let i = 0; i < keys.length; i++) {
    for (let i = 0; i < specialTypes.length; i++) {
      if (keys[i] === specialTypes[i].header) {
        typesInDataset.map = true;
        break;
      }
    }
    let lowerCaseHeader = keys[i].toLowerCase();
    if (
      lowerCaseHeader.includes('date') ||
      lowerCaseHeader.includes('year') ||
      lowerCaseHeader.includes('month') ||
      lowerCaseHeader.includes('day') ||
      lowerCaseHeader.includes('months') ||
      lowerCaseHeader.includes('dates')
    ) {
      typesInDataset.temporal = true;
    } else if (isNaN(data[1][keys[i]])) {
      typesInDataset.nominal = true;
    } else {
      typesInDataset.quantitative = true;
    }
  }

  function switchAvailableCharts(type: string) {
    for (let i = 0; i < availableCharts.length; i++) {
      if (availableCharts[i].mark === type) {
        availableCharts[i].available = true;
      }
    }
  }

  if (typesInDataset.temporal && typesInDataset.quantitative) {
    switchAvailableCharts('line');
  }
  if (typesInDataset.quantitative && typesInDataset.nominal) {
    switchAvailableCharts('bar');
    switchAvailableCharts('heatmap');
  }
  if (typesInDataset.map && typesInDataset.nominal) {
    switchAvailableCharts('map');
  }
  if (typesInDataset.nominal) {
    switchAvailableCharts('histogram');
  }
  return availableCharts;
}
