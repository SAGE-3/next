/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

/**
 * NPM modules
 */

// Queue package for handling distributed jobs and messages
import * as Bull from 'bull';

/**
 * Abstraction of queue for tasks
 *
 * @export
 * @class SBQueue
 */
export class SBQueue {
  private aQueue: Bull.Queue;

  constructor(redisInfo: string, queueName: string) {
    // Create the Bull queue, based on REDIS
    this.aQueue = new Bull(queueName, redisInfo, {
      defaultJobOptions: { removeOnComplete: true },
      settings: { lockDuration: 60000 },
    });
    // Event handler, not really used (because using promises)
    this.aQueue.on('completed', function (job, _result) {
      // Job done
      console.log('Queue> task completed for', job.id);
    });

    // this.aQueue.on("progress", (d, p) => {
    //   console.log("Progress>", d.queue.name, d.id, p);
    // });

    this.aQueue.on('completed', function (job) {
      console.log('Job completed> data:', queueName, job.id);
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
    // Task to be done, return a promise
    this.aQueue.process(job);
  }

  /**
   * Add a task to the queue
   *
   * @param {*} task
   * @returns {Promise<any>} promise to the result of the task
   *
   * @memberOf SBQueue
   */
  addTask(task: any): Promise<any> {
    console.log('Queue> adding task', task.id);
    return this.aQueue.add(task);
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
