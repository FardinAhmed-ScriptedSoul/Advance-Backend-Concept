# Docker: Compact Concepts and Interview Notes

## Why Docker?

Docker packages an application with its runtime and dependencies as an image, so the same artifact can run consistently across development, CI, and production.

```text
source + dependencies + config
             |
          docker build
             v
       immutable image
       /            \
   container A    container B
```

Containers start quickly and share the host kernel, so they are generally lighter than full virtual machines. They are isolated processes, not tiny VMs: a Linux container does not include its own kernel.

## How Docker works

```text
docker CLI / Compose
        | Docker API
        v
Docker Engine (dockerd)
        |
   containerd
        |
      runc  ---- creates OCI container
        |
Linux kernel: namespaces + cgroups + capabilities + seccomp
        |
   isolated process
```

- The CLI sends requests to the Engine; the daemon manages images, networks, volumes, and containers.
- The runtime configures namespaces, resource limits, mounts, and security, then starts the container process.
- On Linux, containers use the host kernel. Docker Desktop on Windows/macOS runs Linux containers inside a managed Linux VM; Windows containers use Windows container isolation.

### Kernel-level isolation

| Mechanism                    | What it isolates or controls                                                  |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Namespaces                   | Process IDs, mounts, networking, hostname (UTS), IPC, and optionally user IDs |
| cgroups                      | CPU, memory, process count, and other resource accounting/limits              |
| Capabilities                 | Splits root privileges into smaller permissions                               |
| seccomp / AppArmor / SELinux | Restricts system calls and access to kernel resources                         |
| Overlay filesystem           | Combines read-only image layers with a container's writable layer             |

Containers are not a security boundary equivalent to a separate VM kernel. Keep the host and Engine patched, avoid privileged mode, and run as a non-root user when possible.

## Core objects

```text
Dockerfile --build--> Image --run--> Container
                              |
                  +-----------+-----------+
                  |                       |
              Network                 Volume/mount
          container-to-container      persistent data
```

- **Dockerfile:** instructions for building an image.
- **Image:** immutable, layered template. Layers are cached and shared between images.
- **Container:** a running or stopped instance of an image, with a temporary writable layer.
- **Registry:** stores and distributes images (for example, Docker Hub).
- **Volume:** persistent data managed by Docker.
- **Bind mount:** a host path mounted into a container.
- **Network:** connectivity and service-name discovery between containers.
- **Compose:** declarative way to run related services together.

### Images, layers, and containers

Each Dockerfile instruction usually creates a layer. Build cache is reused when the instruction and its inputs are unchanged. Put frequently changing files later in the Dockerfile to preserve useful cache.

```text
container writable layer  <- lost when container is removed
-----------------------------------------------
image layer 3 (application)
image layer 2 (dependencies)
image layer 1 (base OS/runtime)
```

Image layers are read-only and shareable; a container's writable layer is ephemeral. Do not store important data only there.

## Dockerfile essentials

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

- `FROM` chooses a base image; prefer a maintained, specific version over `latest`.
- `WORKDIR` sets the working directory for later instructions.
- `COPY` copies from the build context; `.dockerignore` excludes files such as `node_modules`, `.git`, and `.env`.
- `RUN` executes at build time; `CMD` provides the default runtime command. `ENTRYPOINT` defines the executable and `CMD` can supply its default arguments.
- `EXPOSE` documents the container port; it does **not** publish it. `-p HOST:CONTAINER` publishes a port.
- `ARG` is for build-time values; `ENV` is for runtime environment defaults. Do not bake secrets into either.
- Keep build context small and use a lockfile with `npm ci`.

## Ports and networking

```text
browser -- http://localhost:3000 --> host port 3000
                                      |
                                  Docker mapping
                                      |
                                 container :3000
```

- `-p 3000:3000` means host port 3000 forwards to container port 3000.
- In Compose, services on the default network reach one another by service name, e.g. `http://backend:3000` or `redis:6379`.
- Code running in a user's browser generally calls a host-published address such as `http://localhost:3000`, not the Compose-only hostname `backend`.
- A Vite dev server in a container must bind to `0.0.0.0`; its port must match the container side of the Compose mapping.
- `EXPOSE` alone does not open a host port. Publish only the ports that need host access.

