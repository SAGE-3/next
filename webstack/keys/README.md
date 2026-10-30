# keys

Directory to stage your JWT keys and token for development.

Development runs over HTTP and needs no SSL certificate; in production, Traefik handles HTTPS
with the certificate in `deployment/configurations/traefik/certs`.

The `GO-*` and `init_webserver.*` scripts here generate self-signed certificates from the time the
web server served HTTPS itself. They are not needed for development. For a self-signed certificate on a
test server, see `deployment/configurations/node/keys/README.md`.
