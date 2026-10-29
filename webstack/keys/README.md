# keys

Directory to stage your JWT keys and token for development.

No SSL certificate goes here: development runs over HTTP, and in production Traefik handles HTTPS
with the certificate in `deployment/configurations/traefik/certs`.
