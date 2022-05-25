# SAGE3: Smart Amplified Group Environment

<a href="https://sage3.sagecommons.org/"><img src="https://user-images.githubusercontent.com/19752298/113063377-ed534280-9150-11eb-87c8-e194c46e508c.png" align="left" hspace="10" vspace="6" height="100px"></a>

[SAGE3](https://sage3.sagecommons.org/) is software to enable data-rich collaboration on high-resolution display walls. SAGE2 moved SAGE into cloud computing and SAGE3 ushers in the inclusion of artificial intelligence. Scientists analyzing their data in SAGE3 will collaborate with each other and with artificial intelligence through large interactive visualization spaces, such as multi-monitor workstations, tiled display walls, and virtual reality headsets.

---

# Directories

There are three different directories within the root of the repo; deployment, foresight, and webstack.

## **Deployment**

Deployment contains the [Docker](https://www.docker.com/) files to stand up a Dockerized SAGE3 instance. It also contains configuration files for the various backend services.

While developing for SAGE3 only a portion of the Docker images will be running while the "Webstack" Node server will be running locally.

## **Foresight**

Foresight contains [Python](https://www.python.org/) related code that brings a Python kernel to SAGE3 and various articifical intelligence tools.

## **Webstack**

Webstack contains a [Nrwl Nx Monorepo](https://nx.dev/) that contains the [Node.js](https://nodejs.org/en/) backend server and the [React](https://reactjs.org/) frontend web app.

While developing for SAGE3 it is ideal to run the Node.js server and React WebApp locally instead of within a Docker image.

---

# Developer Quick Start

## **Setup**

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [Node.js](https://nodejs.org/en/)
3. Install [Python3](https://www.python.org/downloads/)

From a terminal run the following commands to install [yarn](https://yarnpkg.com/) and to start the initial setup of the Webstack.

```bash
# Change your directory to the webstack folder
cd ./webstack
# Install the yarn package manager
npm install --global yarn
# Install the Webstack's dependencies
yarn
# Stage and create the required folders/files
yarn stage
```

## **Running**

To start running the dev environment first run the Docker Backend:

```bash
# Change your current directory to the deployment folder
cd ./deployment
# Spin up the Docker images
docker-compose -f docker-compose-backend.yml  up --remove-orphans
```

Second we will start up the Webstack:

```bash
# Open a new terminal and change your current directory to the webstack folder
cd ./webstack
# Start the backend Nodejs web server application
yarn start
# Start the frontend React web application
yarn start collaboration-space
```

Open a Chrome browser and navigate to `localhost:4200`

Editing and saving code within `/webstack/apps` or `/webstack/libs` should hot reload the webpage.

---

# Branches

## Master

Stable branch that is for production servers.

## Dev

Development branch used to test new features and will be installed on EVL and LAVA servers

## Feature Branches

Feature branches should branch off of the `dev` branch and explain their purpose in their name. When the branch is ready to be incorporated into `dev` a pull request should be created within GitHub. The branch will be reviewed by core SAGE3 members before being merged into `dev`.

---

# Deploying Your own SAGE3 Server

#### **TODO** Needs information on how to setup the SAGE3 Production Server

---
