/**
 * Plugin Client to latch into the S3 Lifecycle and communicate with the S3 Application Core
 */

// Plugin Type
type Plugin<T> = {
  _id: string;
  _createdAt: number;
  _updatedAt: number;
  _updatedBy: string;
  _createdBy: string;
  data: {
    title: string;
    roomId: string;
    boardId: string;
    position: { x: number; y: number; z: number };
    size: { width: number; height: number; depth: number };
    rotation: { x: number; y: number; z: number };
    type: 'PluginApp';
    state: Partial<T>;
    raised: boolean;
  };
};

/**
 * The interface for Plugins to communicate with SAGE3.
 * Plugins are contained with in iFrames and we use the `window` messaging system to communciate.
 */
export class SAGE3Plugin<T> {
  // The state of the plugin
  public state: Plugin<T> | null = null;
  // The subscriptions to the state.
  private updateSubs: { [id: string]: (state: Plugin<T>) => void } = {};

  constructor() {
    window.addEventListener('message', (event: any) => {
      const message = event.data as { id: string; type: string; state: Plugin<T> };
      if (message.type === 'init') {
        this.init(message.state);
      } else if (message.type === 'update') {
        this.updateFromSAGE3(message.state);
        this.publishToSubscriptions(message.state);
      }
    });
  }

  // Initialize the state at start up with the SAGE3 main process.
  private init(state: Plugin<T>) {
    console.log('SAGE3Plugin> Initalizing Communication with IFrame');
    this.state = state;
    this.updateFromSAGE3(state);
    this.publishToSubscriptions(this.state);
  }

  // Update the state.
  private updateFromSAGE3(newState: Plugin<T>) {
    const updatedState = { ...this.state, ...newState } as Plugin<T>;
    this.state = updatedState;
    this.publishToSubscriptions(updatedState);
  }

  private publishToSubscriptions(state: Plugin<T>) {
    Object.keys(this.updateSubs).forEach((id) => {
      this.updateSubs[id](state);
    });
  }

  /**
   * Subscribe to updates from the SAGE3 Main Process.
   * @param updateCallback Call back which will provide the new state updates from the SAGE3 main process.
   */
  public subscribeToUpdates(updateCallback: (state: Plugin<T>) => void) {
    const id = Math.floor(Math.random() * 1000).toString();
    this.updateSubs[id] = updateCallback;
  }

  /**
   * Send an update to the SAGE3 Main Process
   * @param newState The new state to send to the SAGE3 Main process. Will be populated out to all clients.
   * @returns
   */
  public update(newState: Partial<Plugin<T>['data']>) {
    if (!this.state) {
      console.log('SAGE3Plugin> ERROR: App has not been initizalized yet.');
      return;
    }
    // Will post messages to the main process
    console.log('SAGE3Plugin> Sending Update To Main Process');
    window.parent.postMessage({ source: 's3plugin', type: 'update', id: this.state._id, state: newState });
  }
}
