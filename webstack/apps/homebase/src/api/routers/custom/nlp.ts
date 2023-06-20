/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as express from 'express';
import { SAGEnlp } from '@sage3/backend';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: '',
});
const openai = new OpenAIApi(configuration);

export function NLPRouter(): express.Router {
  const router = express.Router();

  router.post('/', async ({ body, user }, res) => {
    // @ts-ignore
    const userId = user.id;
    // const message = "You are a visualization code generator that will strictly create visualization code using the echarts library. Here are some examples of code that you should output ''I have a dataset with these variable names 'wind_cardinal_direction_set_1d', 'wind_gust_set_1', 'wind_direction_set_1', 'net_radiation_set_1', 'soil_moisture_set_1', 'soil_moisture_set_3', 'soil_moisture_set_2', 'outgoing_radiation_lw_set_1', 'outgoing_radiation_sw_set_1', 'precip_accum_five_minute_set_1', 'net_radiation_lw_set_1', 'net_radiation_sw_set_1', 'relative_humidity_set_1', 'wind_speed_set_1', 'air_temp_set_1', 'date_time', 'soil_temp_set_1', 'soil_temp_set_3', 'soil_temp_set_2', 'dew_point_temperature_set_1d', 'incoming_radiation_lw_set_1', 'solar_radiation_set_1', 'elevation', 'latitude', 'longitude', 'name', 'current temperature']"
    const message = body.message;
    let success = false;

    // const dialogue = [
    //   {
    //     role: 'user',
    //     content: message,
    //   },
    // ];

    // const completion = await openai.createChatCompletion({
    //   model: 'gpt-3.5-turbo',
    //   messages: [
    //     {
    //       role: 'user',
    //       content: message,
    //     },
    //   ],
    // });

    // if (completion) {
    //   success = true;
    // }

    const responseMessage = await SAGEnlp.classifiedMessage(message);
    if (responseMessage) success = true;

    // if (success) res.status(200).send({ success: true, message: completion.data.choices[0].message?.content });
    if (success) res.status(200).send({ success: true, message: responseMessage });
    else res.status(500).send({ success: false, message: 'Failed to process the nlp request.' });
  });

  return router;
}
