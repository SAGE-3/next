/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import findHeaderType from '../findHeaderType';
import switchHeaders from './helperFunctions/switchHeaders';

interface encodingProps {
  data: string;
  mark: {
    type: string;
    stroke: string;
  };
  encoding: {
    color: {
      field: string;
      type: string;
    };
    shape: { field: string; type: string };
  };
}

interface layerProps {
  data: {
    url: string;
    format: {
      type: string;
      feature: string;
    };
    mark: {
      type: string;
      fill: string;
      stroke: string;
    };
  };
}

export interface mapChartProps {
  description: string;
  title: string;
  projection: { type: string };
  layer: any[];
  transform?: any[];
}

export default function createMapChart(extractedHeaders: string[], fileName: string, data: string[]) {
  // let mapChartSpec: any = {
  //   width: 500,
  //   height: 300,
  //   projection: { type: 'albersUsa' },
  //   layer: [
  //     {
  //       data: {
  //         url: 'https://raw.githubusercontent.com/vega/vega/master/docs/data/us-10m.json',
  //         format: { type: 'topojson', feature: 'counties' },
  //       },
  //       transform: [
  //         {
  //           lookup: 'id',
  //           from: {
  //             data: { url: 'https://raw.githubusercontent.com/Tabalbar/articulate-/dev/covid_data_final.csv' },
  //             key: 'map',
  //             fields: [extractedHeaders[1]],
  //           },
  //         },
  //       ],
  //       mark: 'geoshape',
  //       encoding: { color: { field: extractedHeaders[1], type: findHeaderType(extractedHeaders[1], data) } },
  //     },
  //     {
  //       data: {
  //         url: 'https://raw.githubusercontent.com/vega/vega/master/docs/data/us-10m.json?',
  //         format: { type: 'topojson', feature: 'states' },
  //       },
  //       mark: { type: 'geoshape', filled: false, stroke: 'gray' },
  //     },
  //   ],
  // };
  let mapChartSpec: any = {
    width: 500,
    height: 300,
    projection: { type: 'albersUsa' },
    layer: [
      {
        data: {
          url: 'https://raw.githubusercontent.com/vega/vega/master/docs/data/us-10m.json',
          format: {
            type: 'topojson',
            feature: 'states',
          },
        },
        mark: {
          type: 'geoshape',
          fill: 'lightgray',
          stroke: 'white',
        },
      },
      {
        data: { url: 'https://raw.githubusercontent.com/Tabalbar/articulate-/dev/covid_data_final.csv' },
        mark: { type: 'geoshape', stroke: 'black' },
        transform: [
          {
            lookup: 'map',
            from: {
              data: {
                url: 'https://raw.githubusercontent.com/vega/vega/master/docs/data/us-10m.json',
                format: { type: 'topojson', feature: 'counties' },
              },
              key: 'id',
            },
            as: 'geo',
          },
        ],
        encoding: {
          color: {
            field: extractedHeaders[1],
            type: findHeaderType(extractedHeaders[1], data),
            legend: { labelFontSize: 15, titleFontSize: 15, labelLimit: 2000 },
          },
          shape: { field: 'geo', type: 'geojson' },
        },
      },
    ],
  };
  let specifications = [];
  specifications.push(mapChartSpec);
  return specifications;
}

// // export interface mapChartProps {
// //   description: string;
// //   title: string;
// //   projection: { type: string };
// //   layer: any[];
// //   transform?: any[];
// // }

// export default function createMapChart(extractedHeaders: string[], fileName: string, data: string[]) {
//   let mapChartSpec: any = {
//     description: "A bar chart with highlighting on hover and selecting on click. (Inspired by Tableau's interaction style.)",
//     title: '',
//     projection: { type: 'albersUsa' },
//     layer: [
//       {
//         data: {
//           url: 'https://raw.githubusercontent.com/vega/vega/master/docs/data/us-10m.json',
//           format: {
//             type: 'topojson',
//             feature: 'counties',
//           },
//         },
//         mark: {
//           type: 'geoshape',
//           fill: 'lightgray',
//           stroke: 'white',
//         },
//       },
//     ],
//   };
//   let specifications: any[] = [];

//   extractedHeaders = organizeMapChartHeaders(extractedHeaders, data);
//   console.log(mapChartSpec);

//   let encoding = {
//     data: { url: apiUrls.assets.getAssetById(fileName) },
//     mark: { type: 'geoshape', stroke: 'black' },
//     transform: [
//       {
//         lookup: 'map',
//         from: {
//           data: {
//             url: 'https://raw.githubusercontent.com/vega/vega/master/docs/data/us-10m.json',
//             format: { type: 'topojson', feature: 'counties' },
//           },
//           key: 'id',
//         },
//         as: 'geo',
//       },
//     ],
//     encoding: {
//       color: {
//         field: extractedHeaders[1],
//         type: 'nominal',
//         legend: { labelFontSize: 15, titleFontSize: 15, labelLimit: 2000 },
//       },
//       shape: { field: 'geo', type: 'geojson' },
//     },
//   };

//   mapChartSpec.layer.push(encoding);
//   specifications.push(mapChartSpec);
//   return specifications;
// }

// Will put headers in this order
// [quantitative, nominal, nominal, nominal....]
function organizeMapChartHeaders(extractedHeaders: string[], data: string[]) {
  let mapTypeFound = false;
  for (let i = 0; i < extractedHeaders.length; i++) {
    if (findHeaderType(extractedHeaders[i], data) === 'map') {
      switchHeaders(extractedHeaders, 0, i);
      mapTypeFound = true;
    }
  }
  if (mapTypeFound) {
    return extractedHeaders;
  } else {
    throw 'You did not provide enough details to generate a chart';
  }
}

// for (let i = 1; i < extractedHeaders.length; i++) {
//   let barChartSpec = {
//     ...barSpecificationTemplate,
//   };
//   barChartSpec.data.url = apiUrls.assets.getAssetById(fileName);
//   barChartSpec.encoding.x.field = extractedHeaders[i];
//   barChartSpec.encoding.x.type = 'nominal';

//   barChartSpec.encoding.y.field = extractedHeaders[0];
//   barChartSpec.encoding.y.type = 'quantitative';
//   barChartSpec.encoding.y.aggregate = 'sum';
//   specifications.push(barChartSpec);
// }
