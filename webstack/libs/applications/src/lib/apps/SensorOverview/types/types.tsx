/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

export type VariableProps = {
  variableName: string;
  stationName: string;
  value: number;
  average: number;
  stdDev: number;
  high: number;
  low: number;
  unit: string;
  startDate?: string;
  endDate?: string;
  stationSTIDName: string;
  color: string;
};