## Volumes and bind mounts

```text
named volume: Docker-managed storage ----> /app/data
bind mount:   D:\project\data ---------> /app/data
```

- **Named volume:** `-v app-data:/app/data`; Docker manages its storage location. Good for persistent application data.
- **Bind mount:** `--mount type=bind,source=/host/path,target=/app/data`; maps a specific host path. Good for source-code development and direct host access.
- Both persist across container stop/removal when the mount itself is retained. A volume is deleted by `docker compose down -v` or explicit volume removal.
- Write to the mounted container path (e.g. `/app/data/file.txt`) to see the file on the host. Writing to `/app/file.txt` is outside that mount.
- Mounting over a non-empty image directory hides the image's existing contents at that path. Avoid mounting an empty folder over `/app` unless that is intended.
- On Windows Git Bash, path conversion can alter `-v` arguments. Prefer `--mount`, verify with `docker inspect`, and use `MSYS_NO_PATHCONV=1` when necessary.

## Compose workflow

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
  redis:
    image: redis:alpine
```

Compose builds images and creates a project network, then starts services. `depends_on` controls startup order, not application readiness; use health checks and dependency health conditions when readiness matters.

## Practical workflow

```text
edit -> build -> run -> inspect logs/health -> test -> push image -> deploy
```

1. Keep dependencies in a manifest and lockfile; exclude host `node_modules` from the build context.
2. Build with a clear tag; run with only required ports and configuration.
3. Use `docker compose logs`, `ps`, and `exec` to diagnose startup and connectivity.
4. Verify the app itself (for example, `curl http://localhost:3000/`), not just that a container exists.
5. Tag and push the exact image name/namespace that you later pull.

## Common failures

| Symptom                                   | Likely cause / check                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `ERR_MODULE_NOT_FOUND`                  | Dependency absent from the service's manifest or image; rebuild after fixing it              |
| Container exits                           | `docker compose ps -a` and `docker compose logs SERVICE`                                 |
| Browser cannot connect                    | Check process, bind address (`0.0.0.0` in container), host/container port mapping, and URL |
| Frontend loads but has no API data        | Frontend must make a request; check API URL, browser CORS, and API logs                      |
| Pull access denied                        | Check exact owner/repository/tag, spelling, visibility, and login                            |
| File absent on host                       | Confirm the write path is the mount target; inspect `Source` and `Destination`           |
| Data disappears                           | Data was in the container writable layer or the volume was removed                           |
| Compose service hostname fails in browser | `backend` resolves inside the Compose network, not on the host browser                     |

## Interview quick answers

**Image vs container?** An image is an immutable template; a container is an instance with an isolated process and writable layer.

**Container vs VM?** Containers share a kernel and isolate processes; VMs virtualize hardware and run separate guest kernels.

**How is a container isolated?** Namespaces isolate views of resources; cgroups account for and limit resources; capabilities and syscall/LSM policies restrict privilege.

**What happens on `docker run`?** Docker resolves/pulls the image if needed, creates the writable layer and requested mounts/network, configures isolation and limits, then starts the configured process.

**Why use volumes?** To persist and share data independently of a container's lifecycle.

**What is a multi-stage build?** Separate build and runtime stages so only required artifacts enter the final image, reducing size and attack surface.

**`CMD` vs `ENTRYPOINT`?** `ENTRYPOINT` sets the main executable; `CMD` supplies defaults and is commonly overridden by arguments to `docker run`.

**`EXPOSE` vs `-p`?** `EXPOSE` is image metadata/documentation; `-p` creates a host-to-container port mapping.

**Why is a container not ready just because it is running?** Its main process may be alive before the service is ready; use a health check and readiness-aware orchestration.

## Production checklist

- Use a small, maintained, pinned base image and reproducible dependency lockfiles.
- Use a non-root user; avoid `--privileged`; drop unneeded capabilities.
- Keep secrets out of the image, source control, and build arguments; inject them via a secret manager/runtime.
- Set CPU/memory limits, health checks, and restart policy appropriate to the platform.
- Keep Redis and internal services off public host ports unless required.
- Scan images, patch regularly, and log to stdout/stderr.
- Use a production frontend build/server rather than exposing the Vite development server.
