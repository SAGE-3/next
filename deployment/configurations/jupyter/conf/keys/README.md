# SSL keys for jupyter

Not used: Jupyter runs behind Traefik, which handles HTTPS for the whole server with the
certificate in `configurations/traefik/certs` (see the README in that folder).

Only if you change `../start.sh` to run Jupyter with its own HTTPS would it read here:

- certificate.crt
- private-key.key
