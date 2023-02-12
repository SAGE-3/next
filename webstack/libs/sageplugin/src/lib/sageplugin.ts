/**
 * Plugin Client to latch into the S3 Lifecycle and communicate with the S3 Application Core
 */

//
type Plugin = {
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
    state: any;
    raised: boolean;
  };
};

class S3AppPlugin {
  public id: string | undefined;
  public state: any;

  public updateSubs: { [id: string]: (state: Plugin) => void } = {};
  constructor() {
    window.addEventListener('message', (event: any) => {
      const message = event.data as { id: string; type: string; state: any };
      console.log(message);
      if (message.type === 'init') {
        this.init(message.state);
      } else if (message.type === 'update') {
        this.update(message.state);
      }
    });
  }

  private init(state: Plugin) {
    console.log('SAGE3Plugin> Initalizing Communication with IFrame');
    this.id = state._id;
    this.state = state;
    this.update(state);
  }

  private update(newState: Plugin) {
    this.state = { ...this.state, ...newState };
    Object.keys(this.updateSubs).forEach((id) => {
      this.updateSubs[id](this.state);
    });
  }

  public subscribeToUpdates(updateCallback: (state: Plugin) => void) {
    const id = Math.floor(Math.random() * 1000).toString();
    this.updateSubs[id] = updateCallback;
  }

  public sendUpdate(newState: Partial<Plugin['data']>) {
    if (!this.id) {
      console.log('SAGE3Plugin> ERROR: App has not been initizalized yet.');
      return;
    }
    // Will post messages to the main process
    console.log('SAGE3Plugin> Sending Update To Main Process');
    window.parent.postMessage({ source: 's3plugin', id: this.id, type: 'update', state: newState });
  }

  public sendUpdateState(newState: Partial<Plugin['data']['state']>) {
    if (!this.id) {
      console.log('SAGE3Plugin> ERROR: App has not been initizalized yet.');
      return;
    }
    // Will post messages to the main process
    console.log('SAGE3Plugin> Sending UpdateState To Main Process');
    window.parent.postMessage({ source: 's3plugin', id: this.id, type: 'updateState', state: newState });
  }
}
export const S3API = new S3AppPlugin();
