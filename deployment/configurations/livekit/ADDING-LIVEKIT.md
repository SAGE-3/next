# Adding LiveKit screenshare to an existing server

Steps to turn on self-hosted screensharing on a SAGE3 server that does not have it yet.
Servers using Twilio keep working untouched — skip this entirely and nothing changes.

All paths are relative to `deployment/`.

---

## 1. Generate the secret

One value, in `.env`. LiveKit requires at least 32 characters; a UUID is 36.

```bash
echo "LIVEKIT_API_SECRET=$(uuidgen)" >> .env
```

This is the only credential. Leave it empty and there is no screensharing: the server
mounts no routes and the UI says screensharing is not enabled.

> `.env` is tracked by git. Do not commit the generated value.

## 2. Add the SFU service

In `docker-compose-amd64.yml` (or `-arm64.yml`), add alongside the other services:

```yaml
  livekit-server:
    image: "livekit/livekit-server:v1.13"
    command: --config /etc/livekit.yaml
    environment:
      # The key ("SAGE3") is an identifier, not a secret, so it is fixed
      - "LIVEKIT_KEYS=SAGE3: ${LIVEKIT_API_SECRET}"
    labels:
      - "traefik.enable=true"
      # Signaling goes through traefik for TLS: wss://<server>/sfu
      # (/livekit is NOT the prefix: node-server owns /livekit/token)
      - "traefik.http.routers.livekit-server.rule=Host(`${SAGE3_SERVER}`) && PathPrefix(`/sfu`)"
      - "traefik.http.routers.livekit-server.priority=400"
      - "traefik.http.routers.livekit-server.entrypoints=websecure"
      - "traefik.http.services.livekit-server.loadbalancer.server.port=7880"
      - "traefik.http.middlewares.livekit-strip.stripprefix.prefixes=/sfu"
      - "traefik.http.routers.livekit-server.middlewares=livekit-strip"
    # WebRTC media bypasses traefik: UDP (and TCP fallback) directly on the host
    ports:
      - "7881:7881"
      - "7882:7882/udp"
    volumes:
      - ./configurations/livekit/livekit.yaml:/etc/livekit.yaml
    deploy:
      restart_policy:
        condition: on-failure
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
```

The router priority of `400` matters: it has to beat `node-server`'s catch-all at `100`.

## 3. Give node-server the same secret

In the same file, add one line to **`node-server`**'s existing `environment:` block:

```yaml
    environment:
      - NODE_ENV=production
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
```

Only `node-server` — it is the only service that mints join tokens. Do not add it to
`yjs-server` or `files-server`.

## 4. Add the config file

Copy `configurations/livekit/livekit.yaml` from the repository. Nothing in it needs
editing and it holds no credentials.

## 5. Open the media ports

WebRTC media does **not** go through traefik. On the host firewall, forwarded to this
machine if it is behind NAT:

| Port | Purpose |
|---|---|
| `7882/udp` | All WebRTC media, multiplexed onto one port |
| `7881/tcp` | Fallback for clients on networks that block UDP |

Signaling needs no new port — it rides the existing HTTPS port through traefik.

## 6. Restart

```bash
./GO
```

Nothing changes in `sage3-prod.hjson`. There is no URL or key to configure: clients always
reach the SFU at `/sfu` on the server they loaded the page from.

---

## Verifying

**The server picked it up.** In the `node-server` logs:

```
Configuration> screenshare backend: livekit
```

`twilio` means the secret did not reach the container; `none` means neither backend is
configured.

**Video actually flows.** Share a screen from a client on a *different network* than the
server. Joining the room only proves signaling works — it is the media path that depends
on step 5.

**Cleanup works.** Stop a share; the window should disappear within a second or two. If it
lingers, the SFU cannot reach `node-server` for webhooks.

## If video never appears

The room joins and the window stays blank. Signaling is fine; media is not.

1. Confirm `7882/udp` is open and forwarded (step 5). This is the usual cause.
2. If the host has no outbound STUN access, or STUN reports the wrong address, edit
   `configurations/livekit/livekit.yaml`:

   ```yaml
   rtc:
     use_external_ip: false
     node_ip: <the address clients actually reach>
   ```

   `node_ip` has no effect while `use_external_ip` is `true` — `use_external_ip` takes
   precedence, so both edits are required.

## Turning screensharing off

Clear `LIVEKIT_API_SECRET` and comment out the `livekit-server` service. The container
refuses to start without credentials, so leaving it enabled with an empty secret will
restart-loop.

## Notes

- **Both backends configured?** LiveKit wins. Users cannot pick, which prevents shares
  landing on a backend nobody else is connected to. The browser console logs which one
  was used: `Screenshare> starting with backend: livekit`.
- **Existing Twilio screenshares** on boards keep rendering after the switch.
- **Local development** needs none of this: `Backend` starts the SFU with
  `livekit-local.yaml`, bound to `127.0.0.1`, and the server falls back to a
  development secret automatically.
