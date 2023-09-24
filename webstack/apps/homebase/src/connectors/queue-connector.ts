/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import * as path from 'path';

/**
 * NPM modules
 */

// Queue package for handling distributed jobs and messages
import { Queue, QueueEvents, Worker } from 'bullmq';
// REDIS connection used by bullmq
import IORedis from 'ioredis';

/**
 * Abstraction of queue for tasks
 *
 * @export
 * @class SBQueue
 */
export class SBQueue {
  private aQueue: Queue;
  private connection: IORedis;
  private queueEvents: QueueEvents;

  constructor(redisInfo: string, queueName: string) {
    // Create a REDIS connection object
    this.connection = new IORedis(redisInfo, { maxRetriesPerRequest: null });
    // Create the BullMQ queue
    this.aQueue = new Queue(queueName, {
      connection: this.connection,
      defaultJobOptions: { removeOnComplete: true },
    });
    // Create the BullMQ queue events: completed, waiting, drained, active, completed
    this.queueEvents = new QueueEvents(queueName, { connection: this.connection });
    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.log('Queue> job failed', queueName, jobId, failedReason);
    });
  }

  /**
   * Add the function to do the task
   *
   * @param {any} job
   *
   * @memberOf SBQueue
   */
  addProcessor(job: (j: any) => Promise<any>): void {
    // Create a worker to process the tasks
    const worker = new Worker(this.getName(), job, { connection: this.connection });
    // Worker events: completed, progress, failed
    worker.on('failed', (j, err) => {
      if (j) console.log('Worker>', this.getName(), `${j.id} has failed with ${err.message}`);
    });
  }

  addProcessorSandboxed(file: string): void {
    const processorFile = path.resolve(file);
    const worker = new Worker(this.getName(), processorFile, {
      connection: this.connection,
      concurrency: 4,
    });
    // Worker events: completed, progress, failed
    worker.on('failed', (j, err) => {
      if (j) console.log('Worker>', this.getName(), `${j.id} has failed with ${err.message}`);
    });
  }

  /**
   * Add a task to the queue
   *
   * @param {*} task
   * @returns {Promise<any>} promise to the result of the task
   *
   * @memberOf SBQueue
   */
  async addTask(task: any) {
    // Add the task to the queue
    const t = await this.aQueue.add(this.getName(), task);
    // Return a promise to the result of the task
    return t.waitUntilFinished(this.queueEvents);
  }

  /**
   * Return bull queue name
   *
   * @returns {string}
   * @memberOf SBQueue
   */
  getName(): string {
    return this.aQueue.name;
  }
}
