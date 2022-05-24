# SAGE3: Webstack

Directory containing an Nrwl Nx Monorepo for the 'homebase' Nodejs web server and the 'collaboration-space' React web application (the main collaboration canvas).

# Technologies

The Webstack uses the following technologies for its core software stack. There are other various libraries used throughout but these are the core technologies used which every developer should be somewhat familiar with.

- [Typescript](https://www.typescriptlang.org/)
- [Nodejs](https://nodejs.org/en/)
- [React](https://reactjs.org/)
- [Nx](https://nx.dev/)
- [ESLint](https://eslint.org/)
- [TypeDoc](https://typedoc.org/)

---

# Folders

- `/apps`
  - Contains the core **apps** 'homebase' and 'collaboration-space'.
    - `/apps/homebase` Web server that manages user services, files, walls...etc.
    - `/apps/collaboration-space` React frontend web application
- `/certificates`
  - Directory to stage your HTTPS/SSL keys. Contains certificates for localhost development.
- `/clients`
  - Contains the SAGE3 electron client and future native applications to run SAGE3 on different platforms (ex. VR, AR, Mobile).
- `/database`
  - Directory for the backend to store various database files.
- `/docs`
  - Directory for Typedoc to store all its files.
- `/libs`
  - SAGE3 Libs for the 'apps' to use.
    - `/libs/applications` Contains all the SAGE3 Applications.
    - `/libs/backend` Libs used by `homebase`
    - `/libs/frontend` Libs used by `collaboration-space`
    - `/libs/shared` Libs that any part of SAGE3 can use
- `/tools`
  - SAGE3 tools used by the dev team to aid in develpment. ex. SAGE3 Application template generator.

---

# Setup

Install [Node.js](https://nodejs.org/en/)

```bash
# Installs the yarn package manager
npm install --global yarn
# Installs the project's dependencies
yarn
# Stages and creates the required folders/files
yarn stage
```

# Running in Dev Mode

It is required to run the development backend Docker images before starting up the webstack. Instructions to do so are located within `/deployment/README.md`

```bash
# Start the backend Nodejs web server application
yarn start
# Start the frontend React web application
yarn start collaboration-space
```

# Create a new SAGE3 Application

### **TODO**

This needs information pertaining to the new generator and such.

---

# Useful NX Commands

#### Create a 'node' library (can be used in frontend or backend barring use of server-side deps)

```bash
yarn nx g @nrwl/node:library authorize-action
```

#### Create a 'react' lib for a SAGE3 app

```bash
yarn nx g @nrwl/react:component notebook-viewer --project=applications --export=false
```

#### Build 'webapp' for deployment

```bash
yarn nx build --buildLibsFromSource --configuration=production
```

#### Create a 'react' library

```bash
yarn nx g @nrwl/react:lib ui-lib
```

#### Create a component in the 'react' UI library and aggregate the export

```bash
yarn nx g @nrwl/react:component <component-name> --project=components --export
```

