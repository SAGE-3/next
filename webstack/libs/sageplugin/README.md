# SAGEPlugin

Library to enable SAGE3 app developers to develop plugins that can be uploaded into a SAGE3 server. Provides an API to allow the apps developed this way to communicate with the SAGE3 ecosystem.

# Usage

Install the package into your project:

```
npm install @sage3/sageplugin
```

Import the package into your project and utilize it.

```
// Import the Package
import { SAGE3Plugin } from "@sage3/sageplugin";

// You Plugin app state type
type CounterState = {
  count: number;
}

// Intialize the SAGE3Plugin.
// Only intalize once. Utilize it as a singleton throughout your app.
const s3api = new SAGE3Plugin<CounterState>();

// Subscribe to updates from the SAGE3 server when other clients update the state.
s3api.subscribeToUpdates((state) => {
  if (state.data.state.count) {
    setCounter(state.data.state.count);
  }
});

// Push an update to the SAGE3 server.
s3api.update({ state: { count: counter } });
```

# Packaging and uploading to a SAGE3 Server

1. Build your webapp using the tools of your choice.
2. Ensure the entry point to your webapp is an `index.html` file that is located in the root folder of your dist.
3. Ensure assets, scripts, styles, etc. which are referenced in your `index.html` file are relative paths.
   - Instead of `<script src="script.js">`
   - It has to be relative, `<script src="./script.js"/>`
     - `./` has been prefixed
4. Zip the folder containing your app. It must be a `.zip` file.
5. Login to the SAGE3 Server of your choice. (Guests can not upload plugins.)
6. From the SAGE3 Menu (lower left corner) select `Plugins`
7. Under `Upload` select the zipped file of your app. Enter a `Plugin Name` and `Plugin Description`.
8. Click Upload. After the upload has completed your should see the Plugin app listed under `Your Plugins`
9. Enter any SAGE3 Board and Open the `Plugins Panel`. You should see your Plugin App listed.
10. Click your Plugin to open it on the board.
11. To delete your Plugin from the server, click the red X under the `Your Plugins` section.

# API

The State Object of your plugin app instance.

```
// Plugin Type
type Plugin<T> = {
  // The ID of the instantiated PluginApp
  _id: string;

  // Time it was created in EPOCH
  _createdAt: number;

  // Time app was last updated in EPOCH
  _updatedAt: number;

  // userId of the user who lasted updated this pluginapp instance
  _updatedBy: string;

  // userId of the user who created this pluginapp instance
  _createdBy: string;

  // The State data
  data: {
    // The Title of this pluginapp instance
    title: string;

    // The roomId that contains this pluginapp instance
    roomId: string;

    // The boardId that contains this pluginapp instance
    boardId: string;

    // The position of this pluginapp instance on the board.
    position: { x: number; y: number; z: number };

    // The size of this pluginapp instance on the board.
    size: { width: number; height: number; depth: number };

    // The rotation of this pluginapp instance on the board. (NOT USED CURRENTLY)
    rotation: { x: number; y: number; z: number };

    // Informs SAGE3 your app is a PluginApp. (DONT CHANGE)
    type: 'PluginApp';

    // The state of your app that you provide when initializing the SAGE3Plugin
    // new SAGE3Plugin<YOUR_STATE_TYPE>();
    state: Partial<T>;

    // If this pluginapp instance was currently brought to the top this will be true
    raised: boolean;
  };
};

```

## Intialize

To connect to the SAGE3 server's ecosystem initalize the SAGE3Plugin. Only intialize once as use as a singleton through your app.

```
import { SAGE3Plugin } from "@sage3/sageplugin";

// Example State
type CounterState = {
  count: number;
}

const s3api = new SAGE3Plugin<CounterState>();
```

## Subscribe To Updates

Subscribe to updates of the State object.

```
 s3api.subscribeToUpdates((state) => {
    // state here is the State Object
    // You can get your provided State type from this object.
    const pluginState = state.data.state as CounterState;
  });

```

## Push and Update

Push an update to the State object which will be sent to the SAGE3 server to be published out to other clients.

```
// Update Position
s3api.update({ position: { x: 50; y: 50; z: 0 }; });

// Update your plugin state
s3api.update({ state: { count: 50 } });

// Can also reference the current state object
const currentCount = s3api.state.data.state.count;
s3api.update({ state: { count: currentCount + 1 } });

```

# Developers

## To build and publish the SAGEPlugin library

- Update the SAGEPlugin Version in the `package.json` file.
  - Located: `/webstack/libs/sageplugin/package.json`
  - ` "version": "0.0.10"` (Change the version number to the new version to be published)
- CD to `/webstack` folder
- Run `> nx build sageplugin`
- CD to `/webstack/dist/libs/sageplugin`
- Run `> npm publish`
