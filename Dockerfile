FROM golang:1.25-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN go build -o /out/gitdaddy-backend ./cmd/backend && go build -o /out/gitdaddy-worker ./cmd/worker

FROM alpine:3.20
RUN apk add --no-cache git git-daemon ca-certificates
COPY --from=build /out/gitdaddy-backend /usr/local/bin/gitdaddy-backend
COPY --from=build /out/gitdaddy-worker /usr/local/bin/gitdaddy-worker
