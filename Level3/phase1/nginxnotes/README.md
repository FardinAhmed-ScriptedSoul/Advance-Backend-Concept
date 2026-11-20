# Nginx: interview essentials

## Why use Nginx as a reverse proxy?

A reverse proxy receives client requests and forwards them to backend servers. It gives clients one stable entry point while keeping app instances behind it. It can also handle TLS, request routing, caching, compression, and traffic limits.

## Horizontal scaling

Horizontal scaling adds more app instances instead of making one machine larger. Nginx can distribute requests across them; its default upstream method is round-robin.

Scaling app servers does not automatically scale the database or share in-memory sessions. Shared state (such as Redis) may be needed when requests can reach different instances.

## Basic config shape

Nginx directives use `name value;`; blocks use braces. `http` contains web configuration, `upstream` names a backend pool, `server` listens for traffic, and `location` matches request paths.

```nginx
events {}

http {
    upstream backend {
        server server1:3000;
        server server2:3000;
        server server3:3000;
    }

    server {
        listen 80;

        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

In this project, Compose service names (`server1`, `server2`, `server3`) resolve on the shared Docker network. Nginx listens on container port 80; Compose publishes it on host port 8000.

## Interview summary

“Nginx is the public entry point and reverse proxy. It forwards requests to a pool of app instances, enabling load distribution and horizontal scaling without exposing each instance directly.”

Check a config with `nginx -t` before reloading Nginx.
