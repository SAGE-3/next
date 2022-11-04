export const specialTypes = [{ header: 'map', type: 'map' }];

export default function findHeaderType(header: string, data: any) {
  let lowerCaseHeader = header.toLowerCase();
  for (let i = 0; i < specialTypes.length; i++) {
    if (header === specialTypes[i].header) {
      return specialTypes[i].type;
    }
  }
  if (
    lowerCaseHeader.includes('date') ||
    lowerCaseHeader.includes('year') ||
    lowerCaseHeader.includes('month') ||
    lowerCaseHeader.includes('day') ||
    lowerCaseHeader.includes('months') ||
    lowerCaseHeader.includes('dates')
  ) {
    return 'temporal';
  } else if (isNaN(data[header])) {
    return 'nominal';
  } else {
    return 'quantitative';
  }
}
