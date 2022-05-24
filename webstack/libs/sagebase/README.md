# SAGEBase

SAGEBase is a Node/Express backend service that provides a realtime database utilizing REDIS.

- Database (v0.2.0)
- PubSub (v0.3.0)
- Authentication (v0.4.0)
- Authorization (v0.5.0)

v0.6.0 -> v1.0.0 Will be testing, bug fixes, and documentation.

Timeline

- v0.2.0 (March 29th 2022)
- v0.3.0 (March 31st 2022)
- v0.4.0 (May 1st 2022)
- v0.5.0 (June 1st 2022)
- v1.0.0 (August 31st 2022)

## Requirements

- Node.js
- Redis with modules:
  - RedisJSON 2.0 or later
  - RediSearch 2.2 or later

---

## NodeJS

- NPM Packages
  - [redis](https://www.npmjs.com/package/redis)

### Configuring NodeJS

---

## Redis

We recommend using the offical RedisLabs Docker Images. There are multiple images but we recommend the `redismod` image due to it already having RedisJSON and RediSearch installed. You still need to configure the image to utilize the modules, explained below.

- [RedisMod Docker Image](https://hub.docker.com/r/redislabs/redismod)

### Confguring Redis

TODO

---

## Basic Usage Example

TODO

# Developers

NPM Package Location [npm @sage3/sagebase](https://www.npmjs.com/package/@sage3/sagebase)

## To build and publish the SAGEBase library

- Update the SAGEBase Version in the `package.json` file.
  - Located: `/webstack/libs/sagebase/package.json`
  - ` "version": "0.0.10"` (Change the version number to the new version to be published)
- CD to `/webstack` folder
- Run `> nx build sagebase`
- CD to `/webstack/dist/libs/sagebase`
- Run `> npm publish`
