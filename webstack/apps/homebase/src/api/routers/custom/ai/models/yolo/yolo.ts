/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as fs from 'fs';
import * as FormData from 'form-data';
import axios from 'axios';

// AI queries
import { AiQueryResponse } from '@sage3/shared';
import { AiModel } from '../AbstractAiModel';

import { ServerConfiguration } from '@sage3/shared/types';

export class YoloModel extends AiModel {
  private _url: string;
  public name = 'yolov8';

  constructor(config: ServerConfiguration) {
    super();
    this._url = config.services.yolo.url;
  }

  public async health(): Promise<boolean> {
    try {
      const response = await axios({
        url: `${this._url}/healthcheck`,
        method: 'GET',
      });
      if (response.status === 200) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  public async query(input: string): Promise<AiQueryResponse> {
    return {
      success: false,
      error_message: `Not implemented: ${input} for ${this.name}`,
    };
  }

  /*
   * Return a JSON object containing labels and boxes
   * URL: /yolo/img_object_detection_to_json
   *
   * @param {string} input
   * @returns {Promise<AiQueryResponse>}
   *
   * @memberOf YoloModel
   * */
  public async imageToLabels(form: FormData): Promise<AiQueryResponse> {
    try {
      const response = await axios({
        url: `${this._url}/img_object_detection_to_json`,
        method: 'POST',
        data: form,
      });
      if (response.status == 200) {
        return {
          success: true,
          output: response.data,
        };
      } else {
        return {
          success: false,
          error_message: 'Failed to query yolo model',
        };
      }
    } catch (error) {
      return {
        success: false,
        error_message: `Failed to query yolo model: ${error.message}`,
      };
    }
  }

  /*
   * Generate an image from the input with labels and boxes
   * url: /yolo//img_object_detection_to_img
   *
   * @param {string} input
   * @returns {Promise<AiQueryResponse>}
   *
   * @memberOf YoloModel
   * */
  public async imageToImage(form: FormData): Promise<AiQueryResponse> {
    try {
      const response = await axios({
        url: `${this._url}/img_object_detection_to_img`,
        method: 'POST',
        responseType: 'arraybuffer', // Return the image as an array buffer
        data: form,
        headers: {
          ...form.getHeaders(),
        },
      });
      if (response.status == 200) {
        return {
          success: true,
          output: response.data,
        };
      } else {
        return {
          success: false,
          error_message: 'Failed to query code-llama',
        };
      }
    } catch (error) {
      return {
        success: false,
        error_message: `Failed to query code-llama: ${error.message}`,
      };
    }
  }
}
