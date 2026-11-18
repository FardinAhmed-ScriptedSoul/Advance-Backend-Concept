# Docker Command Reference

Commands below use Docker CLI / Compose v2 (`docker compose`). Replace example names and paths with yours. For every option, run `docker COMMAND --help`; this is a practical interview-focused reference, not every option supported by every Docker version.

## Help and version

```bash
docker --version
docker version
docker info
docker help
docker run --help
docker compose --help
```

## Images: build, list, inspect, tag, and registry

```bash
docker build -t myapp:1.0 .                       # build from current context
docker build -f Dockerfile.dev -t myapp:dev .     # choose Dockerfile and tag
docker build --no-cache -t myapp:debug .           # ignore build cache
docker build --pull -t myapp:latest .              # check for a newer base image
docker image ls
docker image inspect myapp:1.0
docker history myapp:1.0                           # image layers/history
docker tag myapp:1.0 username/myapp:1.0            # add registry-qualified name
docker login                                       # authenticate to registry
docker push username/myapp:1.0
docker pull username/myapp:1.0
docker image rm myapp:1.0
```

**Build flags:** `-t/--tag` names the result; `-f/--file` selects a Dockerfile; `--no-cache` disables cached layers; `--pull` checks/pulls the base; `--build-arg KEY=VALUE` supplies a build argument (not a secret); `--platform` selects a target platform; `--target` selects a named multi-stage build target.

Registry names have the form `registry/namespace/repository:tag`; Docker Hub commonly omits `registry/`. Use the same exact owner/repository spelling when tagging, pushing, and pulling.

## Containers: run and lifecycle

```bash
docker run --name web -d -p 8080:3000 myapp:1.0
docker run --rm -it --name shell myapp:1.0 sh
docker run -d --name api --restart unless-stopped -p 3000:3000 myapp:1.0
docker run -d --name api --env-file .env -p 3000:3000 myapp:1.0
docker run -d --name api -e NODE_ENV=production myapp:1.0
docker run -d --name api --memory 512m --cpus 1.5 myapp:1.0
docker run -d --name api -v api-data:/app/data myapp:1.0
docker run -d --name api --mount type=volume,source=api-data,target=/app/data myapp:1.0
docker run -d --name api --mount type=bind,source=/host/data,target=/app/data myapp:1.0
docker run -d --name api --network app-net myapp:1.0

docker ps                                           # running containers
docker ps -a                                        # all, including stopped
docker stop web                                     # graceful stop, then kill after timeout
docker start web                                    # start an existing stopped container
docker restart web
docker pause web
docker unpause web
docker kill web                                     # immediate termination
docker rm web                                       # remove stopped container
docker rm -f web                                    # force remove, including running
docker container prune                              # remove all stopped containers
```

**Common `docker run` flags:** `-d` detached; `-i` keep stdin open; `-t` allocate a terminal; `--rm` remove container after exit; `--name` assign a name; `-p HOST:CONTAINER` publish a port; `-P` publish all exposed ports to random host ports; `-e` set environment variable; `--env-file` load environment values; `-v` mount volume/path; `--mount` explicit mount syntax; `--network` select network; `--entrypoint` override executable; `--workdir` set working directory; `--user` set UID/name; `--restart` set restart policy; `--memory`, `--cpus`, `--pids-limit` constrain resources; `--read-only` make container root filesystem read-only.

`--restart` values include `no` (default), `on-failure[:N]`, `always`, and `unless-stopped`. A restart policy does not replace health checks or application supervision.

## Inspect, logs, execute, and copy

```bash
docker logs web
docker logs -f --tail 100 web                       # follow last 100 lines
docker exec -it web sh                              # shell in running container
docker exec web node --version                      # run a command without a shell
docker inspect web
docker inspect --format '{{json .Mounts}}' web      # inspect mounted paths
docker port web
docker stats                                        # live resource use
docker top web
docker cp web:/app/log.txt ./log.txt
docker cp ./config.json web:/app/config.json
docker diff web                                     # writable-layer changes
```

## Networks

```bash
docker network ls
docker network create app-net
docker network inspect app-net
docker network connect app-net web
docker network disconnect app-net web
docker network rm app-net
docker network prune
```

Containers on the same user-defined network can resolve one another by container/service name. In Compose, use the service name (e.g. `http://backend:3000`); the host browser instead uses a published host port.

## Volumes and bind mounts

```bash
docker volume ls
docker volume create app-data
docker volume inspect app-data
docker run -v app-data:/app/data myapp:1.0
docker run --mount type=volume,source=app-data,target=/app/data myapp:1.0
docker run --mount type=bind,source=/host/data,target=/app/data myapp:1.0
docker volume rm app-data
docker volume prune
```

- Named volume: `source=app-data`; Docker manages the storage location.
- Bind mount: `source=/host/path`; must refer to a host path.
- In both cases, write inside the container's mount target to persist data there. Mounting over `/app` can hide application files.
- Inspect mounts with `docker inspect CONTAINER` and find `Source` and `Destination`.
- On Git Bash/Windows, path conversion can alter mount arguments. One option is:

```bash
mkdir -p /d/docker_volumes
MSYS_NO_PATHCONV=1 docker run --mount "type=bind,source=D:/docker_volumes,target=/app/data" myapp:1.0
```

## Compose

Run these from the directory containing `compose.yaml` / `docker-compose.yml`:

```bash
docker compose config                                # validate/render merged config
docker compose build
docker compose build --no-cache backend
docker compose pull
docker compose up                                    # foreground; builds only if needed
docker compose up --build                           # build then start
docker compose up -d --build                        # detached build and start
docker compose up -d --build --force-recreate       # recreate containers
docker compose ps
docker compose logs
docker compose logs -f --tail 100 backend
docker compose exec backend sh
docker compose exec backend node --version
docker compose restart backend
docker compose stop
docker compose start
docker compose down                                  # stop/remove containers and network
docker compose down -v                               # ALSO deletes Compose volumes/data
```

Use the Compose service name for container-to-container connections. `ports: ["HOST:CONTAINER"]` publishes a service to the host. `expose` does not publish to the host. `depends_on` alone does not guarantee that a dependency is ready.

## Disk use and cleanup

```bash
docker system df
docker image prune                                   # dangling images
docker image prune -a                                # all unused images
docker container prune                               # stopped containers
docker volume prune                                  # unused volumes
docker system prune                                  # unused objects
docker system prune -a --volumes                     # broad/destructive cleanup
```

Prune commands can remove data or cached images. Inspect what is unused before applying them; avoid `--volumes` unless deletion is intended.

## Troubleshooting sequence

```bash
docker compose ps -a
docker compose logs --tail 200 SERVICE
docker compose config
docker inspect CONTAINER
docker port CONTAINER
docker exec -it CONTAINER sh
curl -i http://localhost:HOST_PORT/
```

Check in order: did the container stay running; does its main process log an error; is the app listening on the expected port and on `0.0.0.0`; does the host/container port mapping match; is the URL correct; and does the app actually define the requested route?

## Interview flag reminders

- `-it` is `--interactive --tty`; useful for a shell, usually unnecessary for a daemon.
- `-d` detaches; `--rm` removes an exited one-off container.
- `-p 8080:3000` maps host 8080 to container 3000; order matters.
- `-v name:/path` is a named volume; `-v /host/path:/path` is a bind mount. `--mount` is more explicit.
- `--no-cache` affects image build; it does not clear a running container's data.
- `docker compose down -v` removes volumes; plain `down` does not.
- `docker exec` requires a running container; `docker inspect` also works on stopped containers.
- `EXPOSE` documents a port; `-p` publishes it.
