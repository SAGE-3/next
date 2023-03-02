# SAGEPlugin

Library to enable SAGE3 app developers to develop plugins that can be uploaded into a SAGE3 server. Provides an API to allow the apps developed this way to communicate with the SAGE3 frontend.

# Usage

## To build and publish the SAGEPlugin library

- Update the SAGEPlugin Version in the `package.json` file.
  - Located: `/webstack/libs/sageplugin/package.json`
  - ` "version": "0.0.10"` (Change the version number to the new version to be published)
- CD to `/webstack` folder
- Run `> nx build sageplugin`
- CD to `/webstack/dist/libs/sageplugin`
- Run `> npm publish`
