# JITSI deployment

## Clone

Command: `git clone https://github.com/jitsi/docker-jitsi-meet`

## Guide

https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker

![Architecture](https://jitsi.github.io/handbook/docs/assets/docker-jitsi-meet.png)

## Test

Test host: `https://traoumad.evl.uic.edu`


## Run

- cd docker-jitsi-meet
- docker-compose up
- Configuration
  - generate a configuration: `cp env.example .env`
  - generate passwords: `./gen-passwords.sh`
  - Create required CONFIG directories:
    - mkdir -p ~/.jitsi-meet-cfg/{web/letsencrypt,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}
  - Values from .env exported to configuration files
  - Configutation files mounted inside containers
- Create users inside `prosody`:
  - Run: `docker-compose exec prosody /bin/bash`
  - Create users:
    - `prosodyctl --config /config/prosody.cfg.lua register luc meet.jitsi sage123`
	- `meet.jitsi` is an internal name
	- `/config/prosody.cfg.lua` is `~/.jitsi-meet-cfg/prosody/prosody.cfg.lua`
- Run:
  - `docker-compose up -d`
  - containers:
    - docker-jitsi-meet_prosody_1 
    - docker-jitsi-meet_web_1
    - docker-jitsi-meet_jvb_1
	- docker-jitsi-meet_jicofo_1
