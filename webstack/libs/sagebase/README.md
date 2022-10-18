# SAGEBase

SAGEBase is a Node/Express backend service that provides authentication, no-sql collection/document database, pub/sub, and authorization utilizing REDIS.

- Database (v0.2.0)
- PubSub (v0.3.0)
- Authentication (v0.4.0)
- Authorization (v0.5.0)

v0.6.0 -> v1.0.0 Will be testing, bug fixes, and documentation.

Timeline

- v0.4.0 (June 1st 2022)
- v0.5.0 (August 1st 2022)
- v1.0.0 (September 1st 2022)

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

We recommend using the offical RedisLabs Docker Images. There are multiple images but we recommend the `redis-stack` image due to it already having RedisJSON and RediSearch installed. You still need to configure the image to utilize the modules, explained below.

- [RedisStack Docker Image](https://hub.docker.com/r/redis/redis-stack)

### Confguring Redis

Add to your redis.conf file:

```
loadmodule /opt/redis-stack/lib/redisearch.so
loadmodule /opt/redis-stack/lib/rejson.so
```

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
