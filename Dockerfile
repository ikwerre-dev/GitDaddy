FROM golang:1.22-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
RUN go build -o /out/gitdaddy-backend ./cmd/backend && go build -o /out/gitdaddy-worker ./cmd/worker

FROM alpine:3.20
RUN apk add --no-cache git ca-certificates
COPY --from=build /out/gitdaddy-backend /usr/local/bin/gitdaddy-backend
COPY --from=build /out/gitdaddy-worker /usr/local/bin/gitdaddy-worker
